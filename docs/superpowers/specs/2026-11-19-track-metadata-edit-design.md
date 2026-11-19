# Design: Track Metadata Edit Feature (Optimistic DB Update + Async R2 Tag Rewriting)

## Overview
Allows authenticated users to view and edit metadata (title, artist, album, year, genre, track number, and lyrics) of their uploaded music files.

To provide instant UI responsiveness without blocking the user, **changes are saved to the PostgreSQL database immediately (<10ms)**, closing the modal and updating the UI instantly. Meanwhile, the heavy task of **downloading from Cloudflare R2, rewriting audio ID3/Vorbis tags via Jaudiotagger, and re-uploading to R2** runs asynchronously in the background. A sleek bottom-right floating widget (Linear-style) informs the user of the ongoing background sync status until completion.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1**: Users can trigger an edit dialog from the library track row (via an edit icon button).
- **FR-2**: Submitting the form calls `PATCH /api/music-files/{id}`.
- **FR-3**: The endpoint immediately updates the PostgreSQL database and returns the updated `MusicFileDto`.
- **FR-4**: Frontend immediately:
  - Closes the modal.
  - Updates the library track list and currently playing track info (0ms latency).
  - Enqueues a background sync task in a global toast/floating badge widget located at the bottom-right of the screen.
- **FR-5**: Backend executes the R2 binary tag rewrite asynchronously:
  - Downloads original file from R2.
  - Rewrites ID3v2.3 / Vorbis tags with `MetadataWriter`.
  - Re-uploads modified file to R2.
  - Updates `file_size` and storage usage delta in DB.
- **FR-6**: The bottom-right floating badge displays:
  - In progress: Spinner + `"{title}" 오디오 파일(R2) 태그 동기화 중...`
  - Completed: Checkmark + `"{title}" 파일 태그 동기화 완료!` (auto-dismiss after 3-4s).

### 1.2 Non-Functional Requirements
- **NFR-1**: Instant responsiveness: Submitting the modal takes < 50ms total network round-trip.
- **NFR-2**: Robust error handling: If the background R2 tag update fails, errors are logged and status reflects failure without breaking the user's DB metadata.
- **NFR-3**: Clean Linear Dark UI styling for the floating status widget (`#0f1011`, border `white/[0.1]`, accent `#5e6ad2`).

---

## 2. Backend Design

### 2.1 Async Configuration & Service Structure
- In `MusicFileService`:
  1. `updateMetadata(userId: Long, musicFileId: Long, request: UpdateMusicMetadataRequest): MusicFile`:
     - Updates `musicFile` entity in DB (`title`, `artist`, `album`, `year`, `genre`, `trackNumber`, `lyrics`).
     - Returns updated entity immediately.
     - Triggers `asyncRewriteR2Tags(musicFileId, request)` via `CompletableFuture.runAsync` or Spring `@Async`.
  2. `rewriteR2Tags(musicFileId: Long, request: UpdateMusicMetadataRequest)`:
     - Downloads from R2 to temp file.
     - Updates audio binary tags.
     - Re-uploads to R2.
     - Updates `fileSize` in DB.

---

## 3. Frontend Design

### 3.1 Background Sync Store (`frontend/src/stores/tagSyncStore.ts`)
```typescript
export interface TagSyncTask {
  id: string;
  trackId: number;
  title: string;
  status: 'syncing' | 'completed' | 'error';
  errorMessage?: string;
}
```
Provides:
- `tasks: TagSyncTask[]`
- `startSync(trackId: number, title: string): string`
- `completeSync(taskId: string)`
- `failSync(taskId: string, error: string)`

### 3.2 Floating Status Widget (`frontend/src/components/organisms/FloatingTagSyncWidget.tsx`)
- Rendered globally (e.g., in `App.tsx` or layout, positioned fixed at `bottom-24 right-6` above the player bar).
- Displays active sync tasks with spinner and smooth entry/exit animations.

### 3.3 Edit Modal (`EditMetadataModal.tsx`)
- On form submit:
  - Calls `musicApi.updateMetadata(track.id, payload)`.
  - On API response (instant ~20ms):
    - Registers task in `tagSyncStore`.
    - Fires `onSuccess(updatedTrack)`.
    - Closes modal immediately!

---

## 4. Verification & Testing
1. **Backend Tests**:
   - Verify `updateMetadata` updates and returns `MusicFile` immediately.
   - Verify background tag rewriting runs without blocking.
2. **Frontend Tests**:
   - Modal closes instantly on Save.
   - Library table displays updated title immediately.
   - Bottom-right widget appears showing sync progress and transitions to completion.
   - `tsc -b && vite build` and `eslint` pass.
