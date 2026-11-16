package com.musichub.backend.domain.metadata

data class AudioMetadata(
    val title: String?,
    val artist: String?,
    val album: String?,
    val year: Int?,
    val genre: String?,
    val trackNumber: Int?,
    val durationMs: Long?,
    val lyrics: String? = null,
    val artwork: ByteArray?,
    val artworkMimeType: String?,
    val tagVersion: String?
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as AudioMetadata

        if (title != other.title) return false
        if (artist != other.artist) return false
        if (album != other.album) return false
        if (year != other.year) return false
        if (genre != other.genre) return false
        if (trackNumber != other.trackNumber) return false
        if (durationMs != other.durationMs) return false
        if (lyrics != other.lyrics) return false
        if (artwork != null) {
            if (other.artwork == null) return false
            if (!artwork.contentEquals(other.artwork)) return false
        } else if (other.artwork != null) return false
        if (artworkMimeType != other.artworkMimeType) return false
        if (tagVersion != other.tagVersion) return false

        return true
    }

    override fun hashCode(): Int {
        var result = title?.hashCode() ?: 0
        result = 31 * result + (artist?.hashCode() ?: 0)
        result = 31 * result + (album?.hashCode() ?: 0)
        result = 31 * result + (year ?: 0)
        result = 31 * result + (genre?.hashCode() ?: 0)
        result = 31 * result + (trackNumber ?: 0)
        result = 31 * result + (durationMs?.hashCode() ?: 0)
        result = 31 * result + (lyrics?.hashCode() ?: 0)
        result = 31 * result + (artwork?.contentHashCode() ?: 0)
        result = 31 * result + (artworkMimeType?.hashCode() ?: 0)
        result = 31 * result + (tagVersion?.hashCode() ?: 0)
        return result
    }
}
