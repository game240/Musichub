package com.musichub.backend.domain.playback

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant

@Entity
@Table(name = "user_playback_state")
class PlaybackState(
    @Id
    @Column(name = "user_id")
    val userId: Long,

    @Column(name = "current_track_id")
    var currentTrackId: Long? = null,

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "queue_track_ids", columnDefinition = "bigint[]")
    var queueTrackIds: List<Long> = emptyList(),

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "shuffled_track_ids", columnDefinition = "bigint[]")
    var shuffledTrackIds: List<Long> = emptyList(),

    @Column(name = "queue_index", nullable = false)
    var queueIndex: Int = 0,

    @Column(name = "is_shuffle", nullable = false)
    var isShuffle: Boolean = false,

    @Column(name = "repeat_mode", nullable = false)
    var repeatMode: String = "OFF",

    @Column(name = "current_position_ms", nullable = false)
    var currentPositionMs: Long = 0,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
