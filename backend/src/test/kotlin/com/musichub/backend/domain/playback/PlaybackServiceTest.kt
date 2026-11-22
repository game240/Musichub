package com.musichub.backend.domain.playback

import com.musichub.backend.domain.music.MusicFile
import com.musichub.backend.domain.music.MusicFileRepository
import com.musichub.backend.domain.music.MusicFileStatus
import com.musichub.backend.domain.storage.StorageService
import com.musichub.backend.domain.user.User
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import java.util.Optional

class PlaybackServiceTest {

    private lateinit var playbackStateRepository: PlaybackStateRepository
    private lateinit var musicFileRepository: MusicFileRepository
    private lateinit var storageService: StorageService
    private lateinit var playbackService: PlaybackService

    @BeforeEach
    fun setUp() {
        playbackStateRepository = mock(PlaybackStateRepository::class.java)
        musicFileRepository = mock(MusicFileRepository::class.java)
        storageService = mock(StorageService::class.java)
        playbackService = PlaybackService(playbackStateRepository, musicFileRepository, storageService)
    }

    @Test
    fun `getPlaybackState returns default state when none exists`() {
        given(playbackStateRepository.findById(1L)).willReturn(Optional.empty())

        val result = playbackService.getPlaybackState(1L)

        assertNull(result.currentTrack)
        assertTrue(result.queue.isEmpty())
        assertTrue(result.shuffledQueue.isEmpty())
        assertEquals(0, result.queueIndex)
        assertFalse(result.isShuffle)
        assertEquals("OFF", result.repeatMode)
        assertEquals(0, result.currentPositionMs)
    }

    @Test
    fun `getPlaybackState maps active tracks in correct order and filters missing ones`() {
        val user = User(id = 1L, providerId = "test", email = "test@example.com")
        val track1 = MusicFile(
            id = 10L,
            user = user,
            storageKey = "k1",
            fileName = "song1.mp3",
            fileSize = 1000L,
            title = "Song 1"
        )
        val track2 = MusicFile(
            id = 20L,
            user = user,
            storageKey = "k2",
            fileName = "song2.mp3",
            fileSize = 2000L,
            title = "Song 2"
        )

        val state = PlaybackState(
            userId = 1L,
            currentTrackId = 10L,
            queueTrackIds = listOf(10L, 999L, 20L), // 999L is missing/deleted
            shuffledTrackIds = listOf(20L, 10L),
            queueIndex = 0,
            isShuffle = true,
            repeatMode = "ALL",
            currentPositionMs = 12000L
        )

        given(playbackStateRepository.findById(1L)).willReturn(Optional.of(state))
        given(
            musicFileRepository.findAllByIdInAndUserIdAndStatus(
                ids = setOf(10L, 999L, 20L),
                userId = 1L,
                status = MusicFileStatus.ACTIVE
            )
        ).willReturn(listOf(track1, track2))

        val result = playbackService.getPlaybackState(1L)

        assertNotNull(result.currentTrack)
        assertEquals(10L, result.currentTrack?.id)
        assertEquals(2, result.queue.size)
        assertEquals(10L, result.queue[0].id)
        assertEquals(20L, result.queue[1].id) // 999L filtered out
        assertEquals(2, result.shuffledQueue.size)
        assertEquals(20L, result.shuffledQueue[0].id)
        assertEquals(10L, result.shuffledQueue[1].id)
        assertTrue(result.isShuffle)
        assertEquals("ALL", result.repeatMode)
        assertEquals(12000L, result.currentPositionMs)
    }

    @Test
    fun `updatePlaybackState updates existing record and persists`() {
        val existing = PlaybackState(
            userId = 1L,
            currentTrackId = null,
            queueTrackIds = emptyList(),
            shuffledTrackIds = emptyList()
        )
        given(playbackStateRepository.findById(1L)).willReturn(Optional.of(existing))
        given(playbackStateRepository.save(any(PlaybackState::class.java))).willAnswer { it.arguments[0] as PlaybackState }

        val request = UpdatePlaybackStateRequest(
            currentTrackId = 55L,
            queueTrackIds = listOf(55L, 60L),
            shuffledTrackIds = listOf(60L, 55L),
            queueIndex = 1,
            isShuffle = true,
            repeatMode = "ONE",
            currentPositionMs = 45000L
        )

        playbackService.updatePlaybackState(1L, request)

        val captor = ArgumentCaptor.forClass(PlaybackState::class.java)
        verify(playbackStateRepository).save(captor.capture())

        val saved = captor.value
        assertEquals(1L, saved.userId)
        assertEquals(55L, saved.currentTrackId)
        assertEquals(listOf(55L, 60L), saved.queueTrackIds)
        assertEquals(listOf(60L, 55L), saved.shuffledTrackIds)
        assertEquals(1, saved.queueIndex)
        assertTrue(saved.isShuffle)
        assertEquals("ONE", saved.repeatMode)
        assertEquals(45000L, saved.currentPositionMs)
    }
}
