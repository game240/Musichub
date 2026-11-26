# Tag Sync Overwrite & Race Condition Fix Design

## 1. Overview
When updating track metadata via `updateMetadata`, the database record is updated within a transaction. However, `CompletableFuture.runAsync { rewriteR2Tags(musicFileId, request) }` was dispatched before transaction commit.
Consequently, `rewriteR2Tags` in an asynchronous thread could read a stale snapshot of `MusicFile` (prior to the commit). Upon completing the R2 audio tag rewrite, it called `musicFileRepository.save(musicFile)` with the stale entity, overwriting newly updated or cleared metadata (e.g. cleared album names being restored).

This design fixes the race condition by deferring the async dispatch until after transaction commit and ensuring `rewriteR2Tags` updates only sync status and file size on the latest entity.

---

## 2. Goals & Non-Goals
### Goals
- Ensure `rewriteR2Tags` runs only after the `updateMetadata` (or `resyncTags`) transaction is fully committed (`afterCommit`).
- Ensure `rewriteR2Tags` fetches the latest entity on completion/failure and updates only `tagSyncStatus`, `fileSize`, and storage usage delta without overwriting metadata fields.
- Prevent cleared or updated metadata from reverting to previous values.

### Non-Goals
- Changing the R2 ID3 tagging logic (`metadataWriter.updateTags`).
- Changing frontend API contracts.

---

## 3. Architecture & Changes

### 3.1 `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileService.kt`
1. Use `TransactionSynchronizationManager.registerSynchronization` inside `updateMetadata` and `resyncTags` to trigger `CompletableFuture.runAsync { rewriteR2Tags(...) }` in `afterCommit()`. Fallback to immediate `runAsync` when synchronization is not active (e.g. unit tests without transaction manager).
2. In `rewriteR2Tags`:
   - After R2 upload, fetch latest `MusicFile` entity via `musicFileRepository.findById(musicFileId)`.
   - Update `currentFile.fileSize = newSize` and `currentFile.tagSyncStatus = TagSyncStatus.SYNCED`.
   - Update storage usage delta on `currentFile.user`.
   - Save `currentFile`.
   - In catch block, fetch latest `MusicFile` and set `tagSyncStatus = TagSyncStatus.FAILED`.

---

## 4. Verification Plan
1. **Unit & Integration Tests**:
   - Run `./gradlew test --tests *MusicFileServiceUpdateTest*`
   - Run `./gradlew test` to ensure all backend tests pass.
2. **Behavioral Verification**:
   - Verify clearing album name and saving persists across refetches and sync completion.
