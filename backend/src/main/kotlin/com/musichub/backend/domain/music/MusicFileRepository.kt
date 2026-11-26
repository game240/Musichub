package com.musichub.backend.domain.music

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.Optional

interface MusicFileRepository : JpaRepository<MusicFile, Long> {
    fun findByIdAndUserId(id: Long, userId: Long): Optional<MusicFile>

    fun findAllByIdInAndUserIdAndStatus(
        ids: Collection<Long>,
        userId: Long,
        status: MusicFileStatus
    ): List<MusicFile>

    fun findAllByUserIdAndStatus(
        userId: Long,
        status: MusicFileStatus,
        pageable: Pageable
    ): Page<MusicFile>

    @Query(
        value = """
            SELECT * FROM music_file
            WHERE user_id = :userId AND status = 'ACTIVE'
            ORDER BY
                CASE
                    WHEN TRIM(COALESCE(title, file_name)) ~ '^[가-힣ㄱ-ㅎ]' THEN 1
                    WHEN TRIM(COALESCE(title, file_name)) ~* '^[a-z]' THEN 2
                    WHEN TRIM(COALESCE(title, file_name)) ~ '^[0-9]' THEN 3
                    ELSE 4
                END ASC,
                LOWER(TRIM(COALESCE(title, file_name))) ASC,
                id ASC
        """,
        countQuery = "SELECT COUNT(*) FROM music_file WHERE user_id = :userId AND status = 'ACTIVE'",
        nativeQuery = true
    )
    fun findAllByUserIdAndStatusOrderByKoreanPriority(
        userId: Long,
        pageable: Pageable
    ): Page<MusicFile>

    @Query("SELECT COALESCE(SUM(m.fileSize), 0) FROM MusicFile m WHERE m.user.id = :userId")
    fun sumFileSizeByUserId(userId: Long): Long

    @Query("SELECT COALESCE(SUM(m.fileSize), 0) FROM MusicFile m")
    fun sumTotalFileSize(): Long

    fun countByUserIdAndStatus(userId: Long, status: MusicFileStatus): Long

    @Query("SELECT m.user.id, COUNT(m) FROM MusicFile m WHERE m.status = :status AND m.user.id IN :userIds GROUP BY m.user.id")
    fun countTracksByUserIdsAndStatus(userIds: Collection<Long>, status: MusicFileStatus): List<Array<Any>>

    @Query("""
        SELECT DISTINCT TRIM(m.artist)
        FROM MusicFile m
        WHERE m.user.id = :userId
          AND m.status = :status
          AND m.artist IS NOT NULL
          AND TRIM(m.artist) != ''
        ORDER BY TRIM(m.artist) ASC
    """)
    fun findDistinctArtistsByUserIdAndStatus(
        userId: Long,
        status: MusicFileStatus = MusicFileStatus.ACTIVE
    ): List<String>

    @Query("""
        SELECT DISTINCT TRIM(m.album)
        FROM MusicFile m
        WHERE m.user.id = :userId
          AND m.status = :status
          AND m.album IS NOT NULL
          AND TRIM(m.album) != ''
        ORDER BY TRIM(m.album) ASC
    """)
    fun findDistinctAlbumsByUserIdAndStatus(
        userId: Long,
        status: MusicFileStatus = MusicFileStatus.ACTIVE
    ): List<String>

    @Query("""
        SELECT DISTINCT TRIM(m.album)
        FROM MusicFile m
        WHERE m.user.id = :userId
          AND m.status = :status
          AND m.album IS NOT NULL
          AND TRIM(m.album) != ''
          AND LOWER(TRIM(m.artist)) = LOWER(TRIM(:artist))
        ORDER BY TRIM(m.album) ASC
    """)
    fun findDistinctAlbumsByUserIdAndArtistAndStatus(
        userId: Long,
        artist: String,
        status: MusicFileStatus = MusicFileStatus.ACTIVE
    ): List<String>
}
