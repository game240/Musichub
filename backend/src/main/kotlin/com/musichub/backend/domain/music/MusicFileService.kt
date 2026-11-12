package com.musichub.backend.domain.music

import com.musichub.backend.domain.metadata.MetadataReader
import com.musichub.backend.domain.storage.StorageService
import com.musichub.backend.domain.user.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.io.ByteArrayInputStream
import java.util.*

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
    @Value("\${musichub.storage.quota.system-max-bytes}") private val systemMaxBytes: Long,
    @Value("\${musichub.storage.quota.per-user-max-bytes}") private val perUserMaxBytes: Long,
) {

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

        // 1. R2 업로드
        val mimeType = file.contentType ?: "audio/mpeg"
        storageService.upload(storageKey, file.inputStream, fileSize, mimeType)

        // 2. 메타데이터 파싱
        val metadata = metadataReader.read(file.inputStream, extension)

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
            artworkStorageKey = artworkKey,
            artworkMimeType = artworkMime,
            status = MusicFileStatus.ACTIVE
        )

        user.addStorageUsage(fileSize)
        return musicFileRepository.save(musicFile)
    }

    /**
     * 4. 재생용 Presigned GET URL 발급
     */
    @Transactional(readOnly = true)
    fun getStreamingUrl(userId: Long, musicFileId: Long): PlayUrlResult {
        val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
            .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }

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

        // R2에서 오브젝트 삭제
        storageService.delete(musicFile.storageKey)
        musicFile.artworkStorageKey?.let { storageService.delete(it) }

        // 용량 차감
        val user = musicFile.user
        user.subtractStorageUsage(musicFile.fileSize)

        musicFileRepository.delete(musicFile)
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
