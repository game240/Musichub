package com.musichub.backend.domain.user

import com.musichub.backend.global.security.UserPrincipal
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

data class UpdateVolumeRequest(
    val volume: Int = 100
)

data class VolumeResponse(
    val volume: Int
)

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService
) {
    @PatchMapping("/me/volume")
    fun updateVolume(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestBody request: UpdateVolumeRequest
    ): ResponseEntity<VolumeResponse> {
        val updatedVolume = userService.updateVolume(principal.id, request.volume)
        return ResponseEntity.ok(VolumeResponse(volume = updatedVolume))
    }
}
