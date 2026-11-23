package com.musichub.backend.domain.admin

import com.musichub.backend.domain.music.MusicFileRepository
import com.musichub.backend.domain.music.MusicFileStatus
import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRepository
import com.musichub.backend.domain.user.UserRole
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class AdminUserService(
    private val userRepository: UserRepository,
    private val musicFileRepository: MusicFileRepository
) {

    @Transactional(readOnly = true)
    fun getUsers(query: String?, pageable: Pageable): Page<AdminUserDto> {
        val cleanQuery = query?.trim()?.ifEmpty { null }
        val userPage = userRepository.searchUsers(cleanQuery, pageable)
        val userIds = userPage.content.map { it.id }

        val trackCountsByUserId: Map<Long, Long> = if (userIds.isNotEmpty()) {
            musicFileRepository.countTracksByUserIdsAndStatus(userIds, MusicFileStatus.ACTIVE)
                .associate { row -> (row[0] as Long) to (row[1] as Long) }
        } else {
            emptyMap()
        }

        return userPage.map { user ->
            toDto(user, trackCountsByUserId[user.id] ?: 0L)
        }
    }

    fun updateRole(adminUserId: Long, targetUserId: Long, newRole: UserRole?): AdminUserDto {
        if (adminUserId == targetUserId && newRole != UserRole.ADMIN) {
            throw IllegalArgumentException("본인의 관리자 권한은 해제할 수 없습니다.")
        }

        val user = userRepository.findById(targetUserId)
            .orElseThrow { NoSuchElementException("User not found with id: $targetUserId") }

        user.role = newRole
        val trackCount = musicFileRepository.countByUserIdAndStatus(user.id, MusicFileStatus.ACTIVE)
        return toDto(user, trackCount)
    }

    private fun toDto(user: User, trackCount: Long): AdminUserDto {
        return AdminUserDto(
            id = user.id,
            email = user.email,
            displayName = user.displayName,
            profileImageUrl = user.profileImageUrl,
            authProvider = user.authProvider.name,
            role = user.role?.name,
            storageUsedBytes = user.storageUsedBytes,
            trackCount = trackCount,
            createdAt = user.createdAt
        )
    }
}
