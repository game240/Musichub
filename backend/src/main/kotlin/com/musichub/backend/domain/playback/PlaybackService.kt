package com.musichub.backend.domain.playback

import com.musichub.backend.domain.music.MusicFileDto
import com.musichub.backend.domain.music.MusicFileRepository
import com.musichub.backend.domain.music.MusicFileStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class PlaybackService(
    private val playbackStateRepository: PlaybackStateRepository,
    private val musicFileRepository: MusicFileRepository
) {
    @Transactional(readOnly = true)
    fun getPlaybackState(userId: Long): PlaybackStateResponse {
        val state = playbackStateRepository.findById(userId).orElse(null)
            ?: return PlaybackStateResponse(
                currentTrack = null,
                queue = emptyList(),
                shuffledQueue = emptyList(),
                queueIndex = 0,
                isShuffle = false,
                repeatMode = "OFF",
                currentPositionMs = 0
            )

        val allTrackIds = buildSet {
            addAll(state.queueTrackIds)
            addAll(state.shuffledTrackIds)
            state.currentTrackId?.let { add(it) }
        }

        if (allTrackIds.isEmpty()) {
            return PlaybackStateResponse(
                currentTrack = null,
                queue = emptyList(),
                shuffledQueue = emptyList(),
                queueIndex = state.queueIndex,
                isShuffle = state.isShuffle,
                repeatMode = state.repeatMode,
                currentPositionMs = state.currentPositionMs
            )
        }

        val musicFiles = musicFileRepository.findAllByIdInAndUserIdAndStatus(
            ids = allTrackIds,
            userId = userId,
            status = MusicFileStatus.ACTIVE
        )
        val fileMap = musicFiles.associateBy { it.id }

        val queueDtos = state.queueTrackIds.mapNotNull { fileMap[it]?.let { file -> MusicFileDto.from(file) } }
        val shuffledQueueDtos = state.shuffledTrackIds.mapNotNull { fileMap[it]?.let { file -> MusicFileDto.from(file) } }
        val currentTrackDto = state.currentTrackId?.let { fileMap[it]?.let { file -> MusicFileDto.from(file) } }

        return PlaybackStateResponse(
            currentTrack = currentTrackDto,
            queue = queueDtos,
            shuffledQueue = shuffledQueueDtos,
            queueIndex = state.queueIndex,
            isShuffle = state.isShuffle,
            repeatMode = state.repeatMode,
            currentPositionMs = state.currentPositionMs
        )
    }

    @Transactional
    fun updatePlaybackState(userId: Long, request: UpdatePlaybackStateRequest): PlaybackState {
        val state = playbackStateRepository.findById(userId).orElseGet {
            PlaybackState(userId = userId)
        }

        state.currentTrackId = request.currentTrackId
        state.queueTrackIds = request.queueTrackIds
        state.shuffledTrackIds = request.shuffledTrackIds
        state.queueIndex = request.queueIndex
        state.isShuffle = request.isShuffle
        state.repeatMode = request.repeatMode
        state.currentPositionMs = request.currentPositionMs
        state.updatedAt = Instant.now()

        return playbackStateRepository.save(state)
    }
}
