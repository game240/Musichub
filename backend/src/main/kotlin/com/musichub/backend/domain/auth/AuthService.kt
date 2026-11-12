package com.musichub.backend.domain.auth

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRepository
import com.musichub.backend.global.security.JwtProvider
import org.springframework.beans.factory.annotation.Value
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
    private val refreshTokenRepository: RefreshTokenRepository,
    private val jwtProvider: JwtProvider,
    @Value("\${musichub.auth.google.client-id}") private val googleClientId: String
) {
    private val verifier by lazy {
        GoogleIdTokenVerifier.Builder(NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(Collections.singletonList(googleClientId))
            .build()
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

        val user = userRepository.findByGoogleSubject(googleSubject)
            .map { existingUser ->
                existingUser.email = email
                existingUser.displayName = name ?: existingUser.displayName
                existingUser.profileImageUrl = picture ?: existingUser.profileImageUrl
                existingUser
            }
            .orElseGet {
                userRepository.save(
                    User(
                        googleSubject = googleSubject,
                        email = email,
                        displayName = name,
                        profileImageUrl = picture
                    )
                )
            }

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
        val accessToken = jwtProvider.generateAccessToken(user.id, user.email)
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
