package com.musichub.backend.domain.auth

import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Duration

data class GoogleLoginRequest(
    val idToken: String
)

data class AuthResponse(
    val accessToken: String,
    val expiresIn: Long,
    val user: UserDto
)

data class UserDto(
    val id: Long,
    val email: String,
    val displayName: String?,
    val profileImageUrl: String?,
    val storageUsedBytes: Long
)

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/google")
    fun loginWithGoogle(
        @RequestBody request: GoogleLoginRequest,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val result = authService.loginWithGoogle(request.idToken, userAgent)
        setRefreshTokenCookie(response, result.refreshToken, Duration.ofDays(7))

        return ResponseEntity.ok(
            AuthResponse(
                accessToken = result.accessToken,
                expiresIn = result.expiresIn,
                user = UserDto(
                    id = result.user.id,
                    email = result.user.email,
                    displayName = result.user.displayName,
                    profileImageUrl = result.user.profileImageUrl,
                    storageUsedBytes = result.user.storageUsedBytes
                )
            )
        )
    }

    @PostMapping("/refresh")
    fun refresh(
        @CookieValue(name = "refresh_token") refreshToken: String,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val result = authService.refresh(refreshToken, userAgent)
        setRefreshTokenCookie(response, result.refreshToken, Duration.ofDays(7))

        return ResponseEntity.ok(
            AuthResponse(
                accessToken = result.accessToken,
                expiresIn = result.expiresIn,
                user = UserDto(
                    id = result.user.id,
                    email = result.user.email,
                    displayName = result.user.displayName,
                    profileImageUrl = result.user.profileImageUrl,
                    storageUsedBytes = result.user.storageUsedBytes
                )
            )
        )
    }

    @PostMapping("/logout")
    fun logout(
        @CookieValue(name = "refresh_token", required = false) refreshToken: String?,
        response: HttpServletResponse
    ): ResponseEntity<Void> {
        authService.logout(refreshToken)
        setRefreshTokenCookie(response, "", Duration.ZERO)
        return ResponseEntity.ok().build()
    }

    private fun setRefreshTokenCookie(response: HttpServletResponse, token: String, maxAge: Duration) {
        val cookie = ResponseCookie.from("refresh_token", token)
            .httpOnly(true)
            .secure(false) // 프로덕션 배포 시 true (HTTPS 환경)
            .sameSite("Strict")
            .path("/api/auth/refresh")
            .maxAge(maxAge)
            .build()

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }
}
