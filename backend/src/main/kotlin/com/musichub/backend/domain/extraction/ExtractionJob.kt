package com.musichub.backend.domain.extraction

import com.musichub.backend.domain.music.MusicFile
import com.musichub.backend.domain.user.User
import jakarta.persistence.*
import java.time.Instant

enum class ExtractionJobStatus {
    PENDING,
    DOWNLOADING,
    CONVERTING,
    UPLOADING,
    COMPLETED,
    FAILED
}

@Entity
@Table(name = "extraction_job")
class ExtractionJob(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(name = "source_url", nullable = false, columnDefinition = "TEXT")
    val sourceUrl: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: ExtractionJobStatus = ExtractionJobStatus.PENDING,

    @Column(nullable = false)
    var attempts: Int = 0,

    @Column(name = "max_attempts", nullable = false)
    val maxAttempts: Int = 3,

    @Column(name = "error_message", columnDefinition = "TEXT")
    var errorMessage: String? = null,

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "music_file_id")
    var musicFile: MusicFile? = null,

    @Column(name = "scheduled_at")
    var scheduledAt: Instant? = null,

    @Column(name = "started_at")
    var startedAt: Instant? = null,

    @Column(name = "completed_at")
    var completedAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun markStarted() {
        this.status = ExtractionJobStatus.DOWNLOADING
        this.startedAt = Instant.now()
        this.attempts += 1
        this.updatedAt = Instant.now()
    }

    fun markCompleted(musicFile: MusicFile) {
        this.status = ExtractionJobStatus.COMPLETED
        this.musicFile = musicFile
        this.completedAt = Instant.now()
        this.updatedAt = Instant.now()
    }

    fun markFailed(errorMessage: String, isRetryable: Boolean) {
        this.errorMessage = errorMessage
        if (isRetryable && attempts < maxAttempts) {
            val backoffMinutes = when (attempts) {
                1 -> 1L
                2 -> 5L
                else -> 15L
            }
            this.status = ExtractionJobStatus.PENDING
            this.scheduledAt = Instant.now().plusSeconds(backoffMinutes * 60)
        } else {
            this.status = ExtractionJobStatus.FAILED
            this.completedAt = Instant.now()
        }
        this.updatedAt = Instant.now()
    }
}
