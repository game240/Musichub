# Audio File Download Feature Implementation Plan

- **Date:** 2026-11-21
- **Spec:** [docs/superpowers/specs/2026-11-21-audio-file-download-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-21-audio-file-download-design.md)
- **Status:** Planned (Awaiting Approval)
- **Target Branch:** `feat/audio-file-download` cut from `dev`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/audio-file-download` cut from `dev`. Do not push to remote unless asked.
   - Commit format: `type: subject` (e.g. `feat: add direct presigned audio download endpoint with rfc5987 content disposition`).
   - Frontend styling: Follow StyleSeed guidelines (`#08090a`, `#0f1011`, `#5e6ad2`, `#8590ea`, atoms/molecules/organisms hierarchy).
2. **Architecture**:
   - Cloudflare R2 direct download via S3 Presigned GET URL with `response-content-disposition`.
   - Zero-egress cost and zero server-thread blocking.
   - RFC 5987 / RFC 6266 standard compliance for Korean and special character filenames (`filename*=UTF-8''...`).
   - UI entrypoints: Library `TrackRow` action button and `GlobalPlayer` now-playing action button.

---

## 2. Step-by-Step Milestones

### Milestone 1: Storage Layer & R2 Presigned Download Support
- [ ] In `backend/src/main/kotlin/com/musichub/backend/domain/storage/StorageService.kt`:
  - Add interface method:
    ```kotlin
    fun generatePresignedDownloadUrl(
        key: String,
        downloadFilename: String,
        duration: Duration = Duration.ofMinutes(15)
    ): String
    ```
- [ ] In `backend/src/main/kotlin/com/musichub/backend/domain/storage/CloudflareR2StorageService.kt`:
  - Implement `generatePresignedDownloadUrl`:
    - Format RFC 5987 / RFC 6266 `Content-Disposition`: `attachment; filename="{asciiSafe}"; filename*=UTF-8''{percentEncoded}`.
    - Build `GetObjectRequest` with `responseContentDisposition(...)`.
    - Sign with `s3Presigner.presignGetObject(...)` and return URL string.

### Milestone 2: Backend Domain Service & Controller Endpoint
- [ ] In `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileService.kt`:
  - Create DTO: `data class DownloadUrlResult(val downloadUrl: String, val fileName: String, val fileSize: Long)`.
  - Implement `resolveDownloadFilename(musicFile: MusicFile): String`:
    - Format `"${artist} - ${title}.${ext}"` or `"${title}.${ext}"` or fallback to `musicFile.fileName`.
    - Sanitize illegal filesystem characters (`\ / : * ? " < > |`) into safe underscores.
  - Implement `getDownloadUrl(userId: Long, musicFileId: Long): DownloadUrlResult`:
    - Fetch active music file by `id` and `userId` (ownership verification).
    - Call `storageService.generatePresignedDownloadUrl(...)`.
    - Return `DownloadUrlResult`.
- [ ] In `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileController.kt`:
  - Add endpoint:
    ```kotlin
    @GetMapping("/{id}/download")
    fun getDownloadUrl(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable id: Long
    ): ResponseEntity<DownloadUrlResult>
    ```

### Milestone 3: Backend Unit & Integration Tests
- [ ] Create unit tests in `backend/src/test/kotlin/com/musichub/backend/domain/music/MusicFileDownloadTest.kt`:
  - Test filename sanitization and formatting:
    - Artist and title present (e.g. `아이유 - 밤편지.mp3`).
    - Special / illegal characters (`AC/DC: Live? *awesome*.mp3` -> `AC_DC_ Live_ _awesome_.mp3`).
    - Only title present.
    - Blank / empty title fallback to original fileName.
  - Test `getDownloadUrl` success: returns presigned URL and correct fileName.
  - Test authorization: throws `NoSuchElementException` when requesting a track owned by another user or deleted track.
- [ ] Run backend tests: `./gradlew test`.

### Milestone 4: Frontend API & Types
- [ ] In `frontend/src/types/music.ts`:
  - Export interface:
    ```typescript
    export interface DownloadUrlResult {
      downloadUrl: string;
      fileName: string;
      fileSize: number;
    }
    ```
- [ ] In `frontend/src/api/musicApi.ts`:
  - Add API client function:
    ```typescript
    async getDownloadUrl(id: number): Promise<DownloadUrlResult> {
      const response = await apiClient.get<DownloadUrlResult>(`/music-files/${id}/download`);
      return response.data;
    }
    ```
- [ ] In `frontend/src/utils/downloadFile.ts`:
  - Implement reusable helper `triggerBrowserDownload(url: string, fileName?: string): void`.

### Milestone 5: Frontend UI Integration & StyleSeed Verification
- [ ] In `frontend/src/components/pages/library/track/TrackRow.tsx`:
  - Add `onDownload?: (track: MusicFileDto) => void` prop.
  - Add download action button using `Download` icon (`lucide-react`) and `Tooltip content="음원 다운로드"`.
  - Support loading indicator while download URL is being fetched.
- [ ] In `frontend/src/components/pages/library/track/TrackTable.tsx`:
  - Pass `onDownload` handler from props to each `TrackRow`.
- [ ] In `frontend/src/components/pages/library/LibraryPage.tsx`:
  - Add `handleDownload(track: MusicFileDto)`:
    - Set downloading track ID in local state.
    - Call `musicApi.getDownloadUrl(track.id)`.
    - Trigger `triggerBrowserDownload(result.downloadUrl, result.fileName)`.
    - Handle errors gracefully with notification.
    - Clear downloading state.
- [ ] In `frontend/src/components/pages/player/GlobalPlayer.tsx`:
  - Add download action button for `currentTrack` with tooltip `"현재 곡 다운로드"`.
- [ ] Run frontend verification:
  - `npm run build && npm run lint`.

### Milestone 6: End-to-End Verification
- [ ] Upload sample music files with various metadata conditions (Korean title, special characters, english).
- [ ] Click download in library table: verify browser saves file directly from Cloudflare R2 with clean filename.
- [ ] Click download in global player bar: verify seamless download during active playback.
- [ ] Verify non-blocking UI and zero server JVM memory overhead.
