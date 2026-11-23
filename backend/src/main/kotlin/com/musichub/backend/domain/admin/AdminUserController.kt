package com.musichub.backend.domain.admin

import com.musichub.backend.domain.user.UserRole
import com.musichub.backend.global.security.UserPrincipal
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.Instant

data class AdminUserDto(
    val id: Long,
    val email: String,
    val displayName: String?,
    val profileImageUrl: String?,
    val authProvider: String,
    val role: String?,
    val storageUsedBytes: Long,
    val trackCount: Long,
    val createdAt: Instant
)

data class UpdateUserRoleRequest(
    val role: UserRole? = null
)

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
class AdminUserController(
    private val adminUserService: AdminUserService
) {

    @GetMapping
    fun listUsers(
        @RequestParam(required = false) query: String?,
        @PageableDefault(size = 20, sort = ["createdAt"], direction = Sort.Direction.DESC) pageable: Pageable
    ): ResponseEntity<Page<AdminUserDto>> {
        val result = adminUserService.getUsers(query, pageable)
        return ResponseEntity.ok(result)
    }

    @PatchMapping("/{id}/role")
    fun updateUserRole(
        @AuthenticationPrincipal admin: UserPrincipal,
        @PathVariable id: Long,
        @RequestBody request: UpdateUserRoleRequest
    ): ResponseEntity<AdminUserDto> {
        val updated = adminUserService.updateRole(admin.id, id, request.role)
        return ResponseEntity.ok(updated)
    }
}
