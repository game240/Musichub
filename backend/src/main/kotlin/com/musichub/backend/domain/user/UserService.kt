package com.musichub.backend.domain.user

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class UserService(
    private val userRepository: UserRepository
) {
    fun updateVolume(userId: Long, volume: Int): Int {
        require(volume in 0..100) { "Volume must be between 0 and 100" }
        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("User not found with id: $userId") }
        user.updateVolume(volume)
        return user.volume
    }
}
