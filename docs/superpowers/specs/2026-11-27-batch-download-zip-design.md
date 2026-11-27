# Design: Batch Audio Download via Streaming ZIP Archive

- **Date:** 2026-11-27
- **Status:** Proposed (Awaiting Approval)
- **Target Components:** 
  - Backend: Spring Boot 3, Kotlin, Cloudflare R2 / S3 Client, Spring Security
  - Frontend: React 19, TypeScript, Axios, `LibraryPage`, `ExtractionPage`, `BatchActionBar`

---

## 1. Overview & Problem Statement

### 1.1 Problem Statement
In MusicHub, when users select multiple audio files from the library or extraction history and click "다운로드" in the floating batch action bar, only the first file is downloaded. Subsequent files are suppressed or dropped:
1. **Browser Automatic Multi-Download Protection**: Modern browsers (Chrome, Edge, Safari, Firefox) restrict programmatic multi-file downloads triggered from a single user gesture. Chrome blocks subsequent downloads unless explicit site permissions are granted; Safari silently drops all downloads after the first.
2. **Top-Level Navigation Cancellation**: Triggering repeated cross-origin `link.click()` events without `target="_blank"` cancels or overrides prior in-flight attachment requests.
3. **Silent Failure**: The client-side loop registers `successful++` because DOM `link.click()` does not throw an error, giving false completion feedback while the user only receives one file.

### 1.2 Proposed Solution
Replace the sequential individual download loop with a **Single Streaming ZIP Archive Download**:
1. **One-Time Ticket Architecture**: The client requests a short-lived, single-use download ticket (`POST /api/music-files/batch-download/ticket`) with authenticated credentials.
2. **Streaming ZIP Endpoint**: The browser navigates directly to `GET /api/music-files/batch-download?ticket={ticket}` as a native browser download.
3. **Zero-Disk Streaming & Low Memory Overhead**: The Spring Boot backend streams audio files directly from Cloudflare R2 (`storageService.getObject(key)`) through `java.util.zip.ZipOutputStream` into the HTTP response stream with `Deflater.BEST_SPEED`, avoiding temporary server files or JVM heap spikes.
4. **100% Browser Compatibility**: Initiates exactly one native attachment download, bypassing all browser multi-download blockers and pop-up suppressions across Chrome, Edge, Safari, and mobile browsers.

---

## 2. Requirements

### 2.1 Functional Requirements

- **FR-1 (Batch Download Ticket Issuance)**:
  - `POST /api/music-files/batch-download/ticket` accepts `{ musicFileIds: Long[] }`.
  - Requires JWT authentication.
  - Verifies that all requested `musicFileIds` belong to the authenticated user (`userId == current_user.id`) and have `ACTIVE` status.
  - Returns a secure random UUID ticket string valid for 60 seconds (single-use).
  - Rejects empty, non-existent, or fully unauthorized requests with `400 Bad Request` or `404 Not Found`.

- **FR-2 (Streaming ZIP Download Endpoint)**:
  - `GET /api/music-files/batch-download?ticket={ticket}` consumes the ticket.
  - Validates ticket existence and expiration; once consumed, the ticket is immediately invalidated (single-use).
  - Streams a valid ZIP archive with `Content-Type: application/zip`.
  - Employs RFC 5987 / RFC 6266 `Content-Disposition: attachment; filename="{asciiSafe}.zip"; filename*=UTF-8''{percentEncodedUtf8}.zip`.
  - Suggested default ZIP filename: `MusicHub_YYYYMMDD_HHmm.zip` or `MusicHub_{firstTrackTitle}_외_{N-1}곡.zip`.

- **FR-3 (Duplicate Filename Resolution inside ZIP)**:
  - If multiple tracks share the same resolved filename (e.g., two tracks named `Track 01.mp3`), append an incremental index: `Track 01.mp3`, `Track 01 (1).mp3`, `Track 01 (2).mp3`.

- **FR-4 (High Performance Deflate Strategy)**:
  - Since MP3, FLAC, and AAC/M4A audio files are already compressed, use `Deflater.BEST_SPEED` (level 1) or `STORED` (level 0) to avoid unnecessary CPU utilization on the server and maximize streaming throughput.

