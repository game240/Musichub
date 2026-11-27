package com.musichub.backend.domain.extraction

import com.musichub.backend.domain.metadata.AudioMetadata
import com.musichub.backend.domain.metadata.MetadataReader
import com.musichub.backend.domain.music.MusicFile
import com.musichub.backend.domain.music.MusicFileRepository
import com.musichub.backend.domain.storage.StorageService
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRepository
import com.musichub.backend.domain.user.UserRole
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.Mockito
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import java.io.File
import java.time.Instant
import java.util.*

class ExtractionServiceTest {

    private lateinit var extractionJobRepository: ExtractionJobRepository
    private lateinit var userRepository: UserRepository
    private lateinit var musicFileRepository: MusicFileRepository
    private lateinit var storageService: StorageService
    private lateinit var metadataReader: MetadataReader
    private lateinit var mediaExtractor: MediaExtractor
    private lateinit var extractionService: ExtractionService

    private fun <T> eqNonNull(value: T): T {
        Mockito.eq(value)
        return value
    }

    private fun anyString(): String {
        Mockito.anyString()
        return ""
    }

    private fun anyFile(): File {
        Mockito.any(File::class.java)
        return File("dummy")
    }

    private fun anyInstant(): Instant {
        Mockito.any(Instant::class.java)
        return Instant.now()
    }

    @Suppress("UNCHECKED_CAST")
    private fun anyProcessCallback(): ((Process) -> Unit)? {
        Mockito.nullable(Any::class.java)
        return null
    }

    private val testUser = User(
        id = 1L,
        providerId = "test-provider",
        email = "downloader@test.com",
        displayName = "Downloader User",
        role = UserRole.DOWNLOADER,
        storageUsedBytes = 100_000_000L // 100 MB used
    )

    @BeforeEach
    fun setUp() {
        extractionJobRepository = mock(ExtractionJobRepository::class.java)
        userRepository = mock(UserRepository::class.java)
        musicFileRepository = mock(MusicFileRepository::class.java)
        storageService = mock(StorageService::class.java)
        metadataReader = mock(MetadataReader::class.java)
        mediaExtractor = mock(MediaExtractor::class.java)

        given(extractionJobRepository.findStatusById(Mockito.anyLong())).willReturn(Optional.empty())

        extractionService = ExtractionService(
            extractionJobRepository = extractionJobRepository,
            userRepository = userRepository,
            musicFileRepository = musicFileRepository,
            storageService = storageService,
            metadataReader = metadataReader,
            mediaExtractor = mediaExtractor
        )
    }

