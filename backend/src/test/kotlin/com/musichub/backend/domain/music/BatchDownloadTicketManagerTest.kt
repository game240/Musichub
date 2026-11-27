package com.musichub.backend.domain.music

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.time.Instant

class BatchDownloadTicketManagerTest {

    private lateinit var manager: BatchDownloadTicketManager

    @BeforeEach
    fun setUp() {
        manager = BatchDownloadTicketManager()
    }

    @Test
    @DisplayName("티켓 생성 후 단 1회만 정상 소비(consume)되며 즉시 소멸한다")
    fun `consumeTicket returns ticket once and invalidates it`() {
        val ticketId = manager.createTicket(
            userId = 1L,
            musicFileIds = listOf(10L, 20L),
            zipFilename = "test.zip",
            ttlSeconds = 60
        )

        assertNotNull(ticketId)
        assertTrue(ticketId.isNotBlank())

        val consumed = manager.consumeTicket(ticketId)
        assertNotNull(consumed)
        assertEquals(1L, consumed!!.userId)
        assertEquals(listOf(10L, 20L), consumed.musicFileIds)
        assertEquals("test.zip", consumed.zipFilename)

        // 2번째 소비 시 null 반환 (일회용 보장)
        val secondConsume = manager.consumeTicket(ticketId)
        assertNull(secondConsume)
    }

    @Test
    @DisplayName("존재하지 않는 티켓 ID로 소비 시도 시 null을 반환한다")
    fun `consumeTicket with non-existent id returns null`() {
        val consumed = manager.consumeTicket("non-existent-ticket-id")
        assertNull(consumed)
    }

    @Test
    @DisplayName("만료 시간이 지난 티켓은 소비 시도시 null을 반환한다")
    fun `consumeTicket with expired ticket returns null`() {
        val ticketId = manager.createTicket(
            userId = 1L,
            musicFileIds = listOf(10L),
            zipFilename = "expired.zip",
            ttlSeconds = -10 // 이미 만료됨
        )

        val consumed = manager.consumeTicket(ticketId)
        assertNull(consumed)
    }

    @Test
    @DisplayName("purgeExpired 호출 시 만료된 티켓들이 메모리에서 제거된다")
    fun `purgeExpired removes expired tickets`() {
        val validTicket = manager.createTicket(
            userId = 1L,
            musicFileIds = listOf(1L),
            zipFilename = "valid.zip",
            ttlSeconds = 60
        )
        val expiredTicket = manager.createTicket(
            userId = 1L,
            musicFileIds = listOf(2L),
            zipFilename = "expired.zip",
            ttlSeconds = -5
        )

        manager.purgeExpired()

        assertNotNull(manager.getTicket(validTicket))
        assertNull(manager.getTicket(expiredTicket))
    }
}
