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
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock
import java.time.Duration
import java.util.*

class MusicFileDownloadTest {

    private lateinit var musicFileRepository: MusicFileRepository
    private lateinit var userRepository: UserRepository
    private lateinit var storageService: StorageService
    private lateinit var metadataReader: MetadataReader
    private lateinit var metadataWriter: MetadataWriter
    private lateinit var musicFileService: MusicFileService

    private val testUser = User(
        id = 1L,
        providerId = "google-12345",
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

        musicFileService = MusicFileService(
            musicFileRepository = musicFileRepository,
            userRepository = userRepository,
            storageService = storageService,
            metadataReader = metadataReader,
            metadataWriter = metadataWriter,
            systemMaxBytes = 10_000_000_000L,
            perUserMaxBytes = 2_000_000_000L
        )
    }

    @Test
    @DisplayName("기본 원본 fileName이 최우선으로 다운로드 파일명에 반영된다")
    fun `resolveDownloadFilename prioritizes original fileName`() {
        val musicFile = MusicFile(
            id = 10L,
            user = testUser,
            storageKey = "users/1/audio/uuid-1.mp3",
            fileName = "My_Custom_Track_v1.mp3",
            mimeType = "audio/mpeg",
            fileSize = 5_000_000L,
            title = "Overridden Title",
            artist = "Overridden Artist"
        )

        val resolved = musicFileService.resolveDownloadFilename(musicFile)
        assertEquals("My_Custom_Track_v1.mp3", resolved)
    }

    @Test
    @DisplayName("파일명에 OS 예약 특수문자가 포함된 경우 언더스코어로 치환된다")
    fun `resolveDownloadFilename sanitizes illegal filesystem characters`() {
        val musicFile = MusicFile(
            id = 11L,
            user = testUser,
            storageKey = "users/1/audio/uuid-2.mp3",
            fileName = "AC/DC: Live? *Track* <1> | \"Remix\".mp3",
            mimeType = "audio/mpeg",
            fileSize = 4_000_000L
        )

        val resolved = musicFileService.resolveDownloadFilename(musicFile)
        assertEquals("AC_DC_ Live_ _Track_ _1_ _ _Remix_.mp3", resolved)
    }

    @Test
    @DisplayName("원본 fileName이 공백일 경우 메타데이터(아티스트 - 제목)로 폴백된다")
    fun `resolveDownloadFilename falls back to metadata when fileName is blank`() {
        val musicFile = MusicFile(
            id = 12L,
            user = testUser,
            storageKey = "users/1/audio/uuid-3.mp3",
            fileName = "   ",
            mimeType = "audio/mpeg",
            fileSize = 4_000_000L,
            artist = "아이유",
            title = "밤편지"
        )

        val resolved = musicFileService.resolveDownloadFilename(musicFile)
        assertEquals("아이유 - 밤편지.mp3", resolved)
    }

    @Test
    @DisplayName("getDownloadUrl 호출 시 유효한 Presigned 다운로드 URL과 파일 정보를 반환한다")
    fun `getDownloadUrl returns presigned url and file info for owner`() {
        val musicFile = MusicFile(
            id = 100L,
            user = testUser,
            storageKey = "users/1/audio/audio-100.mp3",
            fileName = "IU - Through the Night.mp3",
            mimeType = "audio/mpeg",
            fileSize = 8_500_000L,
            status = MusicFileStatus.ACTIVE
        )

        given(musicFileRepository.findByIdAndUserId(100L, 1L))
            .willReturn(Optional.of(musicFile))

        val mockPresignedUrl = "https://r2.musichub.com/users/1/audio/audio-100.mp3?response-content-disposition=..."
        given(
            storageService.generatePresignedDownloadUrl(
                key = "users/1/audio/audio-100.mp3",
                downloadFilename = "IU - Through the Night.mp3",
                duration = Duration.ofMinutes(15)
            )
        ).willReturn(mockPresignedUrl)

        val result = musicFileService.getDownloadUrl(userId = 1L, musicFileId = 100L)

        assertNotNull(result)
        assertEquals(mockPresignedUrl, result.downloadUrl)
        assertEquals("IU - Through the Night.mp3", result.fileName)
        assertEquals(8_500_000L, result.fileSize)
    }

    @Test
    @DisplayName("타인의 음원 파일 다운로드 요청 시 NoSuchElementException이 발생한다")
    fun `getDownloadUrl throws exception when file belongs to another user`() {
        given(musicFileRepository.findByIdAndUserId(200L, 1L))
            .willReturn(Optional.empty())

        assertThrows<NoSuchElementException> {
            musicFileService.getDownloadUrl(userId = 1L, musicFileId = 200L)
        }
    }

    @Test
    @DisplayName("삭제(DELETED) 상태의 음원 파일 다운로드 요청 시 NoSuchElementException이 발생한다")
    fun `getDownloadUrl throws exception when file status is DELETED`() {
        val deletedFile = MusicFile(
            id = 300L,
            user = testUser,
            storageKey = "users/1/audio/audio-300.mp3",
            fileName = "deleted.mp3",
            mimeType = "audio/mpeg",
            fileSize = 1_000_000L,
            status = MusicFileStatus.DELETED
        )

        given(musicFileRepository.findByIdAndUserId(300L, 1L))
            .willReturn(Optional.of(deletedFile))

        assertThrows<NoSuchElementException> {
            musicFileService.getDownloadUrl(userId = 1L, musicFileId = 300L)
        }
    }
}
