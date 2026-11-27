package com.musichub.backend.domain.extraction

import com.musichub.backend.domain.music.MusicFile
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.Optional

interface ExtractionJobRepository : JpaRepository<ExtractionJob, Long> {
    fun findByIdAndUserId(id: Long, userId: Long): Optional<ExtractionJob>

    @Query("SELECT j.status FROM ExtractionJob j WHERE j.id = :id")
    fun findStatusById(@Param("id") id: Long): Optional<ExtractionJobStatus>

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

    @Modifying
    @Query("DELETE FROM ExtractionJob j WHERE j.user.id = :userId AND j.status IN :statuses")
    fun deleteByUserIdAndStatusIn(
        @Param("userId") userId: Long,
        @Param("statuses") statuses: Collection<ExtractionJobStatus>
    ): Int

    @Modifying(clearAutomatically = true)
    @Query("""
        UPDATE ExtractionJob j
        SET j.status = :targetStatus,
            j.updatedAt = :now
        WHERE j.id = :jobId
          AND j.status != com.musichub.backend.domain.extraction.ExtractionJobStatus.CANCELLED
    """)
    fun updateStatusIfActive(
        @Param("jobId") jobId: Long,
        @Param("targetStatus") targetStatus: ExtractionJobStatus,
        @Param("now") now: Instant
    ): Int

    @Modifying(clearAutomatically = true)
    @Query("""
        UPDATE ExtractionJob j
        SET j.status = com.musichub.backend.domain.extraction.ExtractionJobStatus.COMPLETED,
            j.musicFile = :musicFile,
            j.completedAt = :now,
            j.updatedAt = :now
        WHERE j.id = :jobId
          AND j.status != com.musichub.backend.domain.extraction.ExtractionJobStatus.CANCELLED
    """)
    fun updateCompletedIfActive(
        @Param("jobId") jobId: Long,
        @Param("musicFile") musicFile: MusicFile,
        @Param("now") now: Instant
    ): Int
}
