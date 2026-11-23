package com.musichub.backend.global.mail

import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

interface EmailService {
    fun sendPasswordSetupCode(toEmail: String, code: String)
    fun sendPasswordChangeCode(toEmail: String, code: String)
}

@Service
class SmtpEmailService(
    private val mailSender: JavaMailSender,
    @Value("\${spring.mail.username:}") private val mailUsername: String
) : EmailService {
    private val logger = LoggerFactory.getLogger(javaClass)

    override fun sendPasswordSetupCode(toEmail: String, code: String) {
        sendVerificationMail(toEmail, code, "설정")
    }

    override fun sendPasswordChangeCode(toEmail: String, code: String) {
        sendVerificationMail(toEmail, code, "변경")
    }

    private fun sendVerificationMail(toEmail: String, code: String, purpose: String) {
        if (mailUsername.isBlank()) {
            logger.warn("SMTP 발신 계정(spring.mail.username)이 설정되지 않아 콘솔 로그로 대체합니다.")
            logVerificationCode(toEmail, code, purpose)
            return
        }

        try {
            val message: MimeMessage = mailSender.createMimeMessage()
            val helper = MimeMessageHelper(message, true, "UTF-8")

            helper.setFrom(mailUsername, "Music Hub")
            helper.setTo(toEmail)
            helper.setSubject("[Music Hub] 비밀번호 ${purpose}을 위한 인증번호입니다")

            val htmlContent = """
                <div style="max-width: 500px; margin: 0 auto; padding: 32px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1011; color: #f5f5f5; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Music Hub</h2>
                        <p style="color: #888888; font-size: 13px; margin-top: 6px;">클라우드 음원 스트리밍 보관함</p>
                    </div>
                    <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
                        <p style="color: #d1d5db; font-size: 14px; margin: 0 0 16px 0;">비밀번호 ${purpose}을 위한 인증번호입니다.</p>
                        <div style="display: inline-block; padding: 12px 28px; background-color: rgba(94, 106, 210, 0.15); border: 1px solid rgba(94, 106, 210, 0.4); border-radius: 10px; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #8590ea;">
                            $code
                        </div>
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; margin-bottom: 0;">인증번호는 <strong>5분간</strong> 유효합니다.</p>
                    </div>
                    <p style="color: #6b7280; font-size: 12px; text-align: center; line-height: 1.5; margin: 0;">
                        본인이 요청하지 않은 경우 이 메일을 무시하셔도 됩니다.<br />
                        타인에게 인증번호를 절대 공유하지 마세요.
                    </p>
                </div>
            """.trimIndent()

            helper.setText(htmlContent, true)

            mailSender.send(message)
            logger.info("성공적으로 인증 메일을 발송했습니다: to={}, purpose={}", toEmail, purpose)
        } catch (e: Exception) {
            logger.error("SMTP 이메일 발송 실패: to={}, purpose={}, error={}", toEmail, purpose, e.message, e)
            logVerificationCode(toEmail, code, purpose)
            throw IllegalStateException("인증 메일 발송에 실패했습니다: ${e.message}")
        }
    }

    private fun logVerificationCode(toEmail: String, code: String, purpose: String) {
        logger.info(
            """
            
            ======================================================================
            [Music Hub Email Verification]
            To: {}
            Subject: [Music Hub] 비밀번호 ${purpose}을 위한 인증번호입니다.
            ----------------------------------------------------------------------
            귀하의 비밀번호 ${purpose}을 위한 인증번호는 [{}] 입니다.
            이 인증번호는 5분간 유효합니다.
            ======================================================================
            """.trimIndent(),
            toEmail,
            code
        )
    }
}