- **FR-5 (Frontend Batch Download Integration)**:
  - In `downloadBatch.ts`:
    - If `tracks.length === 1`: Continue using direct single-track download via R2 presigned URL (`musicApi.getDownloadUrl`) for instantaneous zero-egress download.
    - If `tracks.length > 1`: Invoke `musicApi.createBatchDownloadTicket`, and trigger native browser download via `triggerBrowserDownload(downloadUrl, zipFileName)`.
  - Updates progress and loading spinner in `BatchActionBar` (Library) and `ExtractionBatchActionBar` (Extraction).
  - Displays user-friendly toast notifications upon dispatch: `"N개 음원 압축 다운로드를 시작합니다."`.

### 2.2 Non-Functional Requirements

- **NFR-1 (Memory & Resource Safety)**:
  - Backend must not buffer entire audio files in memory or write temporary files to local disk. Data must pipe from S3 InputStream to HTTP OutputStream via a fixed 32KB buffer.
- **NFR-2 (Security & Isolation)**:
  - Strictly prevents downloading other users' tracks.
  - Tickets expire in 60 seconds and cannot be reused.
  - Ticket query endpoint does not require Authorization header so native browser navigation works, but is secured by the single-use unguessable ticket.
- **NFR-3 (UX Consistency)**:
  - Native browser download manager displays actual transfer speed and progress without blocking the frontend React UI thread.

---

## 3. Architecture & Data Flow

```text
┌────────────────┐                     ┌────────────────────┐                  ┌───────────────────┐
│ Client Browser │                     │ Spring Boot Server │                  │   Cloudflare R2   │
└───────┬────────┘                     └─────────┬──────────┘                  └─────────┬─────────┘
        │                                        │                                       │
        │ 1. POST /api/music-files/batch-        │                                       │
        │    download/ticket { ids: [1, 2, 3] }  │                                       │
        │    (Header: Authorization: Bearer JWT) │                                       │
        ├───────────────────────────────────────>│                                       │
        │                                        │ 2. Validate ownership & active status │
        │                                        │ 3. Create single-use ticket in-memory │
        │                                        │    (TTL: 60s)                         │
        │ 4. Return { ticket, downloadUrl }      │                                       │
        │<───────────────────────────────────────┤                                       │
        │                                        │                                       │
        │ 5. Trigger browser download navigation:│                                       │
        │    GET /api/music-files/batch-download │                                       │
        │        ?ticket={ticket}                │                                       │
        ├───────────────────────────────────────>│                                       │
        │                                        │ 6. Consume & invalidate ticket        │
        │                                        │ 7. Set Content-Type: application/zip  │
        │                                        │    Set Content-Disposition: attachment│
        │                                        │ 8. Init ZipOutputStream               │
        │                                        │                                       │
        │                                        │ 9. For each track:                    │
        │                                        │    s3Client.getObject(storageKey)────>│
        │                                        │<───Stream chunk (32KB)────────────────┤
        │<──Stream ZIP entry bytes───────────────┤                                       │
        │                                        │                                       │
        │                                        │ 10. zipOut.finish() & close           │
        │<──Complete ZIP download────────────────┤                                       │
        │ (Browser saves single .zip archive)    │                                       │
```

---

## 4. Backend Design

### 4.1 Batch Download Ticket Manager (`BatchDownloadTicketManager.kt`)
A thread-safe in-memory store for pending download tickets with automated expiry cleanup.

```kotlin
data class BatchDownloadTicket(
    val ticketId: String,
    val userId: Long,
    val musicFileIds: List<Long>,
    val createdAt: Instant = Instant.now(),
    val expiresAt: Instant = createdAt.plusSeconds(60)
)

@Component
class BatchDownloadTicketManager {
    private val tickets = ConcurrentHashMap<String, BatchDownloadTicket>()

    fun createTicket(userId: Long, musicFileIds: List<Long>): String {
        val ticketId = UUID.randomUUID().toString().replace("-", "")
        tickets[ticketId] = BatchDownloadTicket(ticketId, userId, musicFileIds)
        return ticketId
    }

    fun consumeTicket(ticketId: String): BatchDownloadTicket? {
        val ticket = tickets.remove(ticketId) ?: return null
        if (Instant.now().isAfter(ticket.expiresAt)) {
            return null
        }
        return ticket
    }

    @Scheduled(fixedRate = 60000)
    fun purgeExpired() {
        val now = Instant.now()
        tickets.entries.removeIf { now.isAfter(it.value.expiresAt) }
    }
}
```

### 4.2 Controller Endpoints (`MusicFileController.kt`)

```kotlin
data class BatchDownloadTicketRequest(
    @field:NotEmpty(message = "다운로드할 음원 ID 목록은 비어 있을 수 없습니다.")
    val musicFileIds: List<Long>
)

data class BatchDownloadTicketResponse(
    val ticket: String,
    val downloadUrl: String,
    val totalCount: Int,
    val totalBytes: Long
)
```

