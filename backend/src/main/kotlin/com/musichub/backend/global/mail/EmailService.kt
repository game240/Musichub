package com.musichub.backend.global.mail

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

interface EmailService {
    fun sendPasswordSetupCode(toEmail: String, code: String)
}

@Service
class ConsoleEmailService : EmailService {
    private val logger = LoggerFactory.getLogger(javaClass)

    override fun sendPasswordSetupCode(toEmail: String, code: String) {
        logger.info(
            """
            
            ======================================================================
            [Music Hub Email Verification]
            To: {}
            Subject: [Music Hub] 비밀번호 설정을 위한 인증번호입니다.
            ----------------------------------------------------------------------
            귀하의 비밀번호 설정을 위한 인증번호는 [{}] 입니다.
            이 인증번호는 10분간 유효합니다. 본인이 요청하지 않았다면 무시하세요.
            ======================================================================
            """.trimIndent(),
            toEmail,
            code
        )
    }
}
