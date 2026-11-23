package com.musichub.backend.domain.extraction

import com.musichub.backend.domain.metadata.MetadataReader
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
import org.mockito.Mockito.mock
import java.util.*

class ExtractionServiceTest {

    private lateinit var extractionJobRepository: ExtractionJobRepository
    private lateinit var userRepository: UserRepository
    private lateinit var musicFileRepository: MusicFileRepository
    private lateinit var storageService: StorageService
    private lateinit var metadataReader: MetadataReader
    private lateinit var mediaExtractor: MediaExtractor
    private lateinit var extractionService: ExtractionService

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
}
