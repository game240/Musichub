package com.musichub.backend.global.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.*
import javax.crypto.SecretKey

@Component
class JwtProvider(
    @Value("\${musichub.auth.jwt.secret}") private val secret: String,
    @Value("\${musichub.auth.jwt.access-token-validity-ms}") val accessTokenValidityMs: Long,
    @Value("\${musichub.auth.jwt.refresh-token-validity-ms}") val refreshTokenValidityMs: Long
) {
    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))
    }

    fun generateAccessToken(userId: Long, email: String): String {
        val now = Date()
        val validity = Date(now.time + accessTokenValidityMs)

        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .issuedAt(now)
            .expiration(validity)
            .signWith(key)
            .compact()
    }

    fun generateRefreshTokenValue(): String {
        return UUID.randomUUID().toString() + UUID.randomUUID().toString()
    }

    fun hashToken(token: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(token.toByteArray(StandardCharsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }

    fun parseClaims(token: String): Claims? {
        return try {
            Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .payload
        } catch (e: Exception) {
            null
        }
    }
}
