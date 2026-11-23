package com.musichub.backend.global.security

import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRole
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.security.core.authority.SimpleGrantedAuthority

class UserPrincipalTest {

    @Test
    fun `default role null grants ROLE_USER authority only`() {
        val principal = UserPrincipal(id = 1L, email = "test@example.com", role = null)

        assertEquals(1, principal.authorities.size)
        assertTrue(principal.authorities.contains(SimpleGrantedAuthority("ROLE_USER")))
        assertFalse(principal.isAdmin())
    }

    @Test
    fun `role ADMIN grants ROLE_USER and ROLE_ADMIN authorities`() {
        val principal = UserPrincipal(id = 1L, email = "admin@example.com", role = UserRole.ADMIN)

        val authorities = principal.authorities
        assertEquals(2, authorities.size)
        assertTrue(authorities.contains(SimpleGrantedAuthority("ROLE_USER")))
        assertTrue(authorities.contains(SimpleGrantedAuthority("ROLE_ADMIN")))
        assertTrue(principal.isAdmin())
    }

    @Test
    fun `role DOWNLOADER grants ROLE_USER and ROLE_DOWNLOADER authorities`() {
        val principal = UserPrincipal(id = 1L, email = "downloader@example.com", role = UserRole.DOWNLOADER)

        val authorities = principal.authorities
        assertEquals(2, authorities.size)
        assertTrue(authorities.contains(SimpleGrantedAuthority("ROLE_USER")))
        assertTrue(authorities.contains(SimpleGrantedAuthority("ROLE_DOWNLOADER")))
        assertFalse(principal.isAdmin())
    }

    @Test
    fun `User entity isAdmin helper reflects role`() {
        val adminUser = User(providerId = "p1", email = "admin@test.com", role = UserRole.ADMIN)
        val normalUser = User(providerId = "p2", email = "normal@test.com", role = null)
        val downloaderUser = User(providerId = "p3", email = "dl@test.com", role = UserRole.DOWNLOADER)

        assertTrue(adminUser.isAdmin())
        assertFalse(normalUser.isAdmin())
        assertFalse(downloaderUser.isAdmin())
    }
}
