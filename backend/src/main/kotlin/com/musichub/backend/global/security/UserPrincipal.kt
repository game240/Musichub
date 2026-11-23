package com.musichub.backend.global.security

import com.musichub.backend.domain.user.UserRole
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

data class UserPrincipal(
    val id: Long,
    val email: String,
    val role: UserRole? = null
) : UserDetails {
    override fun getAuthorities(): Collection<GrantedAuthority> {
        val authorities = mutableListOf<GrantedAuthority>(SimpleGrantedAuthority("ROLE_USER"))
        when (role) {
            UserRole.ADMIN -> authorities.add(SimpleGrantedAuthority("ROLE_ADMIN"))
            UserRole.DOWNLOADER -> authorities.add(SimpleGrantedAuthority("ROLE_DOWNLOADER"))
            null -> {}
        }
        return authorities
    }

    fun isAdmin(): Boolean = role == UserRole.ADMIN

    override fun getPassword(): String = ""
    override fun getUsername(): String = email
    override fun isAccountNonExpired(): Boolean = true
    override fun isAccountNonLocked(): Boolean = true
    override fun isCredentialsNonExpired(): Boolean = true
    override fun isEnabled(): Boolean = true
}
