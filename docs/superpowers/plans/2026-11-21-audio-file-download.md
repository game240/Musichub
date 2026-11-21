# Audio File Download Feature Implementation Plan

- **Date:** 2026-11-21
- **Spec:** [docs/superpowers/specs/2026-11-21-audio-file-download-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-21-audio-file-download-design.md)
- **Status:** Completed (Awaiting Review / Merge)
- **Branch:** `feat/audio-file-download` cut from `dev`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/audio-file-download` cut from `dev`. Do not push to remote unless asked.
   - Commit format: `type: subject` (e.g. `feat: add direct presigned audio download endpoint with original filename priority`).
   - Frontend styling: Follow StyleSeed guidelines (`#08090a`, `#0f1011`, `#5e6ad2`, `#8590ea`, atoms/molecules/organisms hierarchy).
2. **Architecture**:
   - Cloudflare R2 direct download via S3 Presigned GET URL with `response-content-disposition`.
   - Zero-egress cost and zero server-thread blocking.
   - **Original Filename Priority**: Download uses the user's original uploaded `fileName` (preserving custom filenames), falling back to metadata `"{artist} - {title}.{ext}"` only if original filename is missing/blank.
   - RFC 5987 / RFC 6266 standard compliance for Korean and special character filenames (`filename*=UTF-8''...`).
   - UI entrypoints: Library `TrackRow` action button and `GlobalPlayer` now-playing action button.

---

## 2. Step-by-Step Milestones

### Milestone 1: Storage Layer & R2 Presigned Download Support
- [x] In `backend/src/main/kotlin/com/musichub/backend/domain/storage/StorageService.kt`:
  - Add interface method: `generatePresignedDownloadUrl(key, downloadFilename, duration)`
- [x] In `backend/src/main/kotlin/com/musichub/backend/domain/storage/CloudflareR2StorageService.kt`:
  - Implement `generatePresignedDownloadUrl`:
    - Format RFC 5987 / RFC 6266 `Content-Disposition`: `attachment; filename="{asciiSafe}"; filename*=UTF-8''{percentEncoded}`.
    - Build `GetObjectRequest` with `responseContentDisposition(...)`.
    - Sign with `s3Presigner.presignGetObject(...)` and return URL string.

### Milestone 2: Backend Domain Service & Controller Endpoint
- [x] In `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileService.kt`:
  - Create DTO: `data class DownloadUrlResult(val downloadUrl: String, val fileName: String, val fileSize: Long)`.
  - Implement `resolveDownloadFilename(musicFile: MusicFile): String`:
    - Prioritize `musicFile.fileName` (trim and sanitize).
    - If blank/empty, fallback to `"${artist} - ${title}.${ext}"`, `"${title}.${ext}"`, or `"audio.${ext}"`.
    - Sanitize illegal filesystem characters (`\ / : * ? " < > |`) into safe underscores.
  - Implement `getDownloadUrl(userId: Long, musicFileId: Long): DownloadUrlResult`:
    - Fetch active music file by `id` and `userId` (ownership verification).
    - Call `storageService.generatePresignedDownloadUrl(...)`.
    - Return `DownloadUrlResult`.
- [x] In `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileController.kt`:
  - Add endpoint: `GET /api/music-files/{id}/download` returning `ResponseEntity<DownloadUrlResult>`.

### Milestone 3: Backend Unit & Integration Tests
- [x] Create unit tests in `backend/src/test/kotlin/com/musichub/backend/domain/music/MusicFileDownloadTest.kt`:
  - Test filename sanitization and original filename priority:
    - Original `fileName` prioritized (e.g. `My_Custom_Track_v1.mp3`).
    - Special / illegal characters (`AC/DC: Live? *Track* <1> | "Remix".mp3` -> `AC_DC_ Live_ _Track_ _1_ _ _Remix_.mp3`).
    - Blank / empty original fileName fallback to metadata (`"${artist} - ${title}.${ext}"`).
  - Test `getDownloadUrl` success: returns presigned URL and correct fileName.
  - Test authorization: throws `NoSuchElementException` when requesting a track owned by another user or deleted track.
- [x] Run backend tests: `./gradlew test` (All passed).

### Milestone 4: Frontend API & Types
- [x] In `frontend/src/types/music.ts`:
  - Export interface `DownloadUrlResult`.
- [x] In `frontend/src/api/musicApi.ts`:
  - Add API client function `getDownloadUrl(id: number): Promise<DownloadUrlResult>`.
- [x] In `frontend/src/utils/downloadFile.ts`:
  - Implement reusable helper `triggerBrowserDownload(url: string, fileName?: string): void`.

### Milestone 5: Frontend UI Integration & StyleSeed Verification
- [x] In `frontend/src/components/pages/library/track/TrackRow.tsx`:
  - Add `onDownload: (track: MusicFileDto) => void` and `isDownloading?: boolean` props.
  - Add download action button using `Download` icon (`lucide-react`) and `Tooltip content="음원 다운로드"`.
  - Support loading indicator while download URL is being fetched.
- [x] In `frontend/src/components/pages/library/track/TrackTable.tsx`:
  - Pass `downloadingTrackId` and `onDownload` handler from props to each `TrackRow`.
  - Expand actions column width from `w-28` to `w-36` to comfortably accommodate all 4 action icons.
- [x] In `frontend/src/components/pages/library/LibraryPage.tsx`:
  - Add `handleDownload(track: MusicFileDto)`:
    - Set downloading track ID in local state.
    - Call `musicApi.getDownloadUrl(track.id)`.
    - Trigger `triggerBrowserDownload(result.downloadUrl, result.fileName)`.
    - Clear downloading state.
- [x] In `frontend/src/components/pages/player/GlobalPlayer.tsx`:
  - Add download action button for `currentTrack` with tooltip `"현재 곡 다운로드"` and loading spinner.
- [x] Run frontend verification:
  - `npm run build && npm run lint` (Both passed with 0 errors).

### Milestone 6: End-to-End Verification
- [x] Verified filename resolution with original filename priority and OS filesystem sanitization.
- [x] Verified presigned R2 direct download link generation with RFC 5987 UTF-8 `Content-Disposition`.
- [x] Verified ownership verification and error handling for unauthorized / deleted tracks.
- [x] Verified non-blocking UI and zero server JVM memory/egress overhead.
