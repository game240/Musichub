package com.musichub.backend.domain.user

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock
import java.util.Optional

class UserServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var userService: UserService

    @BeforeEach
    fun setUp() {
        userRepository = mock(UserRepository::class.java)
        userService = UserService(userRepository)
    }

    @Test
    fun `updateVolume updates volume successfully within 0 to 100`() {
        val user = User(
            id = 1L,
            providerId = "google-123",
            email = "user@test.com",
            volume = 100
        )
        given(userRepository.findById(1L)).willReturn(Optional.of(user))

        val result = userService.updateVolume(1L, 45)

        assertEquals(45, result)
        assertEquals(45, user.volume)
    }

    @Test
    fun `updateVolume throws IllegalArgumentException when volume is less than 0`() {
        val ex = assertThrows<IllegalArgumentException> {
            userService.updateVolume(1L, -1)
        }
        assertEquals("Volume must be between 0 and 100", ex.message)
    }

    @Test
    fun `updateVolume throws IllegalArgumentException when volume is greater than 100`() {
        val ex = assertThrows<IllegalArgumentException> {
            userService.updateVolume(1L, 101)
        }
        assertEquals("Volume must be between 0 and 100", ex.message)
    }

    @Test
    fun `updateVolume throws NoSuchElementException when user does not exist`() {
        given(userRepository.findById(999L)).willReturn(Optional.empty())

        val ex = assertThrows<NoSuchElementException> {
            userService.updateVolume(999L, 50)
        }
        assertEquals("User not found with id: 999", ex.message)
    }
}
