package com.musichub.backend.domain.music

import com.musichub.backend.domain.metadata.MetadataReader
import com.musichub.backend.domain.metadata.MetadataWriter
import com.musichub.backend.domain.storage.StorageService
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.util.zip.ZipInputStream

class MusicFileBatchDownloadTest {

    private lateinit var musicFileRepository: MusicFileRepository
    private lateinit var userRepository: UserRepository
    private lateinit var storageService: StorageService
    private lateinit var metadataReader: MetadataReader
    private lateinit var metadataWriter: MetadataWriter
    private lateinit var batchDownloadTicketManager: BatchDownloadTicketManager
    private lateinit var musicFileService: MusicFileService

    private val testUser = User(
        id = 1L,
        providerId = "test-provider-id",
        email = "test@example.com",
        displayName = "Test User"
    )

    @BeforeEach
    fun setUp() {
        musicFileRepository = mock(MusicFileRepository::class.java)
        userRepository = mock(UserRepository::class.java)
        storageService = mock(StorageService::class.java)
        metadataReader = mock(MetadataReader::class.java)
        metadataWriter = mock(MetadataWriter::class.java)
        batchDownloadTicketManager = BatchDownloadTicketManager()

        musicFileService = MusicFileService(
            musicFileRepository = musicFileRepository,
            userRepository = userRepository,
            storageService = storageService,
            metadataReader = metadataReader,
            metadataWriter = metadataWriter,
            batchDownloadTicketManager = batchDownloadTicketManager,
            systemMaxBytes = 10_000_000_000L,
            perUserMaxBytes = 2_000_000_000L
        )
    }

    @Test
    @DisplayName("빈 ID 목록으로 일괄 다운로드 티켓 요청 시 IllegalArgumentException 발생")
    fun `createBatchDownloadTicket throws IllegalArgumentException when ids empty`() {
        assertThrows<IllegalArgumentException> {
            musicFileService.createBatchDownloadTicket(userId = 1L, musicFileIds = emptyList())
        }
    }

    @Test
    @DisplayName("소유하지 않거나 ACTIVE 상태가 아닌 음원 ID만 있는 경우 NoSuchElementException 발생")
    fun `createBatchDownloadTicket throws NoSuchElementException when no valid tracks found`() {
        `when`(musicFileRepository.findAllByIdInAndUserIdAndStatus(listOf(99L), 1L, MusicFileStatus.ACTIVE))
            .thenReturn(emptyList())

        assertThrows<NoSuchElementException> {
            musicFileService.createBatchDownloadTicket(userId = 1L, musicFileIds = listOf(99L))
        }
    }

    @Test
    @DisplayName("유효한 음원 ID로 요청 시 티켓과 다운로드 URL 및 총 크기를 반환한다")
    fun `createBatchDownloadTicket returns ticket and download url with correct metadata`() {
        val track1 = MusicFile(
            id = 10L,
            user = testUser,
            storageKey = "users/1/audio/t1.mp3",
            fileName = "Track1.mp3",
            fileSize = 5_000_000L,
            status = MusicFileStatus.ACTIVE
        )
        val track2 = MusicFile(
            id = 20L,
            user = testUser,
            storageKey = "users/1/audio/t2.mp3",
            fileName = "Track2.mp3",
            fileSize = 7_000_000L,
            status = MusicFileStatus.ACTIVE
        )

        `when`(musicFileRepository.findAllByIdInAndUserIdAndStatus(listOf(10L, 20L), 1L, MusicFileStatus.ACTIVE))
            .thenReturn(listOf(track1, track2))

        val result = musicFileService.createBatchDownloadTicket(userId = 1L, musicFileIds = listOf(10L, 20L))

        assertNotNull(result.ticket)
        assertTrue(result.downloadUrl.contains("/api/music-files/batch-download?ticket="))
        assertEquals(2, result.totalCount)
        assertEquals(12_000_000L, result.totalBytes)

        val ticket = batchDownloadTicketManager.getTicket(result.ticket)
        assertNotNull(ticket)
        assertEquals(listOf(10L, 20L), ticket!!.musicFileIds)
    }

    @Test
    @DisplayName("ZIP 내부 파일명 중복 시 (1), (2) 형태로 고유 번호를 붙이고 경로 구분자를 정제한다")
    fun `getUniqueZipEntryName handles duplicates and sanitizes path traversal`() {
        val usedNames = mutableSetOf<String>()

        val name1 = musicFileService.getUniqueZipEntryName("Song.mp3", usedNames)
        assertEquals("Song.mp3", name1)

        val name2 = musicFileService.getUniqueZipEntryName("Song.mp3", usedNames)
        assertEquals("Song (1).mp3", name2)

        val name3 = musicFileService.getUniqueZipEntryName("Song.mp3", usedNames)
        assertEquals("Song (2).mp3", name3)

        // Path traversal slash sanitization
        val name4 = musicFileService.getUniqueZipEntryName("../sub/folder\\my_song.mp3", usedNames)
        assertEquals(".._sub_folder_my_song.mp3", name4)
    }

    @Test
    @DisplayName("streamBatchDownloadWithTicket 실행 시 유효한 ZIP 스트림을 생성하고 파일 데이터를 올바르게 압축한다")
    fun `streamBatchDownloadWithTicket streams valid zip archive with track contents`() {
        val track1 = MusicFile(
            id = 10L,
            user = testUser,
            storageKey = "users/1/audio/track1.mp3",
            fileName = "Track1.mp3",
            fileSize = 4L,
            status = MusicFileStatus.ACTIVE
        )
        val track2 = MusicFile(
            id = 20L,
            user = testUser,
            storageKey = "users/1/audio/track2.mp3",
            fileName = "Track1.mp3", // Duplicate name
            fileSize = 4L,
            status = MusicFileStatus.ACTIVE
        )

        `when`(musicFileRepository.findAllByIdInAndUserIdAndStatus(listOf(10L, 20L), 1L, MusicFileStatus.ACTIVE))
            .thenReturn(listOf(track1, track2))

        `when`(storageService.getObject("users/1/audio/track1.mp3"))
            .thenReturn(ByteArrayInputStream("DATA1".toByteArray(Charsets.UTF_8)))
        `when`(storageService.getObject("users/1/audio/track2.mp3"))
            .thenReturn(ByteArrayInputStream("DATA2".toByteArray(Charsets.UTF_8)))

        val ticket = BatchDownloadTicket(
            ticketId = "ticket123",
            userId = 1L,
            musicFileIds = listOf(10L, 20L),
            zipFilename = "MusicHub_test.zip"
        )

        val out = ByteArrayOutputStream()
        musicFileService.streamBatchDownloadWithTicket(ticket, out)

        val zipBytes = out.toByteArray()
        assertTrue(zipBytes.isNotEmpty())

        // Read and verify zip structure
        val zipIn = ZipInputStream(ByteArrayInputStream(zipBytes))
        val entry1 = zipIn.nextEntry
        assertNotNull(entry1)
        assertEquals("Track1.mp3", entry1!!.name)
        val data1 = zipIn.readBytes().toString(Charsets.UTF_8)
        assertEquals("DATA1", data1)

        val entry2 = zipIn.nextEntry
        assertNotNull(entry2)
        assertEquals("Track1 (1).mp3", entry2!!.name)
        val data2 = zipIn.readBytes().toString(Charsets.UTF_8)
        assertEquals("DATA2", data2)

        assertNull(zipIn.nextEntry)
    }
}
