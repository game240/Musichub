# Design: Audio File Download Feature

- **Date:** 2026-11-21
- **Status:** Proposed (Awaiting Approval)
- **Target Components:** Backend (Spring Boot 3, Cloudflare R2, S3 SDK), Frontend (React 19, TypeScript, Lucide Icons, Library Page, Global Player)

---

## 1. Overview

MusicHub allows users to upload, manage, and stream their personal audio files (MP3, FLAC, M4A, etc.) securely stored in Cloudflare R2. Currently, users can stream playback, inspect metadata, edit ID3 tags, and delete files, but there is no mechanism to export or download their audio files back to their local devices.

This design introduces the **Audio File Download** capability:
1. **Direct-to-Client R2 Edge Download**: Leverages Cloudflare R2's zero-egress pricing model via S3 Presigned GET URLs with customized `response-content-disposition` parameters, bypassing server bandwidth and JVM thread bottlenecks.
2. **Metadata-Aware Filename Generation**: Automatically formats download filenames as `"{Artist} - {Title}.{ext}"` (with fallback to original filename), fully sanitized against OS-reserved characters.
3. **Cross-Browser UTF-8 Handling**: Employs RFC 5987 / RFC 6266 `filename*=UTF-8''...` encoding to ensure Korean, CJK, and accented characters display flawlessly without mojibake across modern and legacy browsers.
4. **Intuitive & Responsive UI**: Integrates seamless download action triggers in the library track row (`TrackRow`) and the currently playing bar (`GlobalPlayer`), with instant loading feedback to prevent duplicate downloads.

---

## 2. Requirements

### 2.1 Functional Requirements

- **FR-1 (Presigned Download Endpoint)**:
  - `GET /api/music-files/{id}/download` returns a short-lived (15 minutes) Presigned GET URL pointing directly to the object in Cloudflare R2.
  - The URL includes R2 query parameters specifying `response-content-disposition` set to `attachment` with the resolved filename.
- **FR-2 (Ownership & Access Control)**:
  - Download is strictly restricted to authenticated users owning the requested track (`user_id == current_user.id`).
  - Requests for non-existent, soft-deleted, or unauthorized tracks return `404 Not Found`.
- **FR-3 (Smart Filename Generation & Sanitization)**:
  - Filename resolution hierarchy:
    1. If `artist` and `title` are present: `"{artist} - {title}.{extension}"`
    2. If only `title` is present: `"{title}.{extension}"`
    3. Fallback: Original `fileName`
  - Sanitization: Replaces filesystem-reserved characters (`\ / : * ? " < > |`) with `_` and strips leading/trailing whitespace.
- **FR-4 (RFC 5987 / RFC 6266 Header Formatting)**:
  - Generates `Content-Disposition: attachment; filename="{asciiSafe}"; filename*=UTF-8''{percentEncodedUtf8}` so that UTF-8 characters (e.g. `아이유 - 밤편지.mp3`) are preserved in Chrome, Safari, Firefox, Edge, and mobile browsers.
- **FR-5 (Frontend Track Row Action)**:
  - Adds a "음원 다운로드" button (using Lucide `Download` icon) to the action column in `TrackRow`.
  - Visible on row hover alongside existing actions (`ListPlus`, `Pencil`, `Trash2`).
  - Shows tooltip "음원 다운로드" via the shared `Tooltip` atom.
- **FR-6 (Download Triggering & Feedback)**:
  - Clicking the download button displays an in-button loading spinner and disables repeat clicks.
  - Calls `musicApi.getDownloadUrl(id)`.
  - Dispatches browser attachment download via a dynamically managed invisible anchor.
  - Automatically resets button state once the download request is dispatched.
- **FR-7 (Global Player Action - Secondary Entrypoint)**:
  - Provides a download button in `GlobalPlayer` for the currently playing track so users can download while listening without navigating back to the track row.

### 2.2 Non-Functional Requirements

- **NFR-1 (Bandwidth & Cost Optimization)**:
  - Zero egress cost and near-zero server memory usage by offloading actual file transfer directly to Cloudflare R2.
  - Spring Boot server only handles lightweight JSON API authentication and URL signing (<15ms latency).
- **NFR-2 (Security)**:
  - Presigned download URLs expire after 15 minutes.
  - The download endpoint requires valid JWT authentication.
- **NFR-3 (UI Performance & StyleSeed Compliance)**:
  - 0ms visual responsiveness upon click (immediate loading indicator).
  - Adheres to Musichub dark UI palette (`#08090a`, `#0f1011`, `#5e6ad2`, `#8590ea`).

