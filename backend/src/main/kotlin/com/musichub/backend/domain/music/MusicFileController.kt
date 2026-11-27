package com.musichub.backend.domain.music

import com.musichub.backend.global.security.UserPrincipal
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.Instant

data class BatchDownloadTicketRequest(
    @field:NotEmpty(message = "다운로드할 음원 ID 목록은 비어 있을 수 없습니다.")
    val musicFileIds: List<Long>
)

data class DirectUploadInitRequest(
    val fileName: String,
    val mimeType: String,
    val fileSize: Long
)

data class DirectUploadCompleteRequest(
    val storageKey: String,
    val fileName: String
)

data class UpdateMusicMetadataRequest(
    val title: String? = null,
    val artist: String? = null,
    val album: String? = null,
    val year: Int? = null,
    val genre: String? = null,
    val trackNumber: Int? = null,
    val lyrics: String? = null
)

data class TagSyncStatusResponse(
    val id: Long,
    val status: String
)

data class MetadataSuggestionsResponse(
    val artists: List<String>,
    val albums: List<String>
)

data class MusicFileDto(
    val id: Long,
    val fileName: String,
    val title: String?,
    val artist: String?,
    val album: String?,
    val year: Int?,
    val genre: String?,
    val trackNumber: Int?,
    val durationMs: Long?,
    val fileSize: Long,
    val hasArtwork: Boolean,
    val artworkUrl: String? = null,
    val lyrics: String?,
    val playCount: Int,
    val lastPlayedAt: Instant?,
    val tagSyncStatus: String,
    val createdAt: Instant
) {
    companion object {
        fun from(entity: MusicFile, artworkUrl: String? = null): MusicFileDto = MusicFileDto(
            id = entity.id,
            fileName = entity.fileName,
            title = entity.title,
            artist = entity.artist,
            album = entity.album,
            year = entity.year,
            genre = entity.genre,
            trackNumber = entity.trackNumber,
            durationMs = entity.durationMs,
            fileSize = entity.fileSize,
            hasArtwork = entity.artworkStorageKey != null,
            artworkUrl = artworkUrl,
            lyrics = entity.lyrics,
            playCount = entity.playCount,
            lastPlayedAt = entity.lastPlayedAt,
            tagSyncStatus = entity.tagSyncStatus.name,
            createdAt = entity.createdAt
        )
    }
}

@RestController
@RequestMapping("/api/music-files")
class MusicFileController(
    private val musicFileService: MusicFileService,
    private val batchDownloadTicketManager: BatchDownloadTicketManager
) {

    @PostMapping("/upload/init")
    fun initDirectUpload(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestBody request: DirectUploadInitRequest
    ): ResponseEntity<UploadInitResult> {
        val result = musicFileService.initiateDirectUpload(
            userId = user.id,
            fileName = request.fileName,
            mimeType = request.mimeType,
            fileSize = request.fileSize
        )
        return ResponseEntity.ok(result)
    }

    @PostMapping("/upload/complete")
    fun completeDirectUpload(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestBody request: DirectUploadCompleteRequest
    ): ResponseEntity<MusicFileDto> {
        val musicFile = musicFileService.completeDirectUpload(
            userId = user.id,
            storageKey = request.storageKey,
            originalFileName = request.fileName
        )
        return ResponseEntity.ok(musicFileService.toDto(musicFile))
    }

    @PostMapping("/upload")
    fun uploadViaProxy(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<MusicFileDto> {
        val musicFile = musicFileService.uploadViaProxy(user.id, file)
        return ResponseEntity.ok(musicFileService.toDto(musicFile))
    }

    @GetMapping
    fun listMusicFiles(
        @AuthenticationPrincipal user: UserPrincipal,
        @PageableDefault(size = 30, sort = ["title"], direction = Sort.Direction.ASC) pageable: Pageable
    ): ResponseEntity<Page<MusicFileDto>> {
        val page = musicFileService.listMusicFiles(user.id, pageable).map { musicFileService.toDto(it) }
        return ResponseEntity.ok(page)
    }

    @GetMapping("/{id}")
    fun getMusicFile(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<MusicFileDto> {
        val musicFile = musicFileService.getMusicFile(user.id, id)
        return ResponseEntity.ok(musicFileService.toDto(musicFile))
    }

    @GetMapping("/{id}/play")
    fun getPlayUrl(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<PlayUrlResult> {
        val result = musicFileService.getStreamingUrl(user.id, id)
        return ResponseEntity.ok(result)
    }

    @GetMapping("/{id}/download")
    fun getDownloadUrl(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<DownloadUrlResult> {
        val result = musicFileService.getDownloadUrl(user.id, id)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/batch-download/ticket")
    fun createBatchDownloadTicket(
        @AuthenticationPrincipal user: UserPrincipal,
        @Valid @RequestBody request: BatchDownloadTicketRequest
    ): ResponseEntity<BatchDownloadTicketResponse> {
        val result = musicFileService.createBatchDownloadTicket(user.id, request.musicFileIds)
        return ResponseEntity.ok(result)
    }

    @GetMapping("/batch-download")
    fun streamBatchDownload(
        @RequestParam ticket: String,
        response: HttpServletResponse
    ) {
        val downloadTicket = batchDownloadTicketManager.consumeTicket(ticket)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 다운로드 티켓입니다.")

        val asciiFallback = downloadTicket.zipFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val encodedUtf8 = URLEncoder.encode(downloadTicket.zipFilename, StandardCharsets.UTF_8.toString()).replace("+", "%20")
        val contentDisposition = "attachment; filename=\"$asciiFallback\"; filename*=UTF-8''$encodedUtf8"

        response.contentType = "application/zip"
        response.setHeader("Content-Disposition", contentDisposition)

        musicFileService.streamBatchDownloadWithTicket(downloadTicket, response.outputStream)
    }

    @GetMapping("/{id}/artwork")
    fun getArtworkUrl(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<Map<String, String?>> {
        val artworkUrl = musicFileService.getArtworkUrl(user.id, id)
        return ResponseEntity.ok(mapOf("artworkUrl" to artworkUrl))
    }

    @DeleteMapping("/{id}")
    fun deleteMusicFile(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<Void> {
        musicFileService.deleteMusicFile(user.id, id)
        return ResponseEntity.noContent().build()
    }

    @PatchMapping("/{id}")
    fun updateMetadata(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long,
        @RequestBody request: UpdateMusicMetadataRequest
    ): ResponseEntity<MusicFileDto> {
        val updated = musicFileService.updateMetadata(user.id, id, request)
        return ResponseEntity.ok(musicFileService.toDto(updated))
    }

    @GetMapping("/{id}/sync-status")
    fun getSyncStatus(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<TagSyncStatusResponse> {
        val status = musicFileService.getSyncStatus(user.id, id)
        return ResponseEntity.ok(TagSyncStatusResponse(id = id, status = status.name))
    }

    @PostMapping("/{id}/resync-tags")
    fun resyncTags(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<TagSyncStatusResponse> {
        val status = musicFileService.resyncTags(user.id, id)
        return ResponseEntity.ok(TagSyncStatusResponse(id = id, status = status.name))
    }

    @GetMapping("/metadata-suggestions")
    fun getMetadataSuggestions(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestParam(required = false) artist: String?
    ): ResponseEntity<MetadataSuggestionsResponse> {
        val result = musicFileService.getMetadataSuggestions(user.id, artist)
        return ResponseEntity.ok(
            MetadataSuggestionsResponse(
                artists = result.artists,
                albums = result.albums
            )
        )
    }
}
