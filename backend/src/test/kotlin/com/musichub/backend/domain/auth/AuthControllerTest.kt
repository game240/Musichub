package com.musichub.backend.domain.auth

import com.musichub.backend.domain.user.User
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mockito.mock
import org.springframework.http.HttpStatus
import org.springframework.mock.web.MockHttpServletResponse

class AuthControllerTest {

    private lateinit var authService: AuthService
    private lateinit var authController: AuthController

    @BeforeEach
    fun setUp() {
        authService = mock(AuthService::class.java)
        authController = AuthController(authService, false)
    }

    @Test
    fun `requestSignupCode calls authService requestSignupVerification and returns 200`() {
        val request = SignupVerificationRequest(email = "test@example.com")

        val response = authController.requestSignupCode(request)

        assertEquals(HttpStatus.OK, response.statusCode)
        then(authService).should().requestSignupVerification("test@example.com")
    }

    @Test
    fun `register calls authService register and returns 200 with tokens and cookie`() {
        val request = LocalRegisterRequest(
            email = "test@example.com",
            verificationCode = "123456",
            password = "password123!",
            displayName = "테스터"
        )
        val mockUser = User(
            id = 1L,
            email = "test@example.com",
            providerId = "test@example.com",
            displayName = "테스터"
        )
        val tokenResult = TokenResult(
            accessToken = "access-token-123",
            refreshToken = "refresh-token-456",
            expiresIn = 900L,
            user = mockUser
        )

        given(authService.register(request, "MockAgent")).willReturn(tokenResult)

        val responseServlet = MockHttpServletResponse()
        val response = authController.register(request, "MockAgent", responseServlet)

        assertEquals(HttpStatus.OK, response.statusCode)
        assertEquals("access-token-123", response.body?.accessToken)
        assertEquals("test@example.com", response.body?.user?.email)
        assertNotNull(responseServlet.getHeader("Set-Cookie"))
        assertTrue(responseServlet.getHeader("Set-Cookie")!!.contains("refresh_token=refresh-token-456"))
    }
}