---

## 3. Architecture & Data Flow

```text
┌────────────────┐                     ┌────────────────────┐                  ┌───────────────────┐
│ Client Browser │                     │ Spring Boot Server │                  │   Cloudflare R2   │
└───────┬────────┘                     └─────────┬──────────┘                  └─────────┬─────────┘
        │                                        │                                       │
        │ 1. GET /api/music-files/{id}/download  │                                       │
        │    (Header: Authorization: Bearer JWT) │                                       │
        ├───────────────────────────────────────>│                                       │
        │                                        │ 2. Validate user ownership            │
        │                                        │    & active status                    │
        │                                        │ 3. Resolve & sanitize filename        │
        │                                        │ 4. Build S3 GetObjectPresignRequest   │
        │                                        │    with responseContentDisposition    │
        │                                        │                                       │
        │ 5. Return JSON:                        │                                       │
        │    { downloadUrl, fileName, fileSize } │                                       │
        │<───────────────────────────────────────┤                                       │
        │                                                                                │
        │ 6. Trigger direct download (GET presigned downloadUrl)                         │
        ├───────────────────────────────────────────────────────────────────────────────>│
        │                                                                                │
        │ 7. Stream audio binary directly with Content-Disposition: attachment           │
        │<───────────────────────────────────────────────────────────────────────────────┤
        │ (Browser downloads "아이유 - 밤편지.mp3")                                      │
```

---

## 4. Backend Design

### 4.1 Storage Service Interface (`StorageService.kt`)

```kotlin
interface StorageService {
    /** 스트리밍 재생용 임시 GET URL 생성 (기본 1시간 유효) */
    fun generatePresignedGetUrl(key: String, duration: Duration = Duration.ofHours(1)): String

    /** 음원 파일 다운로드용 임시 GET URL 생성 (Content-Disposition 첨부, 기본 15분 유효) */
    fun generatePresignedDownloadUrl(
        key: String,
        downloadFilename: String,
        duration: Duration = Duration.ofMinutes(15)
    ): String

    // ... existing upload, getObject, getMetadata, delete methods ...
}
```

### 4.2 Storage Service Implementation (`CloudflareR2StorageService.kt`)

```kotlin
override fun generatePresignedDownloadUrl(
    key: String,
    downloadFilename: String,
    duration: Duration
): String {
    // 1. Sanitize ASCII fallback (replace non-ASCII/special chars with '_')
    val asciiFallback = downloadFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    
    // 2. RFC 5987 / RFC 6266 UTF-8 percent-encoding
    val encodedUtf8 = URLEncoder.encode(downloadFilename, StandardCharsets.UTF_8.toString())
        .replace("+", "%20")
    
    val contentDisposition = "attachment; filename=\"$asciiFallback\"; filename*=UTF-8''$encodedUtf8"

    val getRequest = GetObjectRequest.builder()
        .bucket(bucketName)
        .key(key)
        .responseContentDisposition(contentDisposition)
        .build()

    val presignRequest = GetObjectPresignRequest.builder()
        .signatureDuration(duration)
        .getObjectRequest(getRequest)
        .build()

    return s3Presigner.presignGetObject(presignRequest).url().toString()
}
```

### 4.3 DTO & Domain Logic (`MusicFileController.kt` & `MusicFileService.kt`)

#### DTO
```kotlin
data class DownloadUrlResult(
    val downloadUrl: String,
    val fileName: String,
    val fileSize: Long
)
```

#### Filename Resolution in `MusicFileService.kt`
```kotlin
fun resolveDownloadFilename(musicFile: MusicFile): String {
    val extension = musicFile.fileName.substringAfterLast('.', "mp3")
    val baseName = when {
        !musicFile.artist.isNullOrBlank() && !musicFile.title.isNullOrBlank() ->
            "${musicFile.artist!!.trim()} - ${musicFile.title!!.trim()}"
        !musicFile.title.isNullOrBlank() ->
            musicFile.title!!.trim()
        else ->
            musicFile.fileName.substringBeforeLast('.')
    }
    // Sanitize illegal filesystem characters: \ / : * ? " < > |
    val sanitizedBase = baseName.replace(Regex("[\\\\/:*?\"<>|]"), "_").trim()
    return "$sanitizedBase.$extension"
}

@Transactional(readOnly = true)
fun getDownloadUrl(userId: Long, musicFileId: Long): DownloadUrlResult {
    val musicFile = musicFileRepository.findByIdAndUserId(musicFileId, userId)
        .filter { it.status == MusicFileStatus.ACTIVE }
        .orElseThrow { NoSuchElementException("음악 파일을 찾을 수 없습니다.") }

    val downloadFilename = resolveDownloadFilename(musicFile)
    val presignedUrl = storageService.generatePresignedDownloadUrl(
        key = musicFile.storageKey,
        downloadFilename = downloadFilename,
        duration = Duration.ofMinutes(15)
    )

    return DownloadUrlResult(
        downloadUrl = presignedUrl,
        fileName = downloadFilename,
        fileSize = musicFile.fileSize
    )
}
```

