package com.musichub.backend.domain.user

import jakarta.persistence.*
import java.time.Instant

enum class AuthProvider {
    GOOGLE,
    GITHUB,
    LOCAL
}

enum class UserRole {
    ADMIN,
    DOWNLOADER
}

@Entity
@Table(
    name = "users",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_users_provider", columnNames = ["auth_provider", "provider_id"])
    ]
)
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false)
    var authProvider: AuthProvider = AuthProvider.GOOGLE,

    @Column(name = "provider_id", nullable = false)
    var providerId: String,

    @Column(nullable = false)
    var email: String,

    @Column(name = "password_hash")
    var passwordHash: String? = null,

    @Column(name = "display_name")
    var displayName: String? = null,

    @Column(name = "profile_image_url")
    var profileImageUrl: String? = null,

    @Column(name = "storage_used_bytes", nullable = false)
    var storageUsedBytes: Long = 0,

    @Column(name = "volume", nullable = false)
    var volume: Int = 100,

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    var role: UserRole? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun updateVolume(volume: Int) {
        require(volume in 0..100) { "Volume must be between 0 and 100" }
        this.volume = volume
        this.updatedAt = Instant.now()
    }

    fun addStorageUsage(bytes: Long) {
        this.storageUsedBytes += bytes
        this.updatedAt = Instant.now()
    }

    fun subtractStorageUsage(bytes: Long) {
        this.storageUsedBytes = (this.storageUsedBytes - bytes).coerceAtLeast(0)
        this.updatedAt = Instant.now()
    }

    fun isAdmin(): Boolean = role == UserRole.ADMIN
}
