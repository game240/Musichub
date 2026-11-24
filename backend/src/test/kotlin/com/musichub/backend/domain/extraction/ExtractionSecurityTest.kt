package com.musichub.backend.domain.extraction

import com.musichub.backend.domain.user.UserRole
import com.musichub.backend.global.exception.GlobalExceptionHandler
import com.musichub.backend.global.security.UserPrincipal
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock
import org.springframework.http.HttpStatus
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.security.access.AccessDeniedException

class ExtractionSecurityTest {

    private val exceptionHandler = GlobalExceptionHandler()

    @Test
    @DisplayName("일반 사용자(role: null)는 ROLE_DOWNLOADER 또는 ROLE_ADMIN 권한을 갖지 않는다")
    fun `regular user does not have extraction roles`() {
        val userPrincipal = UserPrincipal(id = 1L, email = "user@test.com", role = null)
        val authorityStrings = userPrincipal.authorities.map { it.authority }

        assertTrue(authorityStrings.contains("ROLE_USER"))
        assertFalse(authorityStrings.contains("ROLE_ADMIN"))
        assertFalse(authorityStrings.contains("ROLE_DOWNLOADER"))
    }

    @Test
    @DisplayName("DOWNLOADER 및 ADMIN 사용자는 추출 권한을 갖는다")
    fun `downloader and admin have extraction roles`() {
        val downloaderPrincipal = UserPrincipal(id = 2L, email = "dl@test.com", role = UserRole.DOWNLOADER)
        val adminPrincipal = UserPrincipal(id = 3L, email = "admin@test.com", role = UserRole.ADMIN)

        assertTrue(downloaderPrincipal.authorities.any { it.authority == "ROLE_DOWNLOADER" })
        assertTrue(adminPrincipal.authorities.any { it.authority == "ROLE_ADMIN" })
    }

    @Test
    @DisplayName("비인가 사용자가 /api/extractions 접근 시 403이 아닌 Stealth 404 Not Found 반환")
    fun `accessDenied on extractions endpoints returns 404 Not Found`() {
        val request = MockHttpServletRequest("POST", "/api/extractions")
        val exception = AccessDeniedException("Access is denied")

        val response = exceptionHandler.handleAccessDenied(exception, request)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
        assertEquals(404, response.body?.status)
        assertEquals("Not Found", response.body?.error)
        assertEquals("요청하신 리소스를 찾을 수 없습니다.", response.body?.message)
    }

    @Test
    @DisplayName("기타 보호 엔드포인트(/api/admin 등) 접근 시에는 표준 403 Forbidden 반환")
    fun `accessDenied on other endpoints returns 403 Forbidden`() {
        val request = MockHttpServletRequest("GET", "/api/admin/users")
        val exception = AccessDeniedException("Access is denied")

        val response = exceptionHandler.handleAccessDenied(exception, request)

        assertEquals(HttpStatus.FORBIDDEN, response.statusCode)
        assertEquals(403, response.body?.status)
        assertEquals("Forbidden", response.body?.error)
    }
}
