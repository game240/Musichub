package com.musichub.backend.domain.user

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class PasswordSetupVerificationManagerTest {

    private lateinit var manager: PasswordSetupVerificationManager

    @BeforeEach
    fun setUp() {
        manager = PasswordSetupVerificationManager()
    }

    @Test
    fun `createCode generates 6-digit code and verifyCode succeeds with correct code`() {
        val code = manager.createCode(1L)

        assertEquals(6, code.length)
        assertTrue(code.all { it.isDigit() })

        // 검증 성공
        assertDoesNotThrow {
            manager.verifyCode(1L, code)
        }

        // 일회용이므로 재검증 시 실패
        val ex = assertThrows<IllegalArgumentException> {
            manager.verifyCode(1L, code)
        }
        assertEquals("인증번호가 만료되었거나 요청되지 않았습니다. 다시 요청해 주세요.", ex.message)
    }

    @Test
    fun `createCode throws IllegalStateException when requested within 1 minute`() {
        manager.createCode(1L)

        val ex = assertThrows<IllegalStateException> {
            manager.createCode(1L)
        }
        assertEquals("인증번호가 이미 발송되었습니다. 1분 후에 다시 시도해 주세요.", ex.message)
    }

    @Test
    fun `verifyCode throws IllegalArgumentException when code is wrong and destroys after 5 attempts`() {
        val code = manager.createCode(1L)
        val wrongCode = if (code == "111111") "222222" else "111111"

        // 1~4회 실패
        for (attempt in 1..4) {
            val ex = assertThrows<IllegalArgumentException> {
                manager.verifyCode(1L, wrongCode)
            }
            assertTrue(ex.message!!.contains("남은 시도: ${5 - attempt}회"))
        }

        // 5회째 실패 -> 파기
        val finalEx = assertThrows<IllegalArgumentException> {
            manager.verifyCode(1L, wrongCode)
        }
        assertEquals("인증번호 입력 횟수(5회)를 초과하여 파기되었습니다. 다시 요청해 주세요.", finalEx.message)

        // 이후 올바른 코드를 넣어도 이미 파기되었으므로 요청되지 않음 예외 발생
        val exAfterDestruction = assertThrows<IllegalArgumentException> {
            manager.verifyCode(1L, code)
        }
        assertEquals("인증번호가 만료되었거나 요청되지 않았습니다. 다시 요청해 주세요.", exAfterDestruction.message)
    }
}
