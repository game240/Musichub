# Design: Track Metadata Edit Feature (Optimistic DB Update + Real Async Status Tracking)

## Overview
Allows authenticated users to view and edit metadata (title, artist, album, year, genre, track number, and lyrics) of their uploaded music files.

The design provides **zero-latency UI feedback** while maintaining **100% truthful background status tracking**:
1. When saved, PostgreSQL DB fields are updated immediately (<10ms) with `tag_sync_status = 'SYNCING'`, and the modal closes instantly.
2. A background worker performs the heavy R2 audio file download $\rightarrow$ Jaudiotagger ID3/Vorbis tag rewrite $\rightarrow$ R2 upload overwrite.
3. Upon completion, the backend updates `tag_sync_status = 'SYNCED'`. If any failure occurs (network, corrupted audio header), it sets `tag_sync_status = 'FAILED'`.
4. The frontend polls `GET /api/music-files/{id}/sync-status` every 1.5s to display the **real status** in the bottom-right floating widget (Spinner $\rightarrow$ Green Check on real success, Red Warning on real failure).

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1**: Users can trigger an edit dialog from the library track row (via an edit icon button).
- **FR-2**: Submitting the form calls `PATCH /api/music-files/{id}`.
- **FR-3**: The endpoint immediately updates the PostgreSQL database, sets `tag_sync_status = 'SYNCING'`, and returns the updated `MusicFileDto`.
- **FR-4**: Frontend immediately:
  - Closes the modal.
  - Updates the library track list and currently playing track info (0ms latency).
  - Starts actively polling the track's real status via `GET /api/music-files/{id}/sync-status`.
- **FR-5**: Backend executes the R2 binary tag rewrite asynchronously:
  - Downloads original file from R2.
  - Rewrites ID3v2.3 / Vorbis tags with `MetadataWriter`.
  - Re-uploads modified file to R2.
  - On success: sets `tag_sync_status = 'SYNCED'`.
  - On failure: logs error and sets `tag_sync_status = 'FAILED'`.
- **FR-6**: The bottom-right floating widget reflects true backend state:
  - While `SYNCING`: Spinner + `"{title}" R2 오디오 파일 태그 동기화 중...`
  - When `SYNCED`: Checkmark + `"{title}" 클라우드 파일 태그 동기화 완료` (auto-dismiss after 3.5s).
  - When `FAILED`: Alert icon + `"{title}" 파일 태그 동기화 실패 (R2 업데이트 오류)` (user dismissable).

---

## 2. Backend Design

### 2.1 Database Migration (`V3__add_tag_sync_status.sql`)
```sql
ALTER TABLE music_file ADD COLUMN tag_sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED';
```

### 2.2 Domain Model (`MusicFile.kt`)
```kotlin
enum class TagSyncStatus {
    SYNCED,
    SYNCING,
    FAILED
}

@Enumerated(EnumType.STRING)
@Column(name = "tag_sync_status", nullable = false, length = 32)
var tagSyncStatus: TagSyncStatus = TagSyncStatus.SYNCED
```

### 2.3 Endpoint: `GET /api/music-files/{id}/sync-status`
- Response:
  ```json
  {
    "id": 123,
    "status": "SYNCING" // or "SYNCED", "FAILED"
  }
  ```

---

## 3. Frontend Design

### 3.1 Tag Sync Store (`frontend/src/stores/tagSyncStore.ts`)
- Starts active polling (interval: 1,500ms) for each syncing track.
- Calls `musicApi.getSyncStatus(trackId)`.
- When response status is `SYNCED`:
  - Changes task status to `completed`.
  - Stops polling for this track.
  - Invalidates React Query cache to sync updated file size/status.
  - Auto-dismisses badge after 3.5s.
- When response status is `FAILED`:
  - Changes task status to `error`.
  - Stops polling.
  - Displays error toast.

---

## 4. Verification & Testing
1. **Backend Tests**:
   - Verify `updateMetadata` sets status to `SYNCING` and returns immediately.
   - Verify successful `rewriteR2Tags` sets status to `SYNCED`.
   - Verify failed `rewriteR2Tags` sets status to `FAILED`.
   - Verify `GET /api/music-files/{id}/sync-status` returns correct status.
2. **Frontend Tests**:
   - Verify polling detects transition from `SYNCING` to `SYNCED`.
   - Verify polling handles `FAILED` and displays error badge.
   - Verify `tsc -b && vite build` and `eslint` pass.
