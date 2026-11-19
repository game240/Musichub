package com.musichub.backend.domain.auth

import com.musichub.backend.domain.user.User
import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "refresh_token")
class RefreshToken(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    val tokenHash: String,

    @Column(name = "device_info")
    val deviceInfo: String? = null,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,

    @Column(name = "revoked_at")
    var revokedAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
) {
    val isExpired: Boolean
        get() = Instant.now().isAfter(expiresAt)

    val isRevoked: Boolean
        get() = revokedAt != null

    val isValid: Boolean
        get() = !isExpired && !isRevoked

    fun revoke() {
        this.revokedAt = Instant.now()
    }
}