1. **Ticket Request**:
   - `POST /api/music-files/batch-download/ticket`
   - Authenticated with `@AuthenticationPrincipal user: UserPrincipal`.
   - Validates tracks:
     ```kotlin
     val (ticket, result) = musicFileService.createBatchDownloadTicket(user.id, request.musicFileIds)
     ```
2. **ZIP Stream Output**:
   - `GET /api/music-files/batch-download?ticket={ticket}`
   - Permitted in `SecurityConfig.kt` without Bearer JWT (authentication is carried by the one-time ticket).
   - Writes directly to `HttpServletResponse.outputStream` via `ZipOutputStream`.

### 4.3 Filename Resolution & Duplicate Handling
- Reuses `musicFileService.resolveDownloadFilename(musicFile)` for accurate track titles.
- Sanitizes file entries against zip-slip directory traversal (stripping `../`, `..\\`).
- De-duplicates identical file names in the zip archive:
  ```kotlin
  fun getUniqueZipEntryName(baseName: String, existingNames: MutableSet<String>): String {
      if (existingNames.add(baseName)) return baseName
      val dotIndex = baseName.lastIndexOf('.')
      val name = if (dotIndex != -1) baseName.substring(0, dotIndex) else baseName
      val ext = if (dotIndex != -1) baseName.substring(dotIndex) else ""
      var counter = 1
      while (true) {
          val candidate = "$name ($counter)$ext"
          if (existingNames.add(candidate)) return candidate
          counter++
      }
  }
  ```

---

## 5. Frontend Design

### 5.1 API Client (`musicApi.ts`)

```typescript
export interface BatchDownloadTicketResponse {
  ticket: string;
  downloadUrl: string;
  totalCount: number;
  totalBytes: Long;
}

export const musicApi = {
  // ... existing methods
  async createBatchDownloadTicket(musicFileIds: number[]): Promise<BatchDownloadTicketResponse> {
    const response = await apiClient.post<BatchDownloadTicketResponse>(
      '/music-files/batch-download/ticket',
      { musicFileIds }
    );
    return response.data;
  },
};
```

### 5.2 Batch Downloader Utility (`downloadBatch.ts`)

```typescript
export async function downloadTracksBatch(
  tracks: MusicFileDto[],
  onProgress?: (done: number, total: number) => void
): Promise<BatchDownloadResult> {
  if (tracks.length === 0) return { total: 0, successful: 0, failed: 0 };

  // Case 1: Single file -> direct presigned download (zero server egress, instant)
  if (tracks.length === 1) {
    const track = tracks[0];
    const { downloadUrl, fileName } = await musicApi.getDownloadUrl(track.id);
    triggerBrowserDownload(downloadUrl, fileName);
    onProgress?.(1, 1);
    return { total: 1, successful: 1, failed: 0 };
  }

  // Case 2: Multiple files -> Single ZIP archive download
  onProgress?.(0, tracks.length);
  const { downloadUrl } = await musicApi.createBatchDownloadTicket(tracks.map(t => t.id));
  triggerBrowserDownload(downloadUrl);
  onProgress?.(tracks.length, tracks.length);
  return { total: tracks.length, successful: tracks.length, failed: 0 };
}
```

### 5.3 UX Polish in `LibraryPage.tsx` and `ExtractionPage.tsx`
- Adds a helpful toast message: `"${tracks.length}개 음원을 ZIP 압축 파일로 다운로드합니다."`.
- Keeps UI action bar spinner active briefly while the ticket is created and browser download starts.

---

## 6. Verification Plan

1. **Backend Unit Tests**:
   - `BatchDownloadTicketManagerTest`: Verify ticket creation, expiry (TTL), and one-time consumption.
   - `MusicFileBatchDownloadTest`: Verify ownership check, 400 for empty IDs, and valid ZIP stream header & entries.
2. **Frontend Type & Lint Check**:
   - `pnpm --prefix frontend build` (TypeScript check).
   - `pnpm --prefix frontend lint` (ESLint clean).
3. **End-to-End Functional Verification**:
   - Select multiple tracks (2+ songs) in Library page -> click download -> single `.zip` file is downloaded.
   - Inspect `.zip` file contents: verify all selected tracks are present with correct filenames and intact audio content.
   - Select 1 track in Library page -> click download -> individual `.mp3` is directly downloaded.
   - Test in Extraction page batch action bar as well.
