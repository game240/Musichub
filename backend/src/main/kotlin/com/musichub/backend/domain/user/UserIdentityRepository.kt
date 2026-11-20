package com.musichub.backend.domain.user

import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserIdentityRepository : JpaRepository<UserIdentity, Long> {
    fun findByProviderAndProviderId(provider: AuthProvider, providerId: String): Optional<UserIdentity>
    fun findAllByUserId(userId: Long): List<UserIdentity>
    fun findByUserIdAndProvider(userId: Long, provider: AuthProvider): Optional<UserIdentity>
    fun countByUserId(userId: Long): Long
    fun existsByProviderAndProviderId(provider: AuthProvider, providerId: String): Boolean
}
