package com.musichub.backend.domain.music

import com.musichub.backend.domain.metadata.MetadataReader
import com.musichub.backend.domain.metadata.MetadataWriter
import com.musichub.backend.domain.storage.StorageService
import com.musichub.backend.domain.user.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.io.ByteArrayInputStream
import java.nio.file.Files
import java.util.*
import java.util.concurrent.CompletableFuture

data class UploadInitResult(
    val storageKey: String,
    val uploadUrl: String
)

data class PlayUrlResult(
    val playUrl: String,
    val durationMs: Long?
)

@Service
class MusicFileService(
    private val musicFileRepository: MusicFileRepository,
    private val userRepository: UserRepository,
    private val storageService: StorageService,
    private val metadataReader: MetadataReader,
    private val metadataWriter: MetadataWriter,
    @Value("\${musichub.storage.quota.system-max-bytes}") private val systemMaxBytes: Long,
    @Value("\${musichub.storage.quota.per-user-max-bytes}") private val perUserMaxBytes: Long,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    /**
     * 1. Presigned PUT URL 발급 (클라이언트 직접 업로드용)
     */
    @Transactional(readOnly = true)
    fun initiateDirectUpload(userId: Long, fileName: String, mimeType: String, fileSize: Long): UploadInitResult {
        validateStorageQuotas(userId, fileSize)

        val uniqueId = UUID.randomUUID().toString()
        val extension = fileName.substringAfterLast('.', "mp3")
        val storageKey = "users/$userId/audio/$uniqueId.$extension"

        val uploadUrl = storageService.generatePresignedPutUrl(storageKey, mimeType)
        return UploadInitResult(storageKey = storageKey, uploadUrl = uploadUrl)
    }

    /**
     * 2. 직접 업로드 완료 처리 (R2에서 파일 메타데이터 읽고 DB 등록)
     */
    @Transactional
    fun completeDirectUpload(userId: Long, storageKey: String, originalFileName: String): MusicFile {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("사용자를 찾을 수 없습니다.") }

        // R2에서 오브젝트 메타 확인 (실제 업로드 완료 여부 및 크기 확인)
        val s3Meta = storageService.getMetadata(storageKey)
        val fileSize = s3Meta.contentLength

        validateStorageQuotas(userId, fileSize)

        // R2에서 오디오 스트림을 가져와 메타데이터 추출
        val audioStream = storageService.getObject(storageKey)
        val extension = originalFileName.substringAfterLast('.', "mp3")
        val metadata = metadataReader.read(audioStream, extension)

        // 앨범 아트워크가 있으면 R2에 별도 저장
        var artworkKey: String? = null
        var artworkMime: String? = null
        if (metadata.artwork != null && metadata.artwork.isNotEmpty()) {
            val artUniqueId = UUID.randomUUID().toString()
            val artExt = if (metadata.artworkMimeType?.contains("png") == true) "png" else "jpg"
            artworkKey = "users/$userId/artwork/$artUniqueId.$artExt"
            artworkMime = metadata.artworkMimeType ?: "image/jpeg"

            storageService.upload(
                key = artworkKey,
                inputStream = ByteArrayInputStream(metadata.artwork),
                contentLength = metadata.artwork.size.toLong(),
                mimeType = artworkMime
            )
        }

        val musicFile = MusicFile(
            user = user,
            storageKey = storageKey,
            fileName = originalFileName,
            mimeType = s3Meta.contentType ?: "audio/mpeg",
            fileSize = fileSize,
            title = metadata.title ?: originalFileName.substringBeforeLast('.'),
            artist = metadata.artist,
            album = metadata.album,
            year = metadata.year,
            genre = metadata.genre,
            trackNumber = metadata.trackNumber,
            durationMs = metadata.durationMs,
            lyrics = metadata.lyrics,
            artworkStorageKey = artworkKey,
            artworkMimeType = artworkMime,
            status = MusicFileStatus.ACTIVE
        )

        user.addStorageUsage(fileSize)
        return musicFileRepository.save(musicFile)
    }

    /**
     * 3. 백엔드 프록시 업로드 (MVP용 단순 단일 요청 업로드)
     */
    @Transactional
    fun uploadViaProxy(userId: Long, file: MultipartFile): MusicFile {
        val fileSize = file.size
        validateStorageQuotas(userId, fileSize)

        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("사용자를 찾을 수 없습니다.") }
        val originalFileName = file.originalFilename ?: "unknown.mp3"
        val extension = originalFileName.substringAfterLast('.', "mp3")
        val uniqueId = UUID.randomUUID().toString()
        val storageKey = "users/$userId/audio/$uniqueId.$extension"

        val tempFile = Files.createTempFile("musichub-proxy-", ".$extension").toFile()
        try {
            file.transferTo(tempFile)

            // 1. 메타데이터 파싱
            val metadata = metadataReader.read(tempFile)

            // 2. R2 업로드
            val mimeType = file.contentType ?: "audio/mpeg"
            tempFile.inputStream().use { stream ->
                storageService.upload(storageKey, stream, fileSize, mimeType)
            }

            // 3. 아트워크 업로드
            var artworkKey: String? = null
            var artworkMime: String? = null
            if (metadata.artwork != null && metadata.artwork.isNotEmpty()) {
                val artUniqueId = UUID.randomUUID().toString()
                val artExt = if (metadata.artworkMimeType?.contains("png") == true) "png" else "jpg"
                artworkKey = "users/$userId/artwork/$artUniqueId.$artExt"
                artworkMime = metadata.artworkMimeType ?: "image/jpeg"

                storageService.upload(
                    key = artworkKey,
                    inputStream = ByteArrayInputStream(metadata.artwork),
                    contentLength = metadata.artwork.size.toLong(),
                    mimeType = artworkMime
                )
            }

            val musicFile = MusicFile(
                user = user,
                storageKey = storageKey,
                fileName = originalFileName,
                mimeType = mimeType,
                fileSize = fileSize,
                title = metadata.title ?: originalFileName.substringBeforeLast('.'),
                artist = metadata.artist,
                album = metadata.album,
                year = metadata.year,
                genre = metadata.genre,
                trackNumber = metadata.trackNumber,
                durationMs = metadata.durationMs,
                lyrics = metadata.lyrics,
                artworkStorageKey = artworkKey,
                artworkMimeType = artworkMime,
                status = MusicFileStatus.ACTIVE
            )

            user.addStorageUsage(fileSize)
            return musicFileRepository.save(musicFile)
        } finally {
            if (tempFile.exists()) {
                tempFile.delete()
            }
        }
    }

    /**
     * 4. 재생용 Presigned GET URL 발급 및 재생 통계 기록
     */
    @Transactional
    fun getStreamingUrl(userId: Long, musicFileId: Long): PlayUrlResult {
        val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
            .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }

        musicFile.incrementPlayCount()

        val playUrl = storageService.generatePresignedGetUrl(musicFile.storageKey)
        return PlayUrlResult(playUrl = playUrl, durationMs = musicFile.durationMs)
    }

    /**
     * 5. 앨범 커버 이미지 Presigned URL 발급
     */
    @Transactional(readOnly = true)
    fun getArtworkUrl(userId: Long, musicFileId: Long): String? {
        val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
            .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }

        return musicFile.artworkStorageKey?.let { storageService.generatePresignedGetUrl(it) }
    }

    @Transactional(readOnly = true)
    fun listMusicFiles(userId: Long, pageable: Pageable): Page<MusicFile> {
        return musicFileRepository.findAllByUserIdAndStatus(userId, MusicFileStatus.ACTIVE, pageable)
    }

    @Transactional
    fun deleteMusicFile(userId: Long, musicFileId: Long) {
        val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
            .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }

        // R2에서 오브젝트 삭제 (실패 시에도 로그 기록 후 메타데이터 및 용량 정리 진행)
        try {
            storageService.delete(musicFile.storageKey)
            musicFile.artworkStorageKey?.let { storageService.delete(it) }
        } catch (e: Exception) {
            logger.warn("R2 오브젝트 삭제 중 오류 발생 (키: {}): {}", musicFile.storageKey, e.message)
        }

        // 용량 차감
        val user = musicFile.user
        user.subtractStorageUsage(musicFile.fileSize)

        musicFileRepository.delete(musicFile)
    }

    /**
     * 6. 음악 파일 메타데이터 수정 (DB 즉시 반영 후 R2 바이너리 태그 비동기 재작성)
     */
    @Transactional
    fun updateMetadata(userId: Long, musicFileId: Long, request: UpdateMusicMetadataRequest): MusicFile {
        val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
            .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }

        // 1. DB 엔티티 즉시 업데이트 (사용자 UI는 10ms 만에 즉각 갱신)
        musicFile.title = request.title?.trim()?.takeIf { it.isNotBlank() }
        musicFile.artist = request.artist?.trim()?.takeIf { it.isNotBlank() }
        musicFile.album = request.album?.trim()?.takeIf { it.isNotBlank() }
        musicFile.year = request.year
        musicFile.genre = request.genre?.trim()?.takeIf { it.isNotBlank() }
        musicFile.trackNumber = request.trackNumber
        musicFile.lyrics = request.lyrics?.trim()?.takeIf { it.isNotBlank() }
        musicFile.tagSyncStatus = TagSyncStatus.SYNCING
        musicFile.updatedAt = java.time.Instant.now()

        // 2. 무거운 작업(R2 파일 다운로드 -> Jaudiotagger 태그 재작성 -> R2 재업로드)은 백그라운드 비동기로 실행
        CompletableFuture.runAsync {
            rewriteR2Tags(musicFileId, request)
        }

        return musicFile
    }

    /**
     * 백그라운드 R2 오디오 파일 태그 재작성 및 재업로드
     */
    fun rewriteR2Tags(musicFileId: Long, request: UpdateMusicMetadataRequest) {
        val musicFile = musicFileRepository.findById(musicFileId).orElse(null) ?: return
        val extension = musicFile.fileName.substringAfterLast('.', "mp3")
        val tempFile = Files.createTempFile("musichub-update-", ".$extension").toFile()

        try {
            // 1. R2에서 원본 파일 다운로드
            storageService.getObject(musicFile.storageKey).use { input ->
                tempFile.outputStream().use { out -> input.copyTo(out) }
            }

            // 2. Jaudiotagger로 오디오 바이너리 태그 갱신
            metadataWriter.updateTags(
                file = tempFile,
                title = request.title,
                artist = request.artist,
                album = request.album,
                year = request.year,
                genre = request.genre,
                trackNumber = request.trackNumber,
                lyrics = request.lyrics
            )

            // 3. 변경된 파일 크기 확인 및 R2 덮어쓰기 업로드
            val newSize = tempFile.length()
            tempFile.inputStream().use { input ->
                storageService.upload(musicFile.storageKey, input, newSize, musicFile.mimeType)
            }

            // 4. 유저 스토리지 사용량 델타 반영 & 상태 갱신
            val deltaSize = newSize - musicFile.fileSize
            if (deltaSize > 0) {
                musicFile.user.addStorageUsage(deltaSize)
            } else if (deltaSize < 0) {
                musicFile.user.subtractStorageUsage(-deltaSize)
            }
            musicFile.fileSize = newSize
            musicFile.tagSyncStatus = TagSyncStatus.SYNCED
            musicFileRepository.save(musicFile)
            logger.info("Successfully updated R2 audio tags in background for track id: {}", musicFileId)
        } catch (e: Exception) {
            logger.error("Failed to rewrite R2 audio tags for track id {}: {}", musicFileId, e.message, e)
            try {
                musicFile.tagSyncStatus = TagSyncStatus.FAILED
                musicFileRepository.save(musicFile)
            } catch (saveEx: Exception) {
                logger.error("Failed to mark tagSyncStatus as FAILED for track id {}: {}", musicFileId, saveEx.message)
            }
        } finally {
            if (tempFile.exists()) {
                tempFile.delete()
            }
        }
    }

    @Transactional(readOnly = true)
    fun getSyncStatus(userId: Long, musicFileId: Long): TagSyncStatus {
        val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
            .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }
        return musicFile.tagSyncStatus
    }

    /**
     * 실패한 R2 오디오 태그 재동기화 수동 요청
     */
    @Transactional
    fun resyncTags(userId: Long, musicFileId: Long): TagSyncStatus {
        val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
            .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }

        val request = UpdateMusicMetadataRequest(
            title = musicFile.title,
            artist = musicFile.artist,
            album = musicFile.album,
            year = musicFile.year,
            genre = musicFile.genre,
            trackNumber = musicFile.trackNumber,
            lyrics = musicFile.lyrics
        )

        musicFile.tagSyncStatus = TagSyncStatus.SYNCING
        musicFileRepository.save(musicFile)

        CompletableFuture.runAsync {
            rewriteR2Tags(musicFileId, request)
        }

        return TagSyncStatus.SYNCING
    }

    private fun validateStorageQuotas(userId: Long, incomingBytes: Long) {
        // 전체 시스템 9.5GB 초과 방지
        val totalUsed = musicFileRepository.sumTotalFileSize()
        if (totalUsed + incomingBytes > systemMaxBytes) {
            throw IllegalStateException("시스템 전체 스토리지 한도(9.5GB)에 도달하여 신규 업로드가 제한됩니다.")
        }

        // 사용자별 한도(2GB) 초과 방지
        val userUsed = musicFileRepository.sumFileSizeByUserId(userId)
        if (userUsed + incomingBytes > perUserMaxBytes) {
            throw IllegalStateException("개인 스토리지 허용 한도(2GB)를 초과하여 업로드할 수 없습니다.")
        }
    }
}
