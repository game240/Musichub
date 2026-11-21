# Playback Queue & Shuffle Synchronization Implementation Plan

- **Date:** 2026-11-21
- **Spec:** [docs/superpowers/specs/2026-11-21-playback-queue-and-shuffle-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-21-playback-queue-and-shuffle-design.md)
- **Status:** Completed (Awaiting Merge)
- **Branch:** `feat/playback-queue-sync`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/playback-queue-sync` cut from `dev`. Do not push to remote unless asked.
   - Commit format: `type: subject` (e.g. `feat: add user playback state persistence with dual queue shuffle`).
2. **Architecture**:
   - PostgreSQL 16 & Flyway migration `V5__create_user_playback_state.sql`.
   - Native `BIGINT[]` array columns mapped via `@JdbcTypeCode(SqlTypes.ARRAY)` for high I/O throughput single-row state updates.
   - True Fisher-Yates dual-queue shuffle preventing duplicate track playback and enabling full `playPrev` traversal.
   - Debounced (2.5s) sync from frontend to server, with clean restoration on app bootstrap.

---

## 2. Step-by-Step Milestones

### Milestone 1: Database Migration & Backend Entity
- [x] Create Flyway migration script `backend/src/main/resources/db/migration/V5__create_user_playback_state.sql`:
  - Create table `user_playback_state` with columns: `user_id`, `current_track_id`, `queue_track_ids`, `shuffled_track_ids`, `queue_index`, `is_shuffle`, `repeat_mode`, `current_position_ms`, `updated_at`.
- [x] Create domain package `com.musichub.backend.domain.playback`.
- [x] Create entity `PlaybackState.kt`:
  - Map `queue_track_ids` and `shuffled_track_ids` to `List<Long>`.
  - Add mutation method `updateState(...)`.
- [x] Create repository `PlaybackStateRepository.kt` extending `JpaRepository<PlaybackState, Long>`.

### Milestone 2: Backend Service, DTOs & API Endpoint
- [x] Create DTOs:
  - `PlaybackStateResponse(currentTrack, queue, shuffledQueue, queueIndex, isShuffle, repeatMode, currentPositionMs)`
  - `UpdatePlaybackStateRequest(currentTrackId, queueTrackIds, shuffledTrackIds, queueIndex, isShuffle, repeatMode, currentPositionMs)`
- [x] Create `PlaybackService.kt`:
  - `getPlaybackState(userId: Long): PlaybackStateResponse`:
    - Fetch user's `PlaybackState` or return empty default.
    - Query `musicFileRepository.findAllByIdIn(...)` for existing tracks.
    - Filter deleted tracks and build sorted `MusicFileDto` lists matching the stored order.
  - `updatePlaybackState(userId: Long, request: UpdatePlaybackStateRequest)`:
    - Upsert `PlaybackState` for the user.
- [x] Create `PlaybackController.kt`:
  - `GET /api/users/me/playback` returning `PlaybackStateResponse`.
  - `PUT /api/users/me/playback` taking `UpdatePlaybackStateRequest`.
- [x] Create unit tests in `backend/src/test/kotlin/com/musichub/backend/domain/playback/PlaybackServiceTest.kt`:
  - Test state retrieval with track ordering and deleted track handling.
  - Test state upsert and serialization.

### Milestone 3: Frontend API & Types
- [x] In `frontend/src/types/playback.ts` (or `music.ts`):
  - Define `PlaybackStateDto` and `UpdatePlaybackStateRequest`.
- [x] Create `frontend/src/api/playbackApi.ts`:
  - `getPlaybackState(): Promise<PlaybackStateDto>`
  - `updatePlaybackState(data: UpdatePlaybackStateRequest): Promise<void>`

### Milestone 4: Frontend Player Store Enhancements
- [x] In `frontend/src/stores/playerStore.ts`:
  - Implement Fisher-Yates shuffle algorithm.
  - Add state fields: `shuffledQueue: MusicFileDto[]`.
  - Update `toggleShuffle`:
    - On activate: Put `currentTrack` at index 0, shuffle the rest into `shuffledQueue`, set `queueIndex = 0`.
    - On deactivate: Find `currentTrack` in original `queue`, restore `queueIndex`, reset `shuffledQueue`.
  - Update `playNext`:
    - Sequentially navigate active queue (`isShuffle ? shuffledQueue : queue`).
    - Handle repeat modes ('ALL' vs 'OFF').
  - Update `playPrev`:
    - Seamlessly move to previous index in active queue (`isShuffle ? shuffledQueue : queue`).
  - Update `addToQueue`, `removeFromQueue`, `clearQueue` to maintain both queues in sync.
  - Implement debounced sync timer (2500ms) calling `playbackApi.updatePlaybackState(...)` when user is logged in.
  - Add `initPlaybackState(state: PlaybackStateDto)` to restore queue, track metadata, and controls in paused state.

### Milestone 5: Auth Bootstrapping & UI Verification
- [x] In `frontend/src/stores/authStore.ts`:
  - In `setAuth` and `checkAuthSession`, after authentication succeeds, call `playbackApi.getPlaybackState()` and hydrate `playerStore`.
- [x] In `frontend/src/components/pages/player/queue/PlayerQueueDrawer.tsx`:
  - Update to render the active queue (`isShuffle ? shuffledQueue : queue`).
  - Highlight current track and allow seamless direct track selection.

### Milestone 6: Verification & Testing
- [x] Run backend tests: `./gradlew test` and build check.
- [x] Run frontend lint and build: `npm run build`.
- [ ] Manually verify:
  1. Adding tracks to queue.
  2. Toggling shuffle: verify order is randomized, no repeated songs on `playNext`.
  3. Clicking `playPrev` under shuffle: verify it returns to the previously played song in the shuffle sequence.
  4. Reloading the browser page: verify queue and player state are restored exactly as left.
