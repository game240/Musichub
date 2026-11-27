package com.musichub.backend.domain.auth

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Duration
import java.time.Instant

class SignupVerificationManagerTest {

    private lateinit var manager: SignupVerificationManager

    @BeforeEach
    fun setUp() {
        manager = SignupVerificationManager()
    }

    @Test
    fun `createCode generates 6 digit code and allows verification`() {
        val email = "user@example.com"
        val code = manager.createCode(email)

        assertEquals(6, code.length)
        assertTrue(code.all { it.isDigit() })

        assertDoesNotThrow {
            manager.verifyCode(email, code)
        }
    }

    @Test
    fun `createCode throws IllegalStateException when requested again within 1 minute`() {
        val email = "user@example.com"
        manager.createCode(email)

        val exception = assertThrows(IllegalStateException::class.java) {
            manager.createCode(email)
        }
        assertTrue(exception.message!!.contains("1분 후에 다시 시도해 주세요"))
    }

    @Test
    fun `verifyCode is case-insensitive for email`() {
        val email = "User@Example.COM"
        val code = manager.createCode(email)

        assertDoesNotThrow {
            manager.verifyCode("user@example.com", code)
        }
    }

    @Test
    fun `verifyCode throws IllegalArgumentException when code is not requested`() {
        val exception = assertThrows(IllegalArgumentException::class.java) {
            manager.verifyCode("unrequested@example.com", "123456")
        }
        assertTrue(exception.message!!.contains("인증번호가 만료되었거나 요청되지 않았습니다"))
    }

    @Test
    fun `verifyCode is single use and throws on second attempt`() {
        val email = "user@example.com"
        val code = manager.createCode(email)

        manager.verifyCode(email, code)

        assertThrows(IllegalArgumentException::class.java) {
            manager.verifyCode(email, code)
        }
    }

    @Test
    fun `verifyCode throws and increments attempts on incorrect code, destroys after 5 attempts`() {
        val email = "user@example.com"
        manager.createCode(email)

        for (i in 1..4) {
            val ex = assertThrows(IllegalArgumentException::class.java) {
                manager.verifyCode(email, "000000")
            }
            assertTrue(ex.message!!.contains("남은 시도: ${5 - i}회"))
        }

        // 5th attempt -> exceeded and removed
        val ex5 = assertThrows(IllegalArgumentException::class.java) {
            manager.verifyCode(email, "000000")
        }
        assertTrue(ex5.message!!.contains("5회)를 초과하여 파기되었습니다"))

        // Next attempt -> entry not found
        val exNext = assertThrows(IllegalArgumentException::class.java) {
            manager.verifyCode(email, "000000")
        }
        assertTrue(exNext.message!!.contains("인증번호가 만료되었거나 요청되지 않았습니다"))
    }
}
