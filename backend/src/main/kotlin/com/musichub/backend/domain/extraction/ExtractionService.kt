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
import java.util.*

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

    @Async
    fun processJobAsync(jobId: Long) {
        val jobOptional = extractionJobRepository.findById(jobId)
        if (jobOptional.isEmpty) return
        val job = jobOptional.get()

        val tempDir = Files.createTempDirectory("musichub-extract-$jobId-").toFile()
        try {
            logger.info("추출 작업 비동기 처리 시작: jobId={}", jobId)

            // 1. 다운로드 및 MP3 변환
            val extractResult = mediaExtractor.extractAudio(job.sourceUrl, tempDir)
            val audioFile = extractResult.audioFile
            val fileSize = audioFile.length()

            // 2. 메타데이터 파싱
            job.status = ExtractionJobStatus.CONVERTING
            extractionJobRepository.save(job)
            val metadata = metadataReader.read(audioFile)

            // 3. R2 업로드
            job.status = ExtractionJobStatus.UPLOADING
            extractionJobRepository.save(job)

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

            // 4. MusicFile 등록 및 용량 반영
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

            // 5. 작업 완료
            job.markCompleted(savedMusicFile)
            extractionJobRepository.save(job)
            logger.info("추출 작업 성공 완료: jobId={}, musicFileId={}", jobId, savedMusicFile.id)

        } catch (e: Exception) {
            logger.error("추출 작업 실패: jobId={}, error={}", jobId, e.message, e)
            val isRetryable = isRetryableException(e)
            job.markFailed(e.message ?: "알 수 없는 오류", isRetryable = isRetryable)
            extractionJobRepository.save(job)
        } finally {
            // 임시 디렉토리 및 파일 정리
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
