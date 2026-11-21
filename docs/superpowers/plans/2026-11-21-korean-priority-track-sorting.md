# Korean Priority Track Sorting (Default Title ASC) Implementation Plan

- **Date:** 2026-11-21
- **Spec:** [docs/superpowers/specs/2026-11-21-korean-priority-track-sorting-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-21-korean-priority-track-sorting-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/track-korean-priority-sort` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: implement korean priority default title asc track sorting`).
2. **Architecture**:
   - PostgreSQL native query with regex-based `CASE` classification.
   - Fallback to standard dynamic sorting when non-title sort properties are explicitly requested.
   - Controller `@PageableDefault` set to `title,asc`.
   - Frontend `musicApi.listMusicFiles` default sort set to `title,asc`.

---

## 2. Step-by-Step Milestones

### Milestone 1: Git Branch Preparation
- [x] Create and checkout feature branch `feat/track-korean-priority-sort` from `dev`.

### Milestone 2: Backend Repository & Service Implementation
- [x] Update `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileRepository.kt`:
  - Add `findAllByUserIdAndStatusOrderByKoreanPriority` native query method with pagination.
- [x] Update `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileService.kt`:
  - Check `pageable.sort`: if unsorted or sorting by `title`, invoke `findAllByUserIdAndStatusOrderByKoreanPriority`.
  - Otherwise, delegate to `findAllByUserIdAndStatus(userId, MusicFileStatus.ACTIVE, pageable)`.
- [x] Update `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileController.kt`:
  - Update `@PageableDefault` to `sort = ["title"], direction = Sort.Direction.ASC`.

### Milestone 3: Backend Unit Tests
- [x] Add unit tests in `backend/src/test/kotlin/com/musichub/backend/domain/music/MusicFileServiceTest.kt` (or update existing test) to verify that `listMusicFiles` dispatches to Korean priority query when sort is `title,asc` or unsorted, and dispatches to standard repository method when another sort (e.g. `createdAt,desc`) is requested.

### Milestone 4: Frontend API & Component Updates
- [x] Update `frontend/src/api/musicApi.ts`:
  - Change default sort parameter of `listMusicFiles` to `'title,asc'`.
- [x] Verify `frontend/src/components/pages/library/LibraryPage.tsx`.

### Milestone 5: Verification & Merge
- [x] Verify frontend build (`pnpm build`).
- [x] Verify backend tests (`./gradlew test`).
- [x] Commit all changes with `type: subject`.
- [ ] Merge `feat/track-korean-priority-sort` into `dev` with `--no-ff`.
