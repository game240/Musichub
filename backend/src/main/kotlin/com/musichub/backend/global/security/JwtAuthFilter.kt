package com.musichub.backend.global.security

import com.musichub.backend.domain.user.UserRole
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(
    private val jwtProvider: JwtProvider
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            val token = authHeader.substring(7)
            val claims = jwtProvider.parseClaims(token)
            if (claims != null) {
                val userId = claims.subject.toLong()
                val email = claims.get("email", String::class.java)
                val roleStr = claims.get("role", String::class.java)
                val role = roleStr?.let { runCatching { UserRole.valueOf(it) }.getOrNull() }
                val principal = UserPrincipal(userId, email, role)

                val authentication = UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    principal.authorities
                )
                SecurityContextHolder.getContext().authentication = authentication
            }
        }

        filterChain.doFilter(request, response)
    }
}
