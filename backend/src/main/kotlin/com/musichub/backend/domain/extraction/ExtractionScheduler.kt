package com.musichub.backend.domain.extraction

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionTemplate

@Component
class ExtractionScheduler(
    private val extractionJobRepository: ExtractionJobRepository,
    private val extractionService: ExtractionService,
    private val transactionTemplate: TransactionTemplate
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelay = 5000)
    fun scheduleNextJob() {
        val jobId = transactionTemplate.execute {
            val nextJobOptional = extractionJobRepository.findNextPendingJobForUpdate()
            if (nextJobOptional.isEmpty) {
                null
            } else {
                val job = nextJobOptional.get()
                job.markStarted()
                extractionJobRepository.save(job)
                job.id
            }
        } ?: return

        logger.info("스케줄러가 작업을 감지하여 비동기 실행을 위임합니다: jobId={}", jobId)
        extractionService.processJobAsync(jobId)
    }
}
