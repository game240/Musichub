package com.musichub.backend.domain.music

import com.musichub.backend.domain.user.User
import jakarta.persistence.*
import java.time.Instant

enum class MusicFileStatus {
    ACTIVE,
    PROCESSING,
    ERROR
}

@Entity
@Table(name = "music_file")
class MusicFile(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(name = "storage_key", nullable = false, unique = true, length = 500)
    var storageKey: String,

    @Column(name = "file_name", nullable = false, length = 500)
    var fileName: String,

    @Column(name = "mime_type", nullable = false, length = 100)
    var mimeType: String = "audio/mpeg",

    @Column(name = "file_size", nullable = false)
    var fileSize: Long,

    // ID3 / Vorbis Metadata
    @Column(length = 500)
    var title: String? = null,

    @Column(length = 500)
    var artist: String? = null,

    @Column(length = 500)
    var album: String? = null,

    var year: Int? = null,

    @Column(length = 255)
    var genre: String? = null,

    @Column(name = "track_number")
    var trackNumber: Int? = null,

    @Column(name = "duration_ms")
    var durationMs: Long? = null,

    // Album Artwork
    @Column(name = "artwork_storage_key", length = 500)
    var artworkStorageKey: String? = null,

    @Column(name = "artwork_mime_type", length = 64)
    var artworkMimeType: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: MusicFileStatus = MusicFileStatus.ACTIVE,

    @Column(name = "extracted_by_platform", nullable = false)
    var extractedByPlatform: Boolean = false,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun updateMetadata(
        title: String?,
        artist: String?,
        album: String?,
        year: Int?,
        genre: String?,
        trackNumber: Int?,
        durationMs: Long?,
        artworkStorageKey: String?,
        artworkMimeType: String?
    ) {
        this.title = title
        this.artist = artist
        this.album = album
        this.year = year
        this.genre = genre
        this.trackNumber = trackNumber
        this.durationMs = durationMs
        if (artworkStorageKey != null) {
            this.artworkStorageKey = artworkStorageKey
            this.artworkMimeType = artworkMimeType
        }
        this.updatedAt = Instant.now()
    }
}
