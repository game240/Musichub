package com.musichub.backend.domain.user

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(
    name = "user_identities",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_identities_provider_id", columnNames = ["provider", "provider_id"])
    ]
)
class UserIdentity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    val provider: AuthProvider,

    @Column(name = "provider_id", nullable = false)
    val providerId: String,

    @Column(name = "password_hash")
    var passwordHash: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)
