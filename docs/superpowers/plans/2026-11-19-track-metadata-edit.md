# Track Metadata Edit with Async R2 Tag Rewriting Implementation Plan

- **Date:** 2026-11-19
- **Spec:** [docs/superpowers/specs/2026-11-19-track-metadata-edit-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-19-track-metadata-edit-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/track-metadata-edit` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: add optimistic metadata edit with async r2 tag rewriting and floating status ui`).
2. **Architecture**:
   - Backend: Instant DB update + async R2 tag rewrite via `CompletableFuture`.
   - Frontend: `tagSyncStore.ts` for managing background sync tasks.
   - UI: `FloatingTagSyncWidget.tsx` (fixed at bottom-right, above player bar).
   - Instant modal dismissal upon successful DB update response.

---

## 2. Step-by-Step Milestones

### Milestone 1: Backend Async Tag Rewriting
- [x] In `MusicFileService.kt`:
  - Update `updateMetadata`:
    - Update entity fields in DB immediately and return updated entity.
    - Launch `CompletableFuture.runAsync` to perform `rewriteR2Tags(...)`.
  - Implement `rewriteR2Tags(musicFileId: Long, request: UpdateMusicMetadataRequest)`.
- [x] Update `MusicFileServiceUpdateTest.kt` to verify immediate return and async execution.

### Milestone 2: Frontend Tag Sync Store & Floating Status Widget
- [x] Create `frontend/src/stores/tagSyncStore.ts`:
  - State: `tasks: TagSyncTask[]`.
  - Actions: `addTask`, `completeTask`, `failTask`, `removeTask`.
- [x] Create `frontend/src/components/organisms/FloatingTagSyncWidget.tsx`:
  - Fixed position at `bottom-24 right-6 z-50` (just above the global player).
  - Clean Linear-dark badge style with Spinner / Check / Alert icons.
  - Auto-dismiss after 3.5s on completion.
- [x] Render `FloatingTagSyncWidget` in `App.tsx`.

### Milestone 3: Modal UX Optimization
- [x] Update `EditMetadataModal.tsx`:
  - When user submits, call `updateMetadata`.
  - Since API returns in ~20ms, immediately close modal and register a task in `tagSyncStore`.
  - Update `LibraryPage.tsx` and `playerStore` with new data immediately.

### Milestone 4: Verification & Compilation
- [x] Backend tests: `./gradlew test`.
- [x] Frontend verification: `npm run build` and `npm run lint`.
- [ ] Git commit & merge to `dev` with `--no-ff`.
