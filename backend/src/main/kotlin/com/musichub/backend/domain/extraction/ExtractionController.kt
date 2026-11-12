package com.musichub.backend.domain.extraction

import com.musichub.backend.global.security.UserPrincipal
import org.springframework.http.ResponseEntity
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
            startedAt = entity.startedAt,
            completedAt = entity.completedAt,
            createdAt = entity.createdAt
        )
    }
}

@RestController
@RequestMapping("/api/extractions")
class ExtractionController(
    private val extractionService: ExtractionService,
    private val extractionJobRepository: ExtractionJobRepository
) {

    @PostMapping
    fun requestExtraction(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestBody request: ExtractionRequest
    ): ResponseEntity<ExtractionJobDto> {
        val job = extractionService.createJob(user.id, request.sourceUrl)
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
