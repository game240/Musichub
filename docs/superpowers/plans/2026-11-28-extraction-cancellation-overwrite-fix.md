# Extraction Cancellation Overwrite Fix Plan

- [x] Cut feature branch `feat/fix-extraction-cancellation-overwrite` from `dev`
- [x] Backend: Update `ExtractionJobRepository.kt`
  - [x] Add `findStatusById(id: Long): Optional<ExtractionJobStatus>`
  - [x] Add `@Modifying @Query` for `updateCompletedIfActive`
  - [x] Add `@Modifying @Query` for `updateStatusIfActive`
- [x] Backend: Update `ExtractionService.kt`
  - [x] Add helper `isCancelled(jobId: Long): Boolean` checking both in-memory set and DB status
  - [x] Check cancellation before converting, uploading, and music file persistence
  - [x] Use atomic conditional update on job completion; rollback artifacts if cancelled
- [x] Frontend: Update `ExtractionPage.tsx`
  - [x] Reset `focusedJobId` to `null` on successful cancellation
- [x] Backend: Update and add tests in `ExtractionServiceTest.kt`
  - [x] Verify cancellation prevents completed state overwrite
  - [x] Verify atomic update behavior when job is cancelled
- [x] Run backend tests (`./gradlew test`)
- [x] Run frontend build (`pnpm run build`)
- [x] Commit changes with `fix: prevent cancelled extraction jobs from overwriting to completed`
- [x] Merge `feat/fix-extraction-cancellation-overwrite` into `dev` with `--no-ff`
