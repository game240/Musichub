package com.musichub.backend.domain.extraction

import com.musichub.backend.domain.metadata.MetadataReader
import com.musichub.backend.domain.music.MusicFile
import com.musichub.backend.domain.music.MusicFileRepository
import com.musichub.backend.domain.music.MusicFileStatus
import com.musichub.backend.domain.storage.StorageService
import com.musichub.backend.domain.user.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.ByteArrayInputStream
import java.io.File
import java.nio.file.Files
import java.time.Instant
import java.util.*
import java.util.concurrent.ConcurrentHashMap

@Service
class ExtractionService(
    private val extractionJobRepository: ExtractionJobRepository,
    private val userRepository: UserRepository,
    private val musicFileRepository: MusicFileRepository,
    private val storageService: StorageService,
    private val metadataReader: MetadataReader,
    private val mediaExtractor: MediaExtractor
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val activeProcesses = ConcurrentHashMap<Long, Process>()
    private val cancelledJobIds = ConcurrentHashMap.newKeySet<Long>()

    companion object {
        private const val MAX_STORAGE_BYTES = 2L * 1024 * 1024 * 1024 // 2.0 GB
        private const val ESTIMATED_TRACK_BYTES = 10L * 1024 * 1024 // 10 MB
    }

    @Transactional
    fun createJob(userId: Long, sourceUrl: String): ExtractionJob {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("사용자를 찾을 수 없습니다.") }

        if (user.storageUsedBytes + ESTIMATED_TRACK_BYTES > MAX_STORAGE_BYTES) {
            throw IllegalStateException("보관함 용량이 부족합니다. 저장 공간을 확보한 후 다시 시도해주세요.")
        }

        val job = ExtractionJob(
            user = user,
            sourceUrl = sourceUrl,
            status = ExtractionJobStatus.PENDING
        )
        return extractionJobRepository.save(job)
    }

    @Transactional
    fun cancelJob(userId: Long, jobId: Long): ExtractionJob {
        val job = extractionJobRepository.findByIdAndUserId(jobId, userId)
            .orElseThrow { NoSuchElementException("추출 작업을 찾을 수 없습니다.") }

        if (job.status == ExtractionJobStatus.COMPLETED ||
            job.status == ExtractionJobStatus.FAILED ||
            job.status == ExtractionJobStatus.CANCELLED) {
            throw IllegalStateException("이미 종료되었거나 취소할 수 없는 작업입니다.")
        }

        cancelledJobIds.add(jobId)
        val activeProcess = activeProcesses[jobId]
        if (activeProcess != null && activeProcess.isAlive) {
            logger.info("취소 요청으로 yt-dlp 프로세스 강제 종료: jobId={}", jobId)
            activeProcess.destroyForcibly()
        }

        job.markCancelled()
        return extractionJobRepository.save(job)
    }

    @Transactional
    fun deleteJob(userId: Long, jobId: Long) {
        val job = extractionJobRepository.findByIdAndUserId(jobId, userId)
            .orElseThrow { NoSuchElementException("추출 작업을 찾을 수 없습니다.") }

        if (job.status in listOf(
            ExtractionJobStatus.PENDING,
            ExtractionJobStatus.DOWNLOADING,
            ExtractionJobStatus.CONVERTING,
            ExtractionJobStatus.UPLOADING
        )) {
            throw IllegalStateException("진행 중인 작업은 삭제할 수 없습니다. 먼저 추출을 중단해주세요.")
        }

        extractionJobRepository.delete(job)
        logger.info("추출 작업 기록 삭제 완료: jobId={}, userId={}", jobId, userId)
    }

    @Transactional
    fun clearFinishedJobs(userId: Long): Int {
        val finishedStatuses = listOf(
            ExtractionJobStatus.COMPLETED,
            ExtractionJobStatus.FAILED,
            ExtractionJobStatus.CANCELLED
        )
        val deletedCount = extractionJobRepository.deleteByUserIdAndStatusIn(userId, finishedStatuses)
        logger.info("종료된 추출 작업 기록 일괄 삭제 완료: userId={}, count={}", userId, deletedCount)
        return deletedCount
    }

    private fun isCancelled(jobId: Long): Boolean {
        if (cancelledJobIds.contains(jobId)) return true
        val status = extractionJobRepository.findStatusById(jobId)?.orElse(null)
        return status == ExtractionJobStatus.CANCELLED
    }

    private fun rollbackUploadedArtifacts(audioKey: String?, artworkKey: String?) {
        if (audioKey != null) {
            try {
                storageService.delete(audioKey)
            } catch (e: Exception) {
                logger.warn("취소 롤백 중 R2 오디오 파일 삭제 실패: key={}, error={}", audioKey, e.message)
            }
        }
        if (artworkKey != null) {
            try {
                storageService.delete(artworkKey)
            } catch (e: Exception) {
                logger.warn("취소 롤백 중 R2 아트워크 파일 삭제 실패: key={}, error={}", artworkKey, e.message)
            }
        }
    }

    @Async
    fun processJobAsync(jobId: Long) {
        val jobOptional = extractionJobRepository.findById(jobId)
        if (jobOptional.isEmpty) return
        val job = jobOptional.get()

        val tempDir = Files.createTempDirectory("musichub-extract-$jobId-").toFile()
        try {
            if (isCancelled(jobId) || job.status == ExtractionJobStatus.CANCELLED) {
                logger.info("작업 시작 전 취소됨: jobId={}", jobId)
                return
            }

            logger.info("추출 작업 비동기 처리 시작: jobId={}", jobId)

            // 1. 다운로드 및 MP3 변환
            val extractResult = mediaExtractor.extractAudio(job.sourceUrl, tempDir) { proc ->
                if (cancelledJobIds.contains(jobId)) {
                    proc.destroyForcibly()
                } else {
                    activeProcesses[jobId] = proc
                }
            }

            if (isCancelled(jobId)) {
                logger.info("추출 다운로드 중 취소 감지: jobId={}", jobId)
                return
            }

            val audioFile = extractResult.audioFile
            val fileSize = audioFile.length()

            // 2. 메타데이터 파싱 (취소되지 않은 경우에만 CONVERTING 업데이트)
            val updatedToConverting = extractionJobRepository.updateStatusIfActive(
                jobId,
                ExtractionJobStatus.CONVERTING,
                Instant.now()
            )
            if (updatedToConverting == 0 || isCancelled(jobId)) {
                logger.info("CONVERTING 단계 전 취소 감지: jobId={}", jobId)
                return
            }
            val metadata = metadataReader.read(audioFile)

            // 3. R2 업로드 (취소되지 않은 경우에만 UPLOADING 업데이트)
            val updatedToUploading = extractionJobRepository.updateStatusIfActive(
                jobId,
                ExtractionJobStatus.UPLOADING,
                Instant.now()
            )
            if (updatedToUploading == 0 || isCancelled(jobId)) {
                logger.info("UPLOADING 단계 전 취소 감지: jobId={}", jobId)
                return
            }

            val uniqueId = UUID.randomUUID().toString()
            val audioKey = "users/${job.user.id}/audio/$uniqueId.mp3"
            audioFile.inputStream().use { stream ->
                storageService.upload(audioKey, stream, fileSize, "audio/mpeg")
            }

            var artworkKey: String? = null
            var artworkMime: String? = null
            if (metadata.artwork != null && metadata.artwork.isNotEmpty()) {
                val artUniqueId = UUID.randomUUID().toString()
                artworkKey = "users/${job.user.id}/artwork/$artUniqueId.jpg"
                artworkMime = metadata.artworkMimeType ?: "image/jpeg"
                storageService.upload(
                    key = artworkKey,
                    inputStream = ByteArrayInputStream(metadata.artwork),
                    contentLength = metadata.artwork.size.toLong(),
                    mimeType = artworkMime
                )
            }

            if (isCancelled(jobId)) {
                logger.info("R2 업로드 후 취소 감지, 업로드 파일 롤백: jobId={}", jobId)
                rollbackUploadedArtifacts(audioKey, artworkKey)
                return
            }

            // 4. MusicFile 등록 및 용량 반영 (취소 여부 최종 확인)
            if (isCancelled(jobId)) {
                logger.info("MusicFile 등록 직전 취소 감지: jobId={}", jobId)
                rollbackUploadedArtifacts(audioKey, artworkKey)
                return
            }

            val musicFile = MusicFile(
                user = job.user,
                storageKey = audioKey,
                fileName = "${extractResult.title ?: "extracted"}.mp3",
                mimeType = "audio/mpeg",
                fileSize = fileSize,
                title = metadata.title ?: extractResult.title ?: "Unknown Title",
                artist = metadata.artist,
                album = metadata.album,
                year = metadata.year,
                genre = metadata.genre,
                trackNumber = metadata.trackNumber,
                durationMs = metadata.durationMs,
                artworkStorageKey = artworkKey,
                artworkMimeType = artworkMime,
                status = MusicFileStatus.ACTIVE,
                extractedByPlatform = true
            )
            val savedMusicFile = musicFileRepository.save(musicFile)
            job.user.addStorageUsage(fileSize)
            userRepository.save(job.user)

            // 5. 작업 완료 (조건부 원자적 업데이트: 취소되지 않은 경우에만 COMPLETED)
            val completedRows = extractionJobRepository.updateCompletedIfActive(
                jobId,
                savedMusicFile,
                Instant.now()
            )

            if (completedRows == 0) {
                logger.info("완료 저장 시점에 작업이 이미 취소되어 있음을 감지하여 롤백합니다: jobId={}", jobId)
                musicFileRepository.delete(savedMusicFile)
                job.user.subtractStorageUsage(fileSize)
                userRepository.save(job.user)
                rollbackUploadedArtifacts(audioKey, artworkKey)
                return
            }

            logger.info("추출 작업 성공 완료: jobId={}, musicFileId={}", jobId, savedMusicFile.id)

        } catch (e: Exception) {
            if (isCancelled(jobId)) {
                logger.info("취소된 작업의 프로세스 중단 완료: jobId={}", jobId)
                return
            }
            logger.error("추출 작업 실패: jobId={}, error={}", jobId, e.message, e)
            val isRetryable = isRetryableException(e)
            val currentStatus = extractionJobRepository.findStatusById(jobId)?.orElse(null)
            if (currentStatus != ExtractionJobStatus.CANCELLED) {
                job.markFailed(e.message ?: "알 수 없는 오류", isRetryable = isRetryable)
                extractionJobRepository.save(job)
            }
        } finally {
            activeProcesses.remove(jobId)
            cancelledJobIds.remove(jobId)
            tempDir.deleteRecursively()
        }
    }

    private fun isRetryableException(e: Exception): Boolean {
        val msg = e.message ?: return false
        // 비공개 영상, 30분 초과, 영상 삭제, 연령 제한 등 비가역적 오류는 재시도하지 않음
        return !(msg.contains("초과") ||
                msg.contains("비공개") ||
                msg.contains("삭제") ||
                msg.contains("제한") ||
                msg.contains("스트리밍") ||
                msg.contains("저작권") ||
                msg.contains("빈 파일"))
    }
}
