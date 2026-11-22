# Implementation Plan: Toast Notification on Duplicate Track Selection in Playlist Queue

- **Date:** 2026-11-22
- **Spec:** [docs/superpowers/specs/2026-11-22-queue-duplicate-toast-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-22-queue-duplicate-toast-design.md)
- **Status:** In Progress
- **Target Components:**
  - `frontend/src/stores/toastStore.ts`
  - `frontend/src/components/molecules/Toast.tsx`
  - `frontend/src/components/organisms/ToastContainer.tsx`
  - `frontend/src/components/templates/AppLayout.tsx`
  - `frontend/src/stores/playerStore.ts`
  - `frontend/src/components/pages/library/LibraryPage.tsx`
  - `backend/src/main/kotlin/com/musichub/backend/domain/playback/PlaybackService.kt`
  - `backend/src/test/kotlin/com/musichub/backend/domain/playback/PlaybackServiceTest.kt`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - `AGENTS.md`: "feat/* - feature branches cut from dev, merged back with --no-ff".
   - Commit format: `type: subject` (e.g. `feat: add toast notification for duplicate track additions`).
2. **Scope**:
   - Create generic `toastStore` and `Toast` / `ToastContainer` UI.
   - Update `playerStore.ts` to return add/duplicate metrics on `addToQueue` and `addTracksToQueue`.
   - Update `LibraryPage.tsx` to display Option B toast notifications.
   - Update `PlaybackService.kt` and `PlaybackServiceTest.kt` with distinct safeguards.
   - Run verification builds, tests, and commit/merge.

---

## 2. Step-by-Step Milestones

### Milestone 1: Toast System (`toastStore.ts`, `Toast.tsx`, `ToastContainer.tsx`, `AppLayout.tsx`)
- [ ] Create `frontend/src/stores/toastStore.ts` with typed methods (`info`, `success`, `warning`, `error`).
- [ ] Create `frontend/src/components/molecules/Toast.tsx` with Linear style and icons.
- [ ] Create `frontend/src/components/organisms/ToastContainer.tsx`.
- [ ] Mount `ToastContainer` inside `AppLayout.tsx`.

### Milestone 2: Store Metrics & Library Integration (`playerStore.ts`, `LibraryPage.tsx`)
- [ ] Update `playerStore.ts`:
  - `addToQueue` returns `{ added: boolean }`.
  - `addTracksToQueue` returns `{ addedCount: number; duplicateCount: number }`.
  - Deduplicate in `playTrack` and `initPlaybackState`.
- [ ] Update `LibraryPage.tsx`:
  - Wire single add (`onAddToQueue`) to trigger duplicate/success toast.
  - Wire batch add (`handleBatchAddToQueue`) to trigger all duplicate, partial duplicate, or success toast.

### Milestone 3: Backend Safeguard & Tests (`PlaybackService.kt`, `PlaybackServiceTest.kt`)
- [ ] Apply `.distinct()` on `queueTrackIds` and `shuffledTrackIds` in `PlaybackService.kt`.
- [ ] Add unit test in `PlaybackServiceTest.kt` to ensure duplicate IDs in request and DB are deduplicated.

### Milestone 4: Verification & Git Merge
- [ ] Run backend unit tests (`./gradlew test`).
- [ ] Run frontend build (`pnpm run build`) and lint (`pnpm run lint`).
- [ ] Commit on `feat/queue-duplicate-toast` and merge to `dev` with `--no-ff`.
