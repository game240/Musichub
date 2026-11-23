package com.musichub.backend.domain.extraction

import com.musichub.backend.global.security.UserPrincipal
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.Instant

data class ExtractionRequest(
    val sourceUrl: String
)

data class ExtractionJobDto(
    val id: Long,
    val sourceUrl: String,
    val status: ExtractionJobStatus,
    val attempts: Int,
    val errorMessage: String?,
    val musicFileId: Long?,
    val musicFileTitle: String?,
    val musicFileArtist: String?,
    val musicFileDurationMs: Long?,
    val startedAt: Instant?,
    val completedAt: Instant?,
    val createdAt: Instant
) {
    companion object {
        fun from(entity: ExtractionJob): ExtractionJobDto = ExtractionJobDto(
            id = entity.id,
            sourceUrl = entity.sourceUrl,
            status = entity.status,
            attempts = entity.attempts,
            errorMessage = entity.errorMessage,
            musicFileId = entity.musicFile?.id,
            musicFileTitle = entity.musicFile?.title,
            musicFileArtist = entity.musicFile?.artist,
            musicFileDurationMs = entity.musicFile?.durationMs,
            startedAt = entity.startedAt,
            completedAt = entity.completedAt,
            createdAt = entity.createdAt
        )
    }
}

@RestController
@RequestMapping("/api/extractions")
@PreAuthorize("hasAnyRole('ADMIN', 'DOWNLOADER')")
class ExtractionController(
    private val extractionService: ExtractionService,
    private val extractionJobRepository: ExtractionJobRepository
) {

    companion object {
        private val YOUTUBE_URL_REGEX = Regex(
            "^(https?://)?(www\\.|m\\.|music\\.)?(youtube\\.com/(watch\\?v=|shorts/|embed/)|youtu\\.be/)[a-zA-Z0-9_-]+.*$",
            RegexOption.IGNORE_CASE
        )
    }

    @PostMapping
    fun requestExtraction(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestBody request: ExtractionRequest
    ): ResponseEntity<ExtractionJobDto> {
        val trimmedUrl = request.sourceUrl.trim()
        if (trimmedUrl.isBlank()) {
            throw IllegalArgumentException("YouTube 영상 URL을 입력해주세요.")
        }
        if (!YOUTUBE_URL_REGEX.matches(trimmedUrl)) {
            throw IllegalArgumentException("올바른 YouTube 영상 URL을 입력해주세요. (예: https://www.youtube.com/watch?v=...)")
        }

        val job = extractionService.createJob(user.id, trimmedUrl)
        return ResponseEntity.accepted().body(ExtractionJobDto.from(job))
    }

    @GetMapping("/{id}")
    fun getExtractionStatus(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<ExtractionJobDto> {
        val job = extractionJobRepository.findByIdAndUserId(id, user.id)
            .orElseThrow { NoSuchElementException("추출 작업을 찾을 수 없습니다.") }

        return ResponseEntity.ok(ExtractionJobDto.from(job))
    }

    @GetMapping
    fun listMyExtractions(
        @AuthenticationPrincipal user: UserPrincipal
    ): ResponseEntity<List<ExtractionJobDto>> {
        val jobs = extractionJobRepository.findAllByUserIdOrderByCreatedAtDesc(user.id)
            .map { ExtractionJobDto.from(it) }
        return ResponseEntity.ok(jobs)
    }
}
