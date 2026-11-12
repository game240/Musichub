package com.musichub.backend.domain.user

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "google_subject", nullable = false, unique = true)
    var googleSubject: String,

    @Column(nullable = false)
    var email: String,

    @Column(name = "display_name")
    var displayName: String? = null,

    @Column(name = "profile_image_url")
    var profileImageUrl: String? = null,

    @Column(name = "storage_used_bytes", nullable = false)
    var storageUsedBytes: Long = 0,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun addStorageUsage(bytes: Long) {
        this.storageUsedBytes += bytes
        this.updatedAt = Instant.now()
    }

    fun subtractStorageUsage(bytes: Long) {
        this.storageUsedBytes = (this.storageUsedBytes - bytes).coerceAtLeast(0)
        this.updatedAt = Instant.now()
    }
}
