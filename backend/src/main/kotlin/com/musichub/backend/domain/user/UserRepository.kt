package com.musichub.backend.domain.user

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.Optional

interface UserRepository : JpaRepository<User, Long> {
    fun findByAuthProviderAndProviderId(authProvider: AuthProvider, providerId: String): Optional<User>
    fun findByEmail(email: String): Optional<User>

    @Query(
        """
        SELECT u FROM User u
        WHERE (:query IS NULL OR :query = '' 
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) 
               OR LOWER(COALESCE(u.displayName, '')) LIKE LOWER(CONCAT('%', :query, '%')))
        """
    )
    fun searchUsers(@Param("query") query: String?, pageable: Pageable): Page<User>
}
