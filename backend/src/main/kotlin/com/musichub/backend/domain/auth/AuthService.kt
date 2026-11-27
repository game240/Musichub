package com.musichub.backend.domain.auth

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.musichub.backend.domain.user.AuthProvider
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserIdentity
import com.musichub.backend.domain.user.UserIdentityRepository
import com.musichub.backend.domain.user.UserRepository
import com.musichub.backend.global.mail.EmailService
import com.musichub.backend.global.security.JwtProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

data class TokenResult(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long,
    val user: User
)

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val userIdentityRepository: UserIdentityRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val jwtProvider: JwtProvider,
    private val passwordEncoder: PasswordEncoder,
    private val signupVerificationManager: SignupVerificationManager,
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
    fun requestSignupVerification(email: String) {
        val normalizedEmail = email.trim().lowercase()

        val existingIdentity = userIdentityRepository.findByProviderAndProviderId(AuthProvider.LOCAL, normalizedEmail)
        val existingUser = userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, normalizedEmail)
        if (existingIdentity.isPresent || existingUser.isPresent) {
            throw IllegalArgumentException("이미 가입된 이메일입니다.")
        }

        val code = signupVerificationManager.createCode(normalizedEmail)
        emailService.sendSignupVerificationCode(normalizedEmail, code)
    }

    @Transactional
    fun register(request: LocalRegisterRequest, deviceInfo: String?): TokenResult {
        require(PASSWORD_REGEX.matches(request.password)) { "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다." }

        val normalizedEmail = request.email.trim().lowercase()

        val existingIdentity = userIdentityRepository.findByProviderAndProviderId(AuthProvider.LOCAL, normalizedEmail)
        val existingUser = userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, normalizedEmail)
        if (existingIdentity.isPresent || existingUser.isPresent) {
            throw IllegalArgumentException("이미 가입된 이메일입니다.")
        }

        signupVerificationManager.verifyCode(normalizedEmail, request.verificationCode)

        val hashedPassword = passwordEncoder.encode(request.password)
        val defaultDisplayName = request.displayName?.trim()?.ifBlank { null }
            ?: normalizedEmail.substringBefore("@")

        val user = userRepository.save(
            User(
                authProvider = AuthProvider.LOCAL,
                providerId = normalizedEmail,
                email = normalizedEmail,
                passwordHash = hashedPassword,
                displayName = defaultDisplayName
            )
        )

        userIdentityRepository.save(
            UserIdentity(
                user = user,
                provider = AuthProvider.LOCAL,
                providerId = normalizedEmail,
                passwordHash = hashedPassword
            )
        )

        return issueTokens(user, deviceInfo)
    }

    @Transactional
    fun loginWithLocal(request: LocalLoginRequest, deviceInfo: String?): TokenResult {
        val normalizedEmail = request.email.trim().lowercase()

        val identityOpt = userIdentityRepository.findByProviderAndProviderId(AuthProvider.LOCAL, normalizedEmail)
        if (identityOpt.isPresent) {
            val identity = identityOpt.get()
            val passwordHash = identity.passwordHash?.takeIf { it.isNotBlank() }
                ?: throw IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.")

            if (!passwordEncoder.matches(request.password, passwordHash)) {
                throw IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.")
            }
            return issueTokens(identity.user, deviceInfo)
        }

        // Fallback for pre-migration users
        val user = userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, normalizedEmail)
            .orElseThrow { IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.") }

        val passwordHash = user.passwordHash?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.")

        if (!passwordEncoder.matches(request.password, passwordHash)) {
            throw IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.")
        }

        userIdentityRepository.save(
            UserIdentity(
                user = user,
                provider = AuthProvider.LOCAL,
                providerId = normalizedEmail,
                passwordHash = passwordHash
            )
        )

        return issueTokens(user, deviceInfo)
    }

    @Transactional
    fun loginWithGoogle(idTokenString: String, deviceInfo: String?): TokenResult {
        val idToken = verifier.verify(idTokenString)
            ?: throw IllegalArgumentException("유효하지 않은 Google ID Token입니다.")

        val payload = idToken.payload
        val googleSubject = payload.subject
        val email = payload.email
        val name = payload.get("name") as? String
        val picture = payload.get("picture") as? String

        val identityOpt = userIdentityRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, googleSubject)
        if (identityOpt.isPresent) {
            val user = identityOpt.get().user
            user.email = email
            user.displayName = name ?: user.displayName
            user.profileImageUrl = picture ?: user.profileImageUrl
            return issueTokens(user, deviceInfo)
        }

        val user = userRepository.findByAuthProviderAndProviderId(AuthProvider.GOOGLE, googleSubject)
            .map { existingUser ->
                existingUser.email = email
                existingUser.displayName = name ?: existingUser.displayName
                existingUser.profileImageUrl = picture ?: existingUser.profileImageUrl
                existingUser
            }
            .orElseGet {
                userRepository.save(
                    User(
                        authProvider = AuthProvider.GOOGLE,
                        providerId = googleSubject,
                        email = email,
                        displayName = name,
                        profileImageUrl = picture
                    )
                )
            }

        userIdentityRepository.save(
            UserIdentity(
                user = user,
                provider = AuthProvider.GOOGLE,
                providerId = googleSubject
            )
        )

        return issueTokens(user, deviceInfo)
    }

    @Transactional
    fun refresh(refreshTokenValue: String, deviceInfo: String?): TokenResult {
        val tokenHash = jwtProvider.hashToken(refreshTokenValue)
        val refreshToken = refreshTokenRepository.findByTokenHash(tokenHash)
            .orElseThrow { IllegalArgumentException("존재하지 않는 리프레시 토큰입니다.") }

        if (!refreshToken.isValid) {
            // 탈취 의심 시나리오: 이미 무효화되었거나 만료된 토큰 재사용 시 해당 유저의 모든 토큰 강제 만료
            refreshTokenRepository.revokeAllByUserId(refreshToken.user.id)
            throw IllegalStateException("만료되었거나 이미 무효화된 리프레시 토큰입니다. 보안을 위해 재로그인이 필요합니다.")
        }

        // 기존 토큰 무효화 (Rotation)
        refreshToken.revoke()

        return issueTokens(refreshToken.user, deviceInfo)
    }

    @Transactional
    fun logout(refreshTokenValue: String?) {
        if (refreshTokenValue != null) {
            val tokenHash = jwtProvider.hashToken(refreshTokenValue)
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent {
                it.revoke()
            }
        }
    }

    private fun issueTokens(user: User, deviceInfo: String?): TokenResult {
        val accessToken = jwtProvider.generateAccessToken(user.id, user.email, user.role)
        val refreshTokenValue = jwtProvider.generateRefreshTokenValue()
        val tokenHash = jwtProvider.hashToken(refreshTokenValue)
        val expiresAt = Instant.now().plusMillis(jwtProvider.refreshTokenValidityMs)

        refreshTokenRepository.save(
            RefreshToken(
                user = user,
                tokenHash = tokenHash,
                deviceInfo = deviceInfo,
                expiresAt = expiresAt
            )
        )

        return TokenResult(
            accessToken = accessToken,
            refreshToken = refreshTokenValue,
            expiresIn = jwtProvider.accessTokenValidityMs / 1000,
            user = user
        )
    }
}
