# Audio Tag Resync Feature Implementation Plan

- **Date:** 2026-11-19
- **Spec:** [docs/superpowers/specs/2026-11-19-tag-resync-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-19-tag-resync-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/tag-resync` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: add audio tag resync retry button and endpoint`).
2. **Architecture**:
   - Backend: `POST /api/music-files/{id}/resync-tags` endpoint and service logic.
   - Frontend: `tagSyncStore.retrySync` action and "재시도" button in `FloatingTagSyncWidget`.

---

## 2. Step-by-Step Milestones

### Milestone 1: Backend Resync Endpoint & Service
- [x] In `MusicFileService.kt`:
  - Add `resyncTags(userId: Long, musicFileId: Long): TagSyncStatus`.
  - Fetch track, build request from DB metadata, set `tagSyncStatus = TagSyncStatus.SYNCING`, launch `rewriteR2Tags`.
- [x] In `MusicFileController.kt`:
  - Add `POST /api/music-files/{id}/resync-tags` endpoint.
- [x] Update unit tests in `MusicFileServiceUpdateTest.kt`.

### Milestone 2: Frontend API & Store
- [x] In `frontend/src/api/musicApi.ts`:
  - Add `resyncTags(id: number): Promise<{ id: number; status: 'SYNCED' | 'SYNCING' | 'FAILED' }>`.
- [x] In `frontend/src/stores/tagSyncStore.ts`:
  - Add `retrySync(id: string): Promise<void>`.
  - Reset status to `syncing` and restart polling loop.

### Milestone 3: Floating Status Widget UI
- [x] In `frontend/src/components/organisms/FloatingTagSyncWidget.tsx`:
  - In error card, render "재시도" button with `RotateCcw` icon.
  - Wire onClick to `retrySync(task.id)`.

### Milestone 4: Verification & Compilation
- [x] Backend tests: `./gradlew test`.
- [x] Frontend build & lint: `npm run build && npm run lint`.
- [ ] Git commit & merge to `dev` with `--no-ff`.
