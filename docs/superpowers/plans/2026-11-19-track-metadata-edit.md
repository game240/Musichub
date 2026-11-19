# Track Metadata Edit with Real Async Status Tracking Implementation Plan

- **Date:** 2026-11-19
- **Spec:** [docs/superpowers/specs/2026-11-19-track-metadata-edit-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-19-track-metadata-edit-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/track-metadata-edit` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: implement real background tag sync status tracking and polling`).
2. **Architecture**:
   - PostgreSQL 16 migration (`V3__add_tag_sync_status.sql`).
   - `MusicFile.tagSyncStatus` enum (`SYNCED`, `SYNCING`, `FAILED`).
   - Endpoint `GET /api/music-files/{id}/sync-status`.
   - Frontend `tagSyncStore.ts` polls real backend sync status until terminal state.

---

## 2. Step-by-Step Milestones

### Milestone 1: Database Migration & Domain Entity
- [x] Create Flyway migration `backend/src/main/resources/db/migration/V3__add_tag_sync_status.sql`:
  - `ALTER TABLE music_file ADD COLUMN tag_sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED';`
- [x] Update `MusicFile.kt`:
  - Add `TagSyncStatus` enum (`SYNCED`, `SYNCING`, `FAILED`).
  - Add `var tagSyncStatus: TagSyncStatus = TagSyncStatus.SYNCED` property.

### Milestone 2: Backend Status Management & Sync-Status Endpoint
- [x] In `MusicFileService.kt`:
  - In `updateMetadata`: set `musicFile.tagSyncStatus = TagSyncStatus.SYNCING`.
  - In `rewriteR2Tags`:
    - On success: set `musicFile.tagSyncStatus = TagSyncStatus.SYNCED`.
    - On catch: set `musicFile.tagSyncStatus = TagSyncStatus.FAILED`.
  - Add `getSyncStatus(userId: Long, musicFileId: Long): TagSyncStatus`.
- [x] In `MusicFileController.kt`:
  - Add `GET /api/music-files/{id}/sync-status` returning `{ "id": id, "status": "SYNCING" | "SYNCED" | "FAILED" }`.
- [x] Update `MusicFileServiceUpdateTest.kt` to verify status transitions.

### Milestone 3: Frontend API & Real Polling Store
- [x] In `frontend/src/api/musicApi.ts`:
  - Add `getSyncStatus(id: number): Promise<{ id: number; status: 'SYNCED' | 'SYNCING' | 'FAILED' }>`.
- [x] In `frontend/src/stores/tagSyncStore.ts`:
  - Replace `setTimeout` with actual `setInterval` polling `musicApi.getSyncStatus`.
  - On `SYNCED`: mark completed, stop polling, auto-dismiss after 3.5s.
  - On `FAILED`: mark error, stop polling, show error message.

### Milestone 4: Verification & Compilation
- [x] Run backend tests: `./gradlew test`.
- [x] Run frontend build & lint: `npm run build && npm run lint`.
- [ ] Merge to `dev` with `--no-ff`.