    @Test
    @DisplayName("정상 용량 범위 내에서 추출 작업 생성 성공")
    fun `createJob creates job successfully when quota is sufficient`() {
        given(userRepository.findById(1L)).willReturn(Optional.of(testUser))
        given(extractionJobRepository.save(any(ExtractionJob::class.java))).willAnswer { invocation ->
            invocation.getArgument(0)
        }

        val job = extractionService.createJob(1L, "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        assertNotNull(job)
        assertEquals("https://www.youtube.com/watch?v=dQw4w9WgXcQ", job.sourceUrl)
        assertEquals(ExtractionJobStatus.PENDING, job.status)
        assertEquals(testUser, job.user)
    }

    @Test
    @DisplayName("사용자 저장 용량 한도(2GB) 초과 시 작업 생성 차단")
    fun `createJob throws IllegalStateException when storage quota exceeded`() {
        val fullUser = User(
            id = 2L,
            providerId = "full-provider",
            email = "full@test.com",
            storageUsedBytes = 2L * 1024 * 1024 * 1024 // 2.0 GB used
        )
        given(userRepository.findById(2L)).willReturn(Optional.of(fullUser))

        val ex = assertThrows<IllegalStateException> {
            extractionService.createJob(2L, "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        }
        assertTrue(ex.message!!.contains("용량이 부족합니다"))
    }

    @Test
    @DisplayName("진행 중인 작업 취소 요청 시 CANCELLED 상태로 정상 변경")
    fun `cancelJob cancels running or pending job successfully`() {
        val job = ExtractionJob(id = 10L, user = testUser, sourceUrl = "https://youtube.com/watch?v=123", status = ExtractionJobStatus.DOWNLOADING)
        given(extractionJobRepository.findByIdAndUserId(10L, 1L)).willReturn(Optional.of(job))
        given(extractionJobRepository.save(any(ExtractionJob::class.java))).willAnswer { invocation -> invocation.getArgument(0) }

        val cancelledJob = extractionService.cancelJob(1L, 10L)

        assertEquals(ExtractionJobStatus.CANCELLED, cancelledJob.status)
        assertTrue(cancelledJob.errorMessage!!.contains("취소"))
    }

    @Test
    @DisplayName("이미 완료되었거나 취소된 작업은 다시 취소할 수 없다")
    fun `cancelJob throws IllegalStateException when job already finished`() {
        val job = ExtractionJob(id = 10L, user = testUser, sourceUrl = "https://youtube.com/watch?v=123", status = ExtractionJobStatus.COMPLETED)
        given(extractionJobRepository.findByIdAndUserId(10L, 1L)).willReturn(Optional.of(job))

        assertThrows<IllegalStateException> {
            extractionService.cancelJob(1L, 10L)
        }
    }

    @Test
    @DisplayName("종료된 작업(COMPLETED) 삭제 요청 시 정상 삭제")
    fun `deleteJob deletes completed job successfully`() {
        val job = ExtractionJob(id = 20L, user = testUser, sourceUrl = "https://youtube.com/watch?v=123", status = ExtractionJobStatus.COMPLETED)
        given(extractionJobRepository.findByIdAndUserId(20L, 1L)).willReturn(Optional.of(job))

        extractionService.deleteJob(1L, 20L)

        verify(extractionJobRepository).delete(job)
    }

    @Test
    @DisplayName("진행 중인 작업(DOWNLOADING)은 삭제할 수 없다")
    fun `deleteJob throws IllegalStateException when job is in progress`() {
        val job = ExtractionJob(id = 20L, user = testUser, sourceUrl = "https://youtube.com/watch?v=123", status = ExtractionJobStatus.DOWNLOADING)
        given(extractionJobRepository.findByIdAndUserId(20L, 1L)).willReturn(Optional.of(job))

        val ex = assertThrows<IllegalStateException> {
            extractionService.deleteJob(1L, 20L)
        }
        assertTrue(ex.message!!.contains("진행 중인 작업은 삭제할 수 없습니다"))
    }

    @Test
    @DisplayName("종료된 모든 작업 일괄 삭제 시 repository 호출 및 삭제 건수 반환")
    fun `clearFinishedJobs calls repository and returns deleted count`() {
        val finishedStatuses = listOf(
            ExtractionJobStatus.COMPLETED,
            ExtractionJobStatus.FAILED,
            ExtractionJobStatus.CANCELLED
        )
        given(extractionJobRepository.deleteByUserIdAndStatusIn(1L, finishedStatuses)).willReturn(5)

        val deletedCount = extractionService.clearFinishedJobs(1L)

        assertEquals(5, deletedCount)
        verify(extractionJobRepository).deleteByUserIdAndStatusIn(1L, finishedStatuses)
    }

    @Test
    @DisplayName("작업이 시작 전 취소된 경우 미디어 추출 프로세스를 시작하지 않고 즉시 종료")
    fun `processJobAsync aborts before execution when job is already cancelled`() {
        val job = ExtractionJob(id = 30L, user = testUser, sourceUrl = "https://youtube.com/watch?v=123", status = ExtractionJobStatus.CANCELLED)
        given(extractionJobRepository.findById(30L)).willReturn(Optional.of(job))
        given(extractionJobRepository.findStatusById(30L)).willReturn(Optional.of(ExtractionJobStatus.CANCELLED))

        extractionService.processJobAsync(30L)

        verify(mediaExtractor, never()).extractAudio(anyString(), anyFile(), anyProcessCallback())
    }

    @Test
    @DisplayName("추출 완료 저장 시점에 작업이 이미 취소되어 있으면 MusicFile을 롤백하고 COMPLETED로 덮어쓰지 않는다")
    fun `processJobAsync rolls back and leaves job cancelled when updateCompletedIfActive returns 0`() {
        val job = ExtractionJob(id = 40L, user = testUser, sourceUrl = "https://youtube.com/watch?v=123", status = ExtractionJobStatus.DOWNLOADING)
        given(extractionJobRepository.findById(40L)).willReturn(Optional.of(job))
        given(extractionJobRepository.findStatusById(40L)).willReturn(Optional.of(ExtractionJobStatus.DOWNLOADING))

        val dummyAudioFile = File.createTempFile("test-audio", ".mp3").apply {
            writeBytes(ByteArray(1024))
            deleteOnExit()
        }
        val mediaResult = ExtractedMediaResult(dummyAudioFile, "Test Title")
        given(mediaExtractor.extractAudio(eqNonNull(job.sourceUrl), anyFile(), anyProcessCallback())).willReturn(mediaResult)

        given(extractionJobRepository.updateStatusIfActive(eqNonNull(40L), eqNonNull(ExtractionJobStatus.CONVERTING), anyInstant())).willReturn(1)
        val dummyMetadata = AudioMetadata(
            title = "Test Title",
            artist = "Test Artist",
            album = null,
            year = null,
            genre = null,
            trackNumber = null,
            durationMs = 180000L,
            lyrics = null,
            artwork = null,
            artworkMimeType = null,
            tagVersion = "ID3v2.3"
        )
        given(metadataReader.read(anyFile())).willReturn(dummyMetadata)
        given(extractionJobRepository.updateStatusIfActive(eqNonNull(40L), eqNonNull(ExtractionJobStatus.UPLOADING), anyInstant())).willReturn(1)

        val savedMusicFile = MusicFile(
            id = 500L,
            user = testUser,
            storageKey = "users/1/audio/dummy.mp3",
            fileName = "Test Title.mp3",
            fileSize = 1024L,
            title = "Test Title"
        )
        given(musicFileRepository.save(any(MusicFile::class.java))).willReturn(savedMusicFile)

        // 완료 시점에 취소되어 업데이트 행 수가 0인 상황 시뮬레이션
        given(extractionJobRepository.updateCompletedIfActive(eqNonNull(40L), eqNonNull(savedMusicFile), anyInstant())).willReturn(0)

        extractionService.processJobAsync(40L)

        // 저장된 musicFile이 롤백(삭제)되어야 하고 R2 오디오도 삭제되어야 함
        verify(musicFileRepository).delete(savedMusicFile)
        verify(storageService).delete(anyString())
    }
}
