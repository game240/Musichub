# Design: Audio Tag Resync Feature (Retry Failed R2 Tag Sync)

## Overview
Provides a retry mechanism when an asynchronous audio file tag rewrite/upload to Cloudflare R2 fails. A "재시도" (Retry/Resync) button appears directly on the failed status card in the bottom-right floating widget, allowing users to re-trigger the background sync process with one click.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1**: When a tag sync task reaches `status: 'error'`, the bottom-right floating widget renders a "재시도" (Retry) action button next to the error message.
- **FR-2**: Clicking "재시도":
  - Calls backend `POST /api/music-files/{id}/resync-tags`.
  - Resets task status in `tagSyncStore` back to `'syncing'`.
  - Re-initiates real backend status polling (every 1.5s).
- **FR-3**: Backend endpoint `POST /api/music-files/{id}/resync-tags`:
  - Verifies track exists and is owned by authenticated user.
  - Reads current DB metadata (title, artist, album, year, genre, trackNumber, lyrics).
  - Sets `tagSyncStatus = TagSyncStatus.SYNCING` in DB.
  - Spawns background worker `rewriteR2Tags(...)`.
  - Returns `200 OK` with `{ "id": id, "status": "SYNCING" }`.

### 1.2 Non-Functional Requirements
- **NFR-1**: Seamless UX: Instant transition from error state back to spinning sync state without full page reload.
- **NFR-2**: Visual consistency: Compact, subtle button matching the Linear Dark theme (`text-xs text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded px-2 py-1`).

---

## 2. Backend Design

### 2.1 Endpoint: `POST /api/music-files/{id}/resync-tags`
- **Authentication**: Required (`Bearer <access_token>`)
- **Controller (`MusicFileController.kt`)**:
  ```kotlin
  @PostMapping("/{id}/resync-tags")
  fun resyncTags(
      @AuthenticationPrincipal user: UserPrincipal,
      @PathVariable id: Long
  ): ResponseEntity<TagSyncStatusResponse> {
      val status = musicFileService.resyncTags(user.id, id)
      return ResponseEntity.ok(TagSyncStatusResponse(id = id, status = status.name))
  }
  ```
- **Service (`MusicFileService.kt`)**:
  ```kotlin
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
  ```

---

## 3. Frontend Design

### 3.1 API Client (`musicApi.ts`)
```typescript
async resyncTags(id: number): Promise<{ id: number; status: 'SYNCED' | 'SYNCING' | 'FAILED' }> {
  const response = await apiClient.post(`/music-files/${id}/resync-tags`);
  return response.data;
}
```

### 3.2 Store (`tagSyncStore.ts`)
Add `retrySync: (taskId: string) => Promise<void>`:
- Finds task by `id`.
- Calls `musicApi.resyncTags(task.trackId)`.
- Updates task: `status = 'syncing'`, `errorMessage = undefined`.
- Restarts polling loop.

### 3.3 UI Component (`FloatingTagSyncWidget.tsx`)
- When `isError`:
  - Show a small "재시도" button with `RotateCcw` icon.
  - Clicking it triggers `retrySync(task.id)`.

---

## 4. Verification & Testing
1. **Backend Tests**:
   - Test `resyncTags` triggers background task and sets status to `SYNCING`.
   - Verify non-owner gets 404/NoSuchElementException.
2. **Frontend Tests**:
   - Verify retry button appears on error.
   - Verify clicking retry calls `resyncTags` and transitions badge to `syncing`.
   - Verify `tsc -b && vite build` and `eslint` pass.
