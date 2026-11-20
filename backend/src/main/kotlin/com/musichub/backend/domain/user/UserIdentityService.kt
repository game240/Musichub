package com.musichub.backend.domain.user

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.musichub.backend.global.mail.EmailService
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.Collections

data class IdentityDto(
    val provider: AuthProvider,
    val identifier: String,
    val createdAt: Instant
)

data class UserIdentitiesDto(
    val hasPassword: Boolean,
    val identities: List<IdentityDto>
)

@Service
class UserIdentityService(
    private val userRepository: UserRepository,
    private val userIdentityRepository: UserIdentityRepository,
    private val passwordEncoder: PasswordEncoder,
    private val verificationManager: PasswordSetupVerificationManager,
    private val emailService: EmailService,
    @Value("\${musichub.auth.google.client-id}") private val googleClientId: String
) {
    companion object {
        val PASSWORD_REGEX = Regex("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?~]).{8,64}$")
    }

    private val verifier by lazy {
        GoogleIdTokenVerifier.Builder(NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(Collections.singletonList(googleClientId))
            .build()
    }

    @Transactional(readOnly = true)
    fun getIdentities(userId: Long): UserIdentitiesDto {
        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("사용자를 찾을 수 없습니다.") }

        val identities = userIdentityRepository.findAllByUserId(userId)
        val hasPassword = identities.any { it.provider == AuthProvider.LOCAL && !it.passwordHash.isNullOrBlank() }
            || !user.passwordHash.isNullOrBlank()

        val dtos = identities.map { identity ->
            IdentityDto(
                provider = identity.provider,
                identifier = if (identity.provider == AuthProvider.LOCAL) identity.providerId else user.email,
                createdAt = identity.createdAt
            )
        }

        return UserIdentitiesDto(
            hasPassword = hasPassword,
            identities = dtos
        )
    }

    @Transactional
    fun requestPasswordSetup(userId: Long) {
        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("사용자를 찾을 수 없습니다.") }

        val hasPassword = userIdentityRepository.findByUserIdAndProvider(userId, AuthProvider.LOCAL)
            .map { !it.passwordHash.isNullOrBlank() }
            .orElse(false) || !user.passwordHash.isNullOrBlank()

        if (hasPassword) {
            throw IllegalStateException("이미 비밀번호가 등록되어 있습니다. 비밀번호 변경 기능을 이용해 주세요.")
        }

        val code = verificationManager.createCode(userId)
        emailService.sendPasswordSetupCode(user.email, code)
    }

    @Transactional
    fun confirmPasswordSetup(userId: Long, code: String, newPassword: String) {
        require(PASSWORD_REGEX.matches(newPassword)) { "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다." }

        verificationManager.verifyCode(userId, code)

        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("사용자를 찾을 수 없습니다.") }

        val localIdentityOpt = userIdentityRepository.findByUserIdAndProvider(userId, AuthProvider.LOCAL)
        val hashed = passwordEncoder.encode(newPassword)

        if (localIdentityOpt.isPresent) {
            val identity = localIdentityOpt.get()
            identity.passwordHash = hashed
        } else {
            userIdentityRepository.save(
                UserIdentity(
                    user = user,
                    provider = AuthProvider.LOCAL,
                    providerId = user.email,
                    passwordHash = hashed
                )
            )
        }
        user.passwordHash = hashed
    }

    @Transactional
    fun setPassword(userId: Long, currentPassword: String?, newPassword: String) {
        require(PASSWORD_REGEX.matches(newPassword)) { "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다." }

        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("사용자를 찾을 수 없습니다.") }

        val localIdentityOpt = userIdentityRepository.findByUserIdAndProvider(userId, AuthProvider.LOCAL)

        if (localIdentityOpt.isPresent) {
            val identity = localIdentityOpt.get()
            if (!identity.passwordHash.isNullOrBlank()) {
                if (currentPassword.isNullOrBlank()) {
                    throw IllegalArgumentException("기존 비밀번호를 입력해 주세요.")
                }
                if (!passwordEncoder.matches(currentPassword, identity.passwordHash)) {
                    throw IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.")
                }
            }
            val hashed = passwordEncoder.encode(newPassword)
            identity.passwordHash = hashed
            user.passwordHash = hashed
        } else {
            // Google 등으로 최초 가입한 후 일반 로그인(비밀번호) 수단 신규 추가
            val hashed = passwordEncoder.encode(newPassword)
            userIdentityRepository.save(
                UserIdentity(
                    user = user,
                    provider = AuthProvider.LOCAL,
                    providerId = user.email,
                    passwordHash = hashed
                )
            )
            user.passwordHash = hashed
        }
    }

    @Transactional
    fun linkGoogle(userId: Long, idTokenString: String) {
        val idToken = verifier.verify(idTokenString)
            ?: throw IllegalArgumentException("유효하지 않은 Google ID Token입니다.")

        val payload = idToken.payload
        val googleSubject = payload.subject

        val existingIdentity = userIdentityRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, googleSubject)
        if (existingIdentity.isPresent) {
            if (existingIdentity.get().user.id != userId) {
                throw IllegalStateException("해당 Google 계정은 이미 다른 Music Hub 계정에 연결되어 있습니다.")
            }
            return
        }

        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("사용자를 찾을 수 없습니다.") }

        userIdentityRepository.save(
            UserIdentity(
                user = user,
                provider = AuthProvider.GOOGLE,
                providerId = googleSubject
            )
        )
    }

    @Transactional
    fun unlinkProvider(userId: Long, provider: AuthProvider) {
        val count = userIdentityRepository.countByUserId(userId)
        if (count <= 1) {
            throw IllegalStateException("최소 하나 이상의 로그인 수단이 유지되어야 합니다.")
        }

        val identity = userIdentityRepository.findByUserIdAndProvider(userId, provider)
            .orElseThrow { IllegalArgumentException("연결되어 있지 않은 로그인 수단입니다.") }

        userIdentityRepository.delete(identity)

        if (provider == AuthProvider.LOCAL) {
            userRepository.findById(userId).ifPresent {
                it.passwordHash = null
            }
        }
    }
}
