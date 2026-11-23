package com.musichub.backend.domain.user

import com.musichub.backend.global.security.UserPrincipal
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

data class SetPasswordRequest(
    @field:NotBlank(message = "인증번호는 필수 입력값입니다.")
    @field:Size(min = 6, max = 6, message = "인증번호는 6자리 숫자여야 합니다.")
    val code: String,

    val currentPassword: String? = null,

    @field:NotBlank(message = "새 비밀번호는 필수 입력값입니다.")
    @field:Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?~]).{8,64}$",
        message = "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다."
    )
    val newPassword: String
)

data class LinkGoogleRequest(
    @field:NotBlank(message = "Google ID 토큰은 필수 입력값입니다.")
    val idToken: String
)

data class ConfirmPasswordSetupRequest(
    @field:NotBlank(message = "인증번호는 필수 입력값입니다.")
    @field:Size(min = 6, max = 6, message = "인증번호는 6자리 숫자여야 합니다.")
    val code: String,

    @field:NotBlank(message = "새 비밀번호는 필수 입력값입니다.")
    @field:Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?~]).{8,64}$",
        message = "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다."
    )
    val newPassword: String
)

@RestController
@RequestMapping("/api/users/me/identities")
class UserIdentityController(
    private val userIdentityService: UserIdentityService
) {

    @GetMapping
    fun getIdentities(
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<UserIdentitiesDto> {
        val result = userIdentityService.getIdentities(principal.id)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/password/request-code")
    fun requestPasswordCode(
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        userIdentityService.requestPasswordVerification(principal.id)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/password")
    fun setPassword(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: SetPasswordRequest
    ): ResponseEntity<Void> {
        userIdentityService.setPassword(principal.id, request.code, request.currentPassword, request.newPassword)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/password-setup/request")
    fun requestPasswordSetup(
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        userIdentityService.requestPasswordSetup(principal.id)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/password-setup/confirm")
    fun confirmPasswordSetup(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: ConfirmPasswordSetupRequest
    ): ResponseEntity<Void> {
        userIdentityService.confirmPasswordSetup(principal.id, request.code, request.newPassword)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/google")
    fun linkGoogle(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: LinkGoogleRequest
    ): ResponseEntity<Void> {
        userIdentityService.linkGoogle(principal.id, request.idToken)
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/{provider}")
    fun unlinkProvider(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable provider: AuthProvider
    ): ResponseEntity<Void> {
        userIdentityService.unlinkProvider(principal.id, provider)
        return ResponseEntity.ok().build()
    }
}
