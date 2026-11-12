package com.musichub.backend.domain.extraction

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.Optional

interface ExtractionJobRepository : JpaRepository<ExtractionJob, Long> {
    fun findByIdAndUserId(id: Long, userId: Long): Optional<ExtractionJob>

    @Query(
        value = """
            SELECT * FROM extraction_job
            WHERE status = 'PENDING'
              AND (scheduled_at IS NULL OR scheduled_at <= NOW())
              AND attempts < max_attempts
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true
    )
    fun findNextPendingJobForUpdate(): Optional<ExtractionJob>

    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<ExtractionJob>
}
