package com.musichub.backend.domain.auth

import com.musichub.backend.domain.user.AuthProvider
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRole
import com.musichub.backend.domain.user.UserIdentity
import com.musichub.backend.domain.user.UserIdentityRepository
import com.musichub.backend.domain.user.UserRepository
import com.musichub.backend.global.mail.EmailService
import com.musichub.backend.global.security.JwtProvider
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.*
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willThrow
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
    private lateinit var signupVerificationManager: SignupVerificationManager
    private lateinit var emailService: EmailService
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
        signupVerificationManager = mock(SignupVerificationManager::class.java)
        emailService = mock(EmailService::class.java)

        given(jwtProvider.generateAccessToken(anyLong(), anyString(), nullable(UserRole::class.java))).willReturn("mock-access-token")
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
            signupVerificationManager = signupVerificationManager,
            emailService = emailService,
            googleClientId = "dummy-client-id"
        )
    }

    @Test
    fun `requestSignupVerification successfully generates code and sends email`() {
        given(userIdentityRepository.findByProviderAndProviderId(AuthProvider.LOCAL, "newuser@musichub.com"))
            .willReturn(Optional.empty())
        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "newuser@musichub.com"))
            .willReturn(Optional.empty())
        given(signupVerificationManager.createCode("newuser@musichub.com")).willReturn("123456")

        assertDoesNotThrow {
            authService.requestSignupVerification("newuser@musichub.com")
        }

        then(emailService).should().sendSignupVerificationCode("newuser@musichub.com", "123456")
    }

    @Test
    fun `requestSignupVerification throws when email already registered`() {
        val existingUser = User(
            id = 1L,
            authProvider = AuthProvider.LOCAL,
            providerId = "existing@musichub.com",
            email = "existing@musichub.com"
        )
        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "existing@musichub.com"))
            .willReturn(Optional.of(existingUser))

        val ex = assertThrows<IllegalArgumentException> {
            authService.requestSignupVerification("existing@musichub.com")
        }
        assertEquals("이미 가입된 이메일입니다.", ex.message)
    }

    @Test
    fun `register successfully creates user with hashed password and returns tokens`() {
        val request = LocalRegisterRequest(
            email = "test@musichub.com",
            verificationCode = "123456",
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
        then(signupVerificationManager).should().verifyCode("test@musichub.com", "123456")
    }

    @Test
    fun `register throws IllegalArgumentException when verification code is invalid`() {
        val request = LocalRegisterRequest(
            email = "test@musichub.com",
            verificationCode = "000000",
            password = "password123!",
            displayName = "테스터"
        )

        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "test@musichub.com"))
            .willReturn(Optional.empty())
        willThrow(IllegalArgumentException("인증번호가 일치하지 않습니다."))
            .given(signupVerificationManager).verifyCode("test@musichub.com", "000000")

        val ex = assertThrows<IllegalArgumentException> {
            authService.register(request, "TestBrowser")
        }

        assertEquals("인증번호가 일치하지 않습니다.", ex.message)
    }

    @Test
    fun `register throws IllegalArgumentException when email already registered`() {
        val request = LocalRegisterRequest(
            email = "existing@musichub.com",
            verificationCode = "123456",
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
    fun `register throws IllegalArgumentException when password does not meet complexity`() {
        val request = LocalRegisterRequest(
            email = "test@musichub.com",
            verificationCode = "123456",
            password = "password123",
            displayName = "테스터"
        )

        val ex = assertThrows<IllegalArgumentException> {
            authService.register(request, "TestBrowser")
        }

        assertEquals("비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.", ex.message)
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

    @Test
    fun `loginWithLocal succeeds with user role preserved in result`() {
        val hashedPassword = passwordEncoder.encode("Password123!")
        val user = User(
            id = 10L,
            authProvider = AuthProvider.LOCAL,
            providerId = "admin@test.com",
            email = "admin@test.com",
            passwordHash = hashedPassword,
            role = UserRole.ADMIN
        )

        given(userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, "admin@test.com"))
            .willReturn(Optional.of(user))
        given(refreshTokenRepository.save(any(RefreshToken::class.java)))
            .willAnswer { it.arguments[0] }

        val request = LocalLoginRequest(
            email = "admin@test.com",
            password = "Password123!"
        )

        val result = authService.loginWithLocal(request, "TestBrowser")

        assertNotNull(result)
        assertEquals(UserRole.ADMIN, result.user.role)
        assertTrue(result.user.isAdmin())
    }
}
