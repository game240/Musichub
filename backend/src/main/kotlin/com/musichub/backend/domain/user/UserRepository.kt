package com.musichub.backend.domain.user

import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserRepository : JpaRepository<User, Long> {
    fun findByAuthProviderAndProviderId(authProvider: AuthProvider, providerId: String): Optional<User>
    fun findByEmail(email: String): Optional<User>
}
