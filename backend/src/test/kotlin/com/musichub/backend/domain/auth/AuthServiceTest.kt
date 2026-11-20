package com.musichub.backend.domain.auth

import com.musichub.backend.domain.user.AuthProvider
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserIdentity
import com.musichub.backend.domain.user.UserIdentityRepository
import com.musichub.backend.domain.user.UserRepository
import com.musichub.backend.global.security.JwtProvider
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.*
import org.mockito.BDDMockito.given
import org.mockito.Mockito
import org.mockito.Mockito.mock
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import java.util.Optional

class AuthServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var userIdentityRepository: UserIdentityRepository
    private lateinit var refreshTokenRepository: RefreshTokenRepository
    private lateinit var jwtProvider: JwtProvider
    private lateinit var passwordEncoder: BCryptPasswordEncoder
    private lateinit var authService: AuthService

    private fun anyUser(): User {
        Mockito.any(User::class.java)
        return User(id = 0L, providerId = "", email = "")
    }

    private fun anyIdentity(): UserIdentity {
        Mockito.any(UserIdentity::class.java)
        return UserIdentity(
            id = 0L,
            user = User(id = 1L, providerId = "test", email = "test@test.com"),
            provider = AuthProvider.LOCAL,
            providerId = "test@test.com"
        )
    }

    @BeforeEach
    fun setUp() {
        userRepository = mock(UserRepository::class.java)
        userIdentityRepository = mock(UserIdentityRepository::class.java)
        refreshTokenRepository = mock(RefreshTokenRepository::class.java)
        jwtProvider = mock(JwtProvider::class.java)
        passwordEncoder = BCryptPasswordEncoder()

        given(jwtProvider.generateAccessToken(anyLong(), anyString())).willReturn("mock-access-token")
        given(jwtProvider.generateRefreshTokenValue()).willReturn("mock-refresh-token")
        given(jwtProvider.hashToken(anyString())).willReturn("mock-token-hash")
        given(jwtProvider.accessTokenValidityMs).willReturn(900000L)
        given(jwtProvider.refreshTokenValidityMs).willReturn(604800000L)

        authService = AuthService(
            userRepository = userRepository,
            userIdentityRepository = userIdentityRepository,
            refreshTokenRepository = refreshTokenRepository,
            jwtProvider = jwtProvider,
            passwordEncoder = passwordEncoder,
            googleClientId = "dummy-client-id"
        )
    }

    @Test
    fun `register successfully creates user with hashed password and returns tokens`() {
        val request = LocalRegisterRequest(
            email = "test@musichub.com",
            password = "password123!",
            displayName = "테스터"
        )

        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "test@musichub.com"))
            .willReturn(Optional.empty())

        given(userRepository.save(anyUser())).willAnswer { invocation ->
            val savedUser = invocation.getArgument<User>(0)
            User(
                id = 10L,
                authProvider = savedUser.authProvider,
                providerId = savedUser.providerId,
                email = savedUser.email,
                passwordHash = savedUser.passwordHash,
                displayName = savedUser.displayName
            )
        }

        val result = authService.register(request, "TestBrowser")

        assertNotNull(result)
        assertEquals("mock-access-token", result.accessToken)
        assertEquals("mock-refresh-token", result.refreshToken)
        assertEquals("test@musichub.com", result.user.email)
        assertEquals("테스터", result.user.displayName)
        assertTrue(passwordEncoder.matches("password123!", result.user.passwordHash))
    }

    @Test
    fun `register throws IllegalArgumentException when email already registered`() {
        val request = LocalRegisterRequest(
            email = "existing@musichub.com",
            password = "password123!",
            displayName = "기존유저"
        )

        val existingUser = User(
            id = 1L,
            authProvider = AuthProvider.LOCAL,
            providerId = "existing@musichub.com",
            email = "existing@musichub.com"
        )

        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "existing@musichub.com"))
            .willReturn(Optional.of(existingUser))

        val ex = assertThrows<IllegalArgumentException> {
            authService.register(request, "TestBrowser")
        }

        assertEquals("이미 가입된 이메일입니다.", ex.message)
    }

    @Test
    fun `loginWithLocal succeeds when email and password match`() {
        val hashedPassword = passwordEncoder.encode("correct-password")
        val user = User(
            id = 5L,
            authProvider = AuthProvider.LOCAL,
            providerId = "user@test.com",
            email = "user@test.com",
            passwordHash = hashedPassword,
            displayName = "로그인유저"
        )

        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "user@test.com"))
            .willReturn(Optional.of(user))

        val request = LocalLoginRequest(
            email = "user@test.com",
            password = "correct-password"
        )

        val result = authService.loginWithLocal(request, "TestBrowser")

        assertEquals("mock-access-token", result.accessToken)
        assertEquals("mock-refresh-token", result.refreshToken)
        assertEquals(5L, result.user.id)
    }

    @Test
    fun `loginWithLocal throws IllegalArgumentException when password does not match`() {
        val hashedPassword = passwordEncoder.encode("correct-password")
        val user = User(
            id = 5L,
            authProvider = AuthProvider.LOCAL,
            providerId = "user@test.com",
            email = "user@test.com",
            passwordHash = hashedPassword
        )

        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "user@test.com"))
            .willReturn(Optional.of(user))

        val request = LocalLoginRequest(
            email = "user@test.com",
            password = "wrong-password"
        )

        val ex = assertThrows<IllegalArgumentException> {
            authService.loginWithLocal(request, "TestBrowser")
        }

        assertEquals("이메일 또는 비밀번호가 올바르지 않습니다.", ex.message)
    }

    @Test
    fun `loginWithLocal throws IllegalArgumentException when user does not exist`() {
        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "nonexistent@test.com"))
            .willReturn(Optional.empty())

        val request = LocalLoginRequest(
            email = "nonexistent@test.com",
            password = "any-password"
        )

        val ex = assertThrows<IllegalArgumentException> {
            authService.loginWithLocal(request, "TestBrowser")
        }

        assertEquals("이메일 또는 비밀번호가 올바르지 않습니다.", ex.message)
    }
}
