package com.musichub.backend.global.mail

import jakarta.mail.Session
import jakarta.mail.internet.MimeMessage
import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.mock
import org.mockito.BDDMockito.never
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willThrow
import org.springframework.mail.MailSendException
import org.springframework.mail.javamail.JavaMailSender
import java.util.Properties

class SmtpEmailServiceTest {

    private val mailSender: JavaMailSender = mock(JavaMailSender::class.java)

    @Test
    fun `when mailUsername is blank, falls back to logging without sending mail`() {
        val service = SmtpEmailService(mailSender, "")

        assertDoesNotThrow {
            service.sendPasswordSetupCode("test@example.com", "123456")
        }

        then(mailSender).should(never()).send(org.mockito.ArgumentMatchers.any(MimeMessage::class.java))
    }

    @Test
    fun `when mailUsername is present, creates and sends MimeMessage`() {
        val service = SmtpEmailService(mailSender, "sender@example.com")
        val mimeMessage = MimeMessage(Session.getInstance(Properties()))
        given(mailSender.createMimeMessage()).willReturn(mimeMessage)

        assertDoesNotThrow {
            service.sendPasswordSetupCode("recipient@example.com", "654321")
        }

        then(mailSender).should().send(mimeMessage)
    }

    @Test
    fun `when mail sending fails, throws IllegalStateException`() {
        val service = SmtpEmailService(mailSender, "sender@example.com")
        val mimeMessage = MimeMessage(Session.getInstance(Properties()))
        given(mailSender.createMimeMessage()).willReturn(mimeMessage)
        willThrow(MailSendException("Connection refused")).given(mailSender).send(mimeMessage)

        assertThrows(IllegalStateException::class.java) {
            service.sendPasswordSetupCode("recipient@example.com", "654321")
        }
    }

    @Test
    fun `sendPasswordChangeCode creates and sends MimeMessage with change purpose`() {
        val service = SmtpEmailService(mailSender, "sender@example.com")
        val mimeMessage = MimeMessage(Session.getInstance(Properties()))
        given(mailSender.createMimeMessage()).willReturn(mimeMessage)

        assertDoesNotThrow {
            service.sendPasswordChangeCode("recipient@example.com", "789012")
        }

        then(mailSender).should().send(mimeMessage)
    }

    @Test
    fun `sendSignupVerificationCode creates and sends MimeMessage with signup purpose`() {
        val service = SmtpEmailService(mailSender, "sender@example.com")
        val mimeMessage = MimeMessage(Session.getInstance(Properties()))
        given(mailSender.createMimeMessage()).willReturn(mimeMessage)

        assertDoesNotThrow {
            service.sendSignupVerificationCode("recipient@example.com", "123456")
        }

        then(mailSender).should().send(mimeMessage)
    }
}
