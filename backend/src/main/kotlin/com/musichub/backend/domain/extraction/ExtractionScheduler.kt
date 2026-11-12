package com.musichub.backend.domain.extraction

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class ExtractionScheduler(
    private val extractionJobRepository: ExtractionJobRepository,
    private val extractionService: ExtractionService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelay = 5000)
    @Transactional
    fun scheduleNextJob() {
        val nextJobOptional = extractionJobRepository.findNextPendingJobForUpdate()
        if (nextJobOptional.isEmpty) return

        val job = nextJobOptional.get()
        job.markStarted()
        extractionJobRepository.save(job)

        logger.info("스케줄러가 작업을 감지하여 비동기 실행을 위임합니다: jobId={}", job.id)
        extractionService.processJobAsync(job.id)
    }
}
