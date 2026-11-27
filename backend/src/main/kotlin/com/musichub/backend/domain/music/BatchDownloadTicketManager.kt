package com.musichub.backend.domain.music

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class BatchDownloadTicket(
    val ticketId: String,
    val userId: Long,
    val musicFileIds: List<Long>,
    val zipFilename: String,
    val createdAt: Instant = Instant.now(),
    val expiresAt: Instant = createdAt.plusSeconds(60)
)

@Component
class BatchDownloadTicketManager {
    private val tickets = ConcurrentHashMap<String, BatchDownloadTicket>()

    fun createTicket(
        userId: Long,
        musicFileIds: List<Long>,
        zipFilename: String,
        ttlSeconds: Long = 60
    ): String {
        val ticketId = UUID.randomUUID().toString().replace("-", "")
        val now = Instant.now()
        tickets[ticketId] = BatchDownloadTicket(
            ticketId = ticketId,
            userId = userId,
            musicFileIds = musicFileIds,
            zipFilename = zipFilename,
            createdAt = now,
            expiresAt = now.plusSeconds(ttlSeconds)
        )
        return ticketId
    }

    fun consumeTicket(ticketId: String): BatchDownloadTicket? {
        val ticket = tickets.remove(ticketId) ?: return null
        if (Instant.now().isAfter(ticket.expiresAt)) {
            return null
        }
        return ticket
    }

    fun getTicket(ticketId: String): BatchDownloadTicket? {
        val ticket = tickets[ticketId] ?: return null
        if (Instant.now().isAfter(ticket.expiresAt)) {
            tickets.remove(ticketId)
            return null
        }
        return ticket
    }

    @Scheduled(fixedRate = 60000)
    fun purgeExpired() {
        val now = Instant.now()
        tickets.entries.removeIf { now.isAfter(it.value.expiresAt) }
    }

    fun clearAll() {
        tickets.clear()
    }
}