#### Controller Endpoint
```kotlin
@GetMapping("/{id}/download")
fun getDownloadUrl(
    @AuthenticationPrincipal user: UserPrincipal,
    @PathVariable id: Long
): ResponseEntity<DownloadUrlResult> {
    val result = musicFileService.getDownloadUrl(user.id, id)
    return ResponseEntity.ok(result)
}
```

---

## 5. Frontend Design

### 5.1 API Client (`frontend/src/api/musicApi.ts`) & Types (`frontend/src/types/music.ts`)

#### Type Definition
```typescript
export interface DownloadUrlResult {
  downloadUrl: string;
  fileName: string;
  fileSize: Long;
}
```

#### API Method
```typescript
async getDownloadUrl(id: number): Promise<DownloadUrlResult> {
  const response = await apiClient.get<DownloadUrlResult>(`/music-files/${id}/download`);
  return response.data;
}
```

### 5.2 Browser Download Helper (`frontend/src/utils/downloadFile.ts`)

```typescript
/**
 * Triggers a browser download using a temporary hidden anchor tag.
 */
export function triggerBrowserDownload(url: string, fileName?: string): void {
  const link = document.createElement('a');
  link.href = url;
  if (fileName) {
    link.download = fileName;
  }
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

### 5.3 UI Components

#### 1. `TrackRow.tsx`
- Add `Download` icon button in the action column (`관리`):
  ```tsx
  <Tooltip content="음원 다운로드" side="top">
    <button
      type="button"
      onClick={() => onDownload(track)}
      disabled={isDownloading}
      className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
    >
      {isDownloading ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />}
    </button>
  </Tooltip>
  ```
- Manage downloading track ID state in `TrackTable` or `LibraryPage` to indicate loading feedback.

#### 2. `GlobalPlayer.tsx`
- Add a download icon button adjacent to the queue toggle or in the now-playing section:
  ```tsx
  <Tooltip content="현재 재생 곡 다운로드" side="top">
    <button
      type="button"
      onClick={() => handleDownload(currentTrack)}
      disabled={isDownloadingCurrent}
      className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
    >
      <Download className="w-4 h-4" />
    </button>
  </Tooltip>
  ```

---

## 6. Edge Cases & Handling

1. **Korean / CJK / Accented Filenames**:
   - RFC 5987 `filename*=UTF-8''...` guarantees proper character decoding on all modern browsers without UTF-8 corruption.
2. **Illegal Characters in Metadata**:
   - Track titles like `AC/DC - Highway to Hell?` or `Song "Remix"` sanitized to `AC_DC - Highway to Hell_` and `Song _Remix_`.
3. **Empty / Blank Metadata**:
   - Falls back safely to original uploaded `fileName` (preserving extension).
4. **Deleted / Inaccessible Track**:
   - Attempting to download a deleted track returns `404 Not Found`. Frontend displays an error toast.
5. **Slow / Interrupted Downloads**:
   - Presigned URL valid for 15 minutes allows ample time for TCP connection initialization and resume. Egress bandwidth handled by Cloudflare R2's global edge network.

---

## 7. Verification & Testing Strategy

1. **Backend Tests**:
   - Unit test for `resolveDownloadFilename`: test artist+title, title only, blank metadata, forbidden chars (`/ \ : * ? " < > |`), and Korean hangul.
   - Unit test for `generatePresignedDownloadUrl`: verify `responseContentDisposition` header format with RFC 5987 encoding.
   - Unit test for `getDownloadUrl`: verify success response and authorization verification (`NoSuchElementException` when user does not own track).
2. **Frontend Tests**:
   - Component rendering and click event triggering.
   - Build & lint verification: `npm run build && npm run lint`.
3. **End-to-End Verification**:
   - Upload an MP3 with Korean metadata (`아이유 - 밤편지.mp3`).
   - Click download in Library track row: verify file downloads immediately with the exact name `아이유 - 밤편지.mp3`.
   - Play the track and click download in the Global Player: verify file downloads identically.
