package com.musichub.backend.domain.playback

import com.musichub.backend.domain.music.MusicFileDto
import com.musichub.backend.global.security.UserPrincipal
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

data class PlaybackStateResponse(
    val currentTrack: MusicFileDto?,
    val queue: List<MusicFileDto>,
    val shuffledQueue: List<MusicFileDto>,
    val queueIndex: Int,
    val isShuffle: Boolean,
    val repeatMode: String,
    val currentPositionMs: Long
)

data class UpdatePlaybackStateRequest(
    val currentTrackId: Long? = null,
    val queueTrackIds: List<Long> = emptyList(),
    val shuffledTrackIds: List<Long> = emptyList(),
    val queueIndex: Int = 0,
    val isShuffle: Boolean = false,
    val repeatMode: String = "OFF",
    val currentPositionMs: Long = 0
)

@RestController
@RequestMapping("/api/users/me/playback")
class PlaybackController(
    private val playbackService: PlaybackService
) {
    @GetMapping
    fun getPlaybackState(
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<PlaybackStateResponse> {
        val state = playbackService.getPlaybackState(principal.id)
        return ResponseEntity.ok(state)
    }

    @PutMapping
    fun updatePlaybackState(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestBody request: UpdatePlaybackStateRequest
    ): ResponseEntity<Void> {
        playbackService.updatePlaybackState(principal.id, request)
        return ResponseEntity.ok().build()
    }
}
