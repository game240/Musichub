# Extraction Cancellation Overwrite Fix Design

## 1. Overview
When multiple extraction requests (or duplicate extraction requests for the same media) are queued or running, cancelling one job can sometimes result in the cancelled job erroneously transitioning to `COMPLETED`.
This occurs because:
1. `ExtractionService.processJobAsync` runs in an asynchronous thread (`@Async`) and holds an in-memory instance of `ExtractionJob` fetched at the start of the job.
2. When the user cancels a job, `cancelJob` updates the database record to `ExtractionJobStatus.CANCELLED`.
3. However, if the async execution (`processJobAsync`) does not terminate immediately (e.g. download finished right before cancel, or process termination didn't stop in-flight execution before R2 upload), it invokes `job.markCompleted(savedMusicFile)` and calls `extractionJobRepository.save(job)`.
4. JPA's `save(job)` performs a merge/update with the stale in-memory entity, overwriting the database's `CANCELLED` status with `COMPLETED`.
5. Additionally, the cancellation check relies solely on an in-memory Set (`cancelledJobIds`), which can be out-of-sync or cleared in `finally` blocks, instead of querying the actual database row status.

This design ensures that:
- Each extraction job row in the database is strictly protected against stale overwrites.
- An atomic conditional update query (`WHERE id = :jobId AND status != 'CANCELLED'`) prevents any cancelled row from transitioning to `COMPLETED`.
- Multi-stage cancellation checks query the database row state directly. If cancelled, in-flight work and newly generated artifacts (R2 audio/artwork, MusicFile entity, user storage usage delta) are cleaned up and discarded.
- In the frontend, cancelling an active job resets `focusedJobId` so that active cards seamlessly switch to remaining active jobs.

---

## 2. Goals & Non-Goals
### Goals
- Protect cancelled extraction jobs from being overwritten to `COMPLETED` at the database row level.
- Multi-stage checks in `processJobAsync` verifying database status (`status != CANCELLED`) before expensive operations (tag read, R2 upload, music file registration, completion).
- Atomic completion update: execute `UPDATE extraction_job SET status = 'COMPLETED', ... WHERE id = :jobId AND status != 'CANCELLED'`. If 0 rows updated (job was cancelled), rollback/delete any uploaded storage objects or created `MusicFile` entities and return cleanly.
- Frontend UX: reset `focusedJobId` on successful job cancellation so the active job card shifts focus to another in-progress job if available.

### Non-Goals
- Blocking duplicate extraction of the same YouTube video ID. Duplicate extractions remain permitted; each extraction operates on its own independent database row (`id`).
- Changing yt-dlp parameters or extraction quality settings.

---

## 3. Architecture & Changes

### 3.1 Backend: `ExtractionJobRepository.kt`
Add atomic update and query methods:
1. `findStatusById(id: Long): Optional<ExtractionJobStatus>` - lightweight query to fetch the current persisted status of a job.
2. `updateCompletedIfActive(jobId: Long, musicFile: MusicFile, completedAt: Instant, updatedAt: Instant): Int` - atomic update requiring `status != 'CANCELLED'`.
3. `updateStatusIfActive(jobId: Long, targetStatus: ExtractionJobStatus, updatedAt: Instant): Int` - atomic intermediate status update (`CONVERTING`, `UPLOADING`) ensuring cancelled rows are not reverted to active statuses.

### 3.2 Backend: `ExtractionService.kt`
1. In `processJobAsync`:
   - Replace in-memory-only checks with a combined check: `isCancelled(jobId)` checks `cancelledJobIds.contains(jobId)` OR `extractionJobRepository.findStatusById(jobId) == CANCELLED`.
   - Before converting, uploading, and saving `MusicFile`, check `if (isCancelled(jobId)) { cleanUp(); return }`.
   - Before saving `MusicFile`, verify job is not cancelled to avoid creating orphaned `MusicFile` records.
   - When marking completion:
     - Use `extractionJobRepository.updateCompletedIfActive(...)`.
     - If returned row count == 0:
       - The job was cancelled concurrently.
       - Delete the created `MusicFile` from `musicFileRepository` (and deduct storage usage from user).
       - Delete uploaded audio and artwork from `storageService`.
       - Log cancellation and cleanly return.
2. In `cancelJob`:
   - Ensure `cancelledJobIds.add(jobId)`.
   - Forcibly terminate active process.
   - Save `job.markCancelled()`.

### 3.3 Frontend: `ExtractionPage.tsx`
1. In `cancelJobMutation.onSuccess`:
   - Set `setFocusedJobId(null)` so `displayedJob` naturally falls back to the next active job in `activeJobs[0]` instead of staying locked on the cancelled job card.

---

## 4. Verification Plan
1. **Unit & Integration Tests**:
   - `ExtractionServiceTest`:
     - Test that cancelling a job prevents `updateCompletedIfActive` from overwriting status to `COMPLETED`.
     - Test that if cancellation occurs concurrently, the job remains `CANCELLED` and created `MusicFile`/storage objects are rolled back.
   - Run backend tests: `./gradlew test`
2. **Frontend Type Check & Build**:
   - Run `pnpm run build` in `frontend` to verify syntax and types.
