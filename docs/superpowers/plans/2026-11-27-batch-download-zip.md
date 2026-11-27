# Batch Audio Download via Streaming ZIP Archive Implementation Plan

- **Date:** 2026-11-27
- **Spec:** [docs/superpowers/specs/2026-11-27-batch-download-zip-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-27-batch-download-zip-design.md)
- **Status:** Completed
- **Branch:** `feat/batch-download-zip` cut from `dev`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/batch-download-zip` cut from `dev`. Do not push to remote unless asked.
   - Commit messages: `type: subject` format (e.g. `feat: add streaming zip batch audio download with ticket mechanism`).
   - Verification before claiming completion: run tests (`./gradlew test`) and frontend build (`pnpm build`).
2. **Architecture**:
   - One-time ticket generation via `POST /api/music-files/batch-download/ticket`.
   - Streaming ZIP download via `GET /api/music-files/batch-download?ticket={ticket}`.
   - Zero-disk, 32KB buffer streaming directly from Cloudflare R2 / S3 `getObject` stream to HTTP response `ZipOutputStream`.
   - Compression level `Deflater.BEST_SPEED` to minimize CPU load.
   - Inside the ZIP, duplicate track filenames are automatically numbered (`Track (1).mp3`).
   - Frontend `downloadBatch.ts`: Single-file downloads remain direct via R2 presigned URL; multi-file downloads use single ZIP archive.

---

## 2. Step-by-Step Milestones

### Milestone 1: Git Branch Preparation
- [x] Create branch `feat/batch-download-zip` from `dev`.

### Milestone 2: Backend Ticket Management & Streaming Service
- [x] Create `backend/src/main/kotlin/com/musichub/backend/domain/music/BatchDownloadTicketManager.kt`:
  - `BatchDownloadTicket(ticketId, userId, musicFileIds, expiresAt)`
  - `createTicket(userId: Long, musicFileIds: List<Long>): String`
  - `consumeTicket(ticketId: String): BatchDownloadTicket?` (single-use, validated against expiry)
  - Scheduled purge for expired tickets.
- [x] In `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileService.kt`:
  - Add `createBatchDownloadTicket(userId: Long, musicFileIds: List<Long>): BatchDownloadTicketResponse`
  - Add helper `getUniqueZipEntryName(baseName: String, existingNames: MutableSet<String>): String`
  - Add `streamBatchDownloadWithTicket(ticket: BatchDownloadTicket, outputStream: OutputStream)`

### Milestone 3: Controller Endpoints & Security Configuration
- [x] In `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileController.kt`:
  - `POST /api/music-files/batch-download/ticket` (authenticated, returns ticket and download URL)
  - `GET /api/music-files/batch-download?ticket={ticket}` (streams ZIP with UTF-8 `Content-Disposition`)
- [x] In `backend/src/main/kotlin/com/musichub/backend/global/config/SecurityConfig.kt`:
  - Allow `GET /api/music-files/batch-download` without Bearer JWT (authentication verified by single-use ticket).

### Milestone 4: Backend Unit & Integration Tests
- [x] Create `backend/src/test/kotlin/com/musichub/backend/domain/music/BatchDownloadTicketManagerTest.kt`:
  - Test ticket creation, single-use consumption, and expiration.
- [x] Create/Update `backend/src/test/kotlin/com/musichub/backend/domain/music/MusicFileBatchDownloadTest.kt`:
  - Test ticket generation with valid/invalid IDs and ownership validation.
  - Test streaming ZIP output generates valid ZIP header and entries.
- [x] Run backend tests: `./gradlew test` to ensure 100% pass.

### Milestone 5: Frontend API & Batch Downloader Update
- [x] In `frontend/src/types/music.ts`:
  - Add `BatchDownloadTicketResponse` interface.
- [x] In `frontend/src/api/musicApi.ts`:
  - Add `createBatchDownloadTicket(musicFileIds: number[]): Promise<BatchDownloadTicketResponse>`.
- [x] In `frontend/src/utils/downloadBatch.ts`:
  - Update `downloadTracksBatch`:
    - For `tracks.length === 1`: direct presigned download.
    - For `tracks.length > 1`: create ticket and trigger single ZIP download via `triggerBrowserDownload(downloadUrl, zipFileName)`.
- [x] In `frontend/src/components/pages/library/LibraryPage.tsx` and `frontend/src/components/pages/extraction/ExtractionPage.tsx`:
  - Provide clear toast feedback (`"${tracks.length}개 음원을 ZIP 압축 파일로 다운로드합니다."`).

### Milestone 6: End-to-End Verification & Build
- [x] Build and typecheck frontend: `pnpm --prefix frontend build`.
- [x] Run backend tests: `./gradlew test`.
- [x] Commit changes with standard commit messages (`feat: ...`).
