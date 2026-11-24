package com.musichub.backend.domain.admin

import com.musichub.backend.domain.music.MusicFileRepository
import com.musichub.backend.domain.music.MusicFileStatus
import com.musichub.backend.domain.user.AuthProvider
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRepository
import com.musichub.backend.domain.user.UserRole
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import java.util.Optional

class AdminUserServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var musicFileRepository: MusicFileRepository
    private lateinit var adminUserService: AdminUserService

    @BeforeEach
    fun setUp() {
        userRepository = mock(UserRepository::class.java)
        musicFileRepository = mock(MusicFileRepository::class.java)
        adminUserService = AdminUserService(userRepository, musicFileRepository)
    }

    @Test
    fun `getUsers maps user and track count correctly`() {
        val user1 = User(id = 1L, email = "user1@test.com", providerId = "u1", displayName = "User One", role = null)
        val user2 = User(id = 2L, email = "admin@test.com", providerId = "u2", displayName = "Admin", role = UserRole.ADMIN)

        val pageable = PageRequest.of(0, 10)
        given(userRepository.searchUsers("test", pageable)).willReturn(PageImpl(listOf(user1, user2), pageable, 2))
        given(musicFileRepository.countTracksByUserIdsAndStatus(listOf(1L, 2L), MusicFileStatus.ACTIVE))
            .willReturn(listOf(arrayOf(1L, 5L), arrayOf(2L, 12L)))

        val result = adminUserService.getUsers("test", pageable)

        assertEquals(2, result.content.size)
        val dto1 = result.content[0]
        assertEquals(1L, dto1.id)
        assertEquals("user1@test.com", dto1.email)
        assertNull(dto1.role)
        assertEquals(5L, dto1.trackCount)

        val dto2 = result.content[1]
        assertEquals(2L, dto2.id)
        assertEquals("admin@test.com", dto2.email)
        assertEquals("ADMIN", dto2.role)
        assertEquals(12L, dto2.trackCount)
    }

    @Test
    fun `updateRole successfully changes target user role`() {
        val user = User(id = 2L, email = "target@test.com", providerId = "t2", role = null)
        given(userRepository.findById(2L)).willReturn(Optional.of(user))
        given(musicFileRepository.countByUserIdAndStatus(2L, MusicFileStatus.ACTIVE)).willReturn(3L)

        val result = adminUserService.updateRole(adminUserId = 1L, targetUserId = 2L, newRole = UserRole.DOWNLOADER)

        assertEquals("DOWNLOADER", result.role)
        assertEquals(UserRole.DOWNLOADER, user.role)
        assertEquals(3L, result.trackCount)
    }

    @Test
    fun `updateRole throws exception when admin tries to demote self`() {
        val ex = assertThrows<IllegalArgumentException> {
            adminUserService.updateRole(adminUserId = 1L, targetUserId = 1L, newRole = null)
        }
        assertEquals("본인의 관리자 권한은 해제할 수 없습니다.", ex.message)
    }

    @Test
    fun `updateRole allows admin to update self if role remains ADMIN`() {
        val admin = User(id = 1L, email = "admin@test.com", providerId = "a1", role = UserRole.ADMIN)
        given(userRepository.findById(1L)).willReturn(Optional.of(admin))
        given(musicFileRepository.countByUserIdAndStatus(1L, MusicFileStatus.ACTIVE)).willReturn(10L)

        val result = adminUserService.updateRole(adminUserId = 1L, targetUserId = 1L, newRole = UserRole.ADMIN)

        assertEquals("ADMIN", result.role)
    }

    @Test
    fun `updateRole throws exception when user does not exist`() {
        given(userRepository.findById(999L)).willReturn(Optional.empty())

        val ex = assertThrows<NoSuchElementException> {
            adminUserService.updateRole(adminUserId = 1L, targetUserId = 999L, newRole = UserRole.DOWNLOADER)
        }
        assertEquals("User not found with id: 999", ex.message)
    }
}
