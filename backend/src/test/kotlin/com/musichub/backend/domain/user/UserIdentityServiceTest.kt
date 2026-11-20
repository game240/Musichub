package com.musichub.backend.domain.user

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

class UserIdentityServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var userIdentityRepository: UserIdentityRepository
    private lateinit var passwordEncoder: BCryptPasswordEncoder
    private lateinit var userIdentityService: UserIdentityService

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
        passwordEncoder = BCryptPasswordEncoder()

        userIdentityService = UserIdentityService(
            userRepository = userRepository,
            userIdentityRepository = userIdentityRepository,
            passwordEncoder = passwordEncoder,
            googleClientId = "dummy-client-id"
        )
    }

    @Test
    fun `getIdentities returns identity list and password status`() {
        val user = User(id = 1L, providerId = "user@test.com", email = "user@test.com")
        val localIdentity = UserIdentity(
            id = 10L,
            user = user,
            provider = AuthProvider.LOCAL,
            providerId = "user@test.com",
            passwordHash = passwordEncoder.encode("secret123")
        )
        val googleIdentity = UserIdentity(
            id = 11L,
            user = user,
            provider = AuthProvider.GOOGLE,
            providerId = "google-sub-123"
        )

        given(userRepository.findById(1L)).willReturn(Optional.of(user))
        given(userIdentityRepository.findAllByUserId(1L)).willReturn(listOf(localIdentity, googleIdentity))

        val result = userIdentityService.getIdentities(1L)

        assertTrue(result.hasPassword)
        assertEquals(2, result.identities.size)
        assertEquals(AuthProvider.LOCAL, result.identities[0].provider)
        assertEquals(AuthProvider.GOOGLE, result.identities[1].provider)
    }

    @Test
    fun `setPassword creates LOCAL identity when first setting password`() {
        val user = User(id = 1L, providerId = "google-sub", email = "user@gmail.com")

        given(userRepository.findById(1L)).willReturn(Optional.of(user))
        given(userIdentityRepository.findByUserIdAndProvider(1L, AuthProvider.LOCAL)).willReturn(Optional.empty())
        given(userIdentityRepository.save(anyIdentity())).willAnswer { it.getArgument(0) }

        userIdentityService.setPassword(1L, null, "newPassword123!")

        assertNotNull(user.passwordHash)
        assertTrue(passwordEncoder.matches("newPassword123!", user.passwordHash))
    }

    @Test
    fun `setPassword updates password when current password matches`() {
        val user = User(id = 1L, providerId = "user@test.com", email = "user@test.com")
        val existingIdentity = UserIdentity(
            id = 10L,
            user = user,
            provider = AuthProvider.LOCAL,
            providerId = "user@test.com",
            passwordHash = passwordEncoder.encode("oldPassword123!")
        )

        given(userRepository.findById(1L)).willReturn(Optional.of(user))
        given(userIdentityRepository.findByUserIdAndProvider(1L, AuthProvider.LOCAL)).willReturn(Optional.of(existingIdentity))

        userIdentityService.setPassword(1L, "oldPassword123!", "newPassword456@")

        assertTrue(passwordEncoder.matches("newPassword456@", existingIdentity.passwordHash))
        assertTrue(passwordEncoder.matches("newPassword456@", user.passwordHash))
    }

    @Test
    fun `setPassword throws IllegalArgumentException when current password does not match`() {
        val user = User(id = 1L, providerId = "user@test.com", email = "user@test.com")
        val existingIdentity = UserIdentity(
            id = 10L,
            user = user,
            provider = AuthProvider.LOCAL,
            providerId = "user@test.com",
            passwordHash = passwordEncoder.encode("oldPassword123!")
        )

        given(userRepository.findById(1L)).willReturn(Optional.of(user))
        given(userIdentityRepository.findByUserIdAndProvider(1L, AuthProvider.LOCAL)).willReturn(Optional.of(existingIdentity))

        val ex = assertThrows<IllegalArgumentException> {
            userIdentityService.setPassword(1L, "wrongPassword", "newPassword456@")
        }

        assertEquals("현재 비밀번호가 일치하지 않습니다.", ex.message)
    }

    @Test
    fun `setPassword throws IllegalArgumentException when new password does not meet complexity`() {
        val ex = assertThrows<IllegalArgumentException> {
            userIdentityService.setPassword(1L, null, "simple123") // 특수문자 없음
        }
        assertEquals("비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.", ex.message)
    }

    @Test
    fun `unlinkProvider removes identity when 2 or more identities exist`() {
        val user = User(id = 1L, providerId = "user@test.com", email = "user@test.com")
        val googleIdentity = UserIdentity(
            id = 11L,
            user = user,
            provider = AuthProvider.GOOGLE,
            providerId = "google-sub-123"
        )

        given(userIdentityRepository.countByUserId(1L)).willReturn(2L)
        given(userIdentityRepository.findByUserIdAndProvider(1L, AuthProvider.GOOGLE)).willReturn(Optional.of(googleIdentity))

        userIdentityService.unlinkProvider(1L, AuthProvider.GOOGLE)

        Mockito.verify(userIdentityRepository).delete(googleIdentity)
    }

    @Test
    fun `unlinkProvider throws IllegalStateException when only 1 identity exists`() {
        given(userIdentityRepository.countByUserId(1L)).willReturn(1L)

        val ex = assertThrows<IllegalStateException> {
            userIdentityService.unlinkProvider(1L, AuthProvider.GOOGLE)
        }

        assertEquals("최소 하나 이상의 로그인 수단이 유지되어야 합니다.", ex.message)
    }
}
