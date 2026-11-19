package com.musichub.backend.domain.music

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.Optional

interface MusicFileRepository : JpaRepository<MusicFile, Long> {
    fun findByIdAndUserId(id: Long, userId: Long): Optional<MusicFile>

    fun findAllByUserIdAndStatus(
        userId: Long,
        status: MusicFileStatus,
        pageable: Pageable
    ): Page<MusicFile>

    @Query("SELECT COALESCE(SUM(m.fileSize), 0) FROM MusicFile m WHERE m.user.id = :userId")
    fun sumFileSizeByUserId(userId: Long): Long

    @Query("SELECT COALESCE(SUM(m.fileSize), 0) FROM MusicFile m")
    fun sumTotalFileSize(): Long
}
