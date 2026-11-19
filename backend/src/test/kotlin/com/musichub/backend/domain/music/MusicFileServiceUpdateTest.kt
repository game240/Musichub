package com.musichub.backend.domain.music

import com.musichub.backend.domain.metadata.MetadataReader
import com.musichub.backend.domain.metadata.MetadataWriter
import com.musichub.backend.domain.storage.StorageService
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.verify
import org.mockito.Mockito
import org.mockito.Mockito.mock
import java.io.ByteArrayInputStream
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.util.*

class MusicFileServiceUpdateTest {

    private lateinit var musicFileRepository: MusicFileRepository
    private lateinit var userRepository: UserRepository
    private lateinit var storageService: StorageService
    private lateinit var metadataReader: MetadataReader
    private lateinit var metadataWriter: MetadataWriter
    private lateinit var musicFileService: MusicFileService

    private fun <T> eqNonNull(value: T): T {
        Mockito.eq(value)
        return value
    }

    private fun anyFile(): File {
        Mockito.any(File::class.java)
        return File("dummy")
    }

    private fun anyInputStream(): InputStream {
        Mockito.any(InputStream::class.java)
        return ByteArrayInputStream(ByteArray(0))
    }

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
    fun `updateMetadata updates database entity immediately and marks tagSyncStatus as SYNCING`() {
        val user = User(id = 1L, providerId = "test", email = "test@test.com")
        val musicFile = MusicFile(
            id = 100L,
            user = user,
            storageKey = "users/1/audio/track.mp3",
            fileName = "track.mp3",
            fileSize = 1024L,
            title = "Old Title",
            artist = "Old Artist",
            tagSyncStatus = TagSyncStatus.SYNCED
        )

        given(musicFileRepository.findByIdAndUserId(100L, 1L)).willReturn(Optional.of(musicFile))
        given(musicFileRepository.findById(100L)).willReturn(Optional.of(musicFile))
        given(storageService.getObject("users/1/audio/track.mp3"))
            .willReturn(ByteArrayInputStream("dummy audio content".toByteArray()))

        val request = UpdateMusicMetadataRequest(
            title = "New Title",
            artist = "New Artist",
            album = "New Album",
            year = 2024,
            genre = "Rock",
            trackNumber = 3,
            lyrics = "New Lyrics"
        )

        val result = musicFileService.updateMetadata(1L, 100L, request)

        assertEquals("New Title", result.title)
        assertEquals("New Artist", result.artist)
        assertEquals("New Album", result.album)
        assertEquals(2024, result.year)
        assertEquals("Rock", result.genre)
        assertEquals(3, result.trackNumber)
        assertEquals("New Lyrics", result.lyrics)
        assertEquals(TagSyncStatus.SYNCING, result.tagSyncStatus)
    }

    @Test
    fun `rewriteR2Tags downloads from R2 rewrites tags and marks tagSyncStatus as SYNCED`() {
        val user = User(id = 1L, providerId = "test", email = "test@test.com")
        val musicFile = MusicFile(
            id = 100L,
            user = user,
            storageKey = "users/1/audio/track.mp3",
            fileName = "track.mp3",
            fileSize = 1024L,
            title = "Old Title",
            artist = "Old Artist",
            tagSyncStatus = TagSyncStatus.SYNCING
        )

        given(musicFileRepository.findById(100L)).willReturn(Optional.of(musicFile))
        given(storageService.getObject("users/1/audio/track.mp3"))
            .willReturn(ByteArrayInputStream("dummy audio content".toByteArray()))

        val request = UpdateMusicMetadataRequest(
            title = "New Title",
            artist = "New Artist",
            album = "New Album",
            year = 2024,
            genre = "Rock",
            trackNumber = 3,
            lyrics = "New Lyrics"
        )

        musicFileService.rewriteR2Tags(100L, request)

        assertEquals(TagSyncStatus.SYNCED, musicFile.tagSyncStatus)
        verify(metadataWriter).updateTags(
            file = anyFile(),
            title = eqNonNull("New Title"),
            artist = eqNonNull("New Artist"),
            album = eqNonNull("New Album"),
            year = eqNonNull(2024),
            genre = eqNonNull("Rock"),
            trackNumber = eqNonNull(3),
            lyrics = eqNonNull("New Lyrics")
        )

        verify(storageService).upload(
            key = eqNonNull("users/1/audio/track.mp3"),
            inputStream = anyInputStream(),
            contentLength = Mockito.anyLong(),
            mimeType = eqNonNull("audio/mpeg")
        )
    }

    @Test
    fun `rewriteR2Tags marks tagSyncStatus as FAILED when exception occurs`() {
        val user = User(id = 1L, providerId = "test", email = "test@test.com")
        val musicFile = MusicFile(
            id = 100L,
            user = user,
            storageKey = "users/1/audio/track.mp3",
            fileName = "track.mp3",
            fileSize = 1024L,
            title = "Old Title",
            artist = "Old Artist",
            tagSyncStatus = TagSyncStatus.SYNCING
        )

        given(musicFileRepository.findById(100L)).willReturn(Optional.of(musicFile))
        given(storageService.getObject("users/1/audio/track.mp3"))
            .willThrow(RuntimeException("R2 connection timeout"))

        val request = UpdateMusicMetadataRequest(title = "New Title")

        musicFileService.rewriteR2Tags(100L, request)

        assertEquals(TagSyncStatus.FAILED, musicFile.tagSyncStatus)
        verify(musicFileRepository).save(musicFile)
    }

    @Test
    fun `getSyncStatus returns current tagSyncStatus`() {
        val user = User(id = 1L, providerId = "test", email = "test@test.com")
        val musicFile = MusicFile(
            id = 100L,
            user = user,
            storageKey = "users/1/audio/track.mp3",
            fileName = "track.mp3",
            fileSize = 1024L,
            tagSyncStatus = TagSyncStatus.SYNCING
        )

        given(musicFileRepository.findByIdAndUserId(100L, 1L)).willReturn(Optional.of(musicFile))

        val status = musicFileService.getSyncStatus(1L, 100L)
        assertEquals(TagSyncStatus.SYNCING, status)
    }

    @Test
    fun `updateMetadata throws NoSuchElementException when track is not found or not owned`() {
        given(musicFileRepository.findByIdAndUserId(999L, 1L)).willReturn(Optional.empty())

        val request = UpdateMusicMetadataRequest(title = "New Title")

        assertThrows<NoSuchElementException> {
            musicFileService.updateMetadata(1L, 999L, request)
        }
    }
}
