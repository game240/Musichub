package com.musichub.backend.domain.user

import org.springframework.stereotype.Component
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import kotlin.random.Random

@Component
class PasswordSetupVerificationManager {

    data class VerificationEntry(
        val code: String,
        val createdAt: Instant = Instant.now(),
        val expiresAt: Instant = Instant.now().plus(Duration.ofMinutes(5)),
        var attempts: Int = 0
    )

    private val storage = ConcurrentHashMap<Long, VerificationEntry>()

    fun createCode(userId: Long): String {
        val existing = storage[userId]
        if (existing != null && Instant.now().isBefore(existing.createdAt.plusSeconds(60))) {
            throw IllegalStateException("인증번호가 이미 발송되었습니다. 1분 후에 다시 시도해 주세요.")
        }

        val code = Random.nextInt(100000, 1000000).toString()
        storage[userId] = VerificationEntry(code = code)
        return code
    }

    fun verifyCode(userId: Long, inputCode: String) {
        val entry = storage[userId]
            ?: throw IllegalArgumentException("인증번호가 만료되었거나 요청되지 않았습니다. 다시 요청해 주세요.")

        if (Instant.now().isAfter(entry.expiresAt)) {
            storage.remove(userId)
            throw IllegalArgumentException("인증번호 유효 시간이 만료되었습니다. 다시 요청해 주세요.")
        }

        if (entry.code != inputCode.trim()) {
            entry.attempts++
            if (entry.attempts >= 5) {
                storage.remove(userId)
                throw IllegalArgumentException("인증번호 입력 횟수(5회)를 초과하여 파기되었습니다. 다시 요청해 주세요.")
            }
            throw IllegalArgumentException("인증번호가 일치하지 않습니다. (남은 시도: ${5 - entry.attempts}회)")
        }

        // 검증 성공 -> 일회용 파기
        storage.remove(userId)
    }

    fun clear(userId: Long) {
        storage.remove(userId)
    }
}
