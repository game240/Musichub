package com.musichub.backend.domain.auth

import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Duration

data class GoogleLoginRequest(
    val idToken: String
)

data class LocalRegisterRequest(
    @field:NotBlank(message = "이메일은 필수 입력값입니다.")
    @field:Email(message = "올바른 이메일 형식이 아닙니다.")
    val email: String,

    @field:NotBlank(message = "비밀번호는 필수 입력값입니다.")
    @field:Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?~]).{8,64}$",
        message = "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다."
    )
    val password: String,

    val displayName: String? = null
)

data class LocalLoginRequest(
    @field:NotBlank(message = "이메일은 필수 입력값입니다.")
    val email: String,

    @field:NotBlank(message = "비밀번호는 필수 입력값입니다.")
    val password: String
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
    val storageUsedBytes: Long,
    val volume: Int,
    val role: String? = null
)

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    @Value("\${musichub.auth.cookie-secure:false}") private val cookieSecure: Boolean
) {

    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: LocalRegisterRequest,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val result = authService.register(request, userAgent)
        setRefreshTokenCookie(response, result.refreshToken, Duration.ofDays(7))
        return ResponseEntity.ok(toAuthResponse(result))
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LocalLoginRequest,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val result = authService.loginWithLocal(request, userAgent)
        setRefreshTokenCookie(response, result.refreshToken, Duration.ofDays(7))
        return ResponseEntity.ok(toAuthResponse(result))
    }

    @PostMapping("/google")
    fun loginWithGoogle(
        @RequestBody request: GoogleLoginRequest,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val result = authService.loginWithGoogle(request.idToken, userAgent)
        setRefreshTokenCookie(response, result.refreshToken, Duration.ofDays(7))
        return ResponseEntity.ok(toAuthResponse(result))
    }

    @PostMapping("/refresh")
    fun refresh(
        @CookieValue(name = "refresh_token") refreshToken: String,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val result = authService.refresh(refreshToken, userAgent)
        setRefreshTokenCookie(response, result.refreshToken, Duration.ofDays(7))
        return ResponseEntity.ok(toAuthResponse(result))
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

    private fun toAuthResponse(result: TokenResult): AuthResponse {
        return AuthResponse(
            accessToken = result.accessToken,
            expiresIn = result.expiresIn,
            user = UserDto(
                id = result.user.id,
                email = result.user.email,
                displayName = result.user.displayName,
                profileImageUrl = result.user.profileImageUrl,
                storageUsedBytes = result.user.storageUsedBytes,
                volume = result.user.volume,
                role = result.user.role?.name
            )
        )
    }

    private fun setRefreshTokenCookie(response: HttpServletResponse, token: String, maxAge: Duration) {
        val cookie = ResponseCookie.from("refresh_token", token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/api/auth/refresh")
            .maxAge(maxAge)
            .build()

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }
}
