# Design: Playback Queue & Shuffle Synchronization

- **Date:** 2026-11-21
- **Status:** Approved / Implemented
- **Target Components:** Backend (PostgreSQL, Spring Boot 3, JPA), Frontend (Zustand Player Store, Queue Drawer, API Client)

---

## 1. Overview

This design outlines the architecture for:
1. **True Shuffle (Dual Queue with Fisher-Yates)**: Replacing random index sampling with a deterministic non-repeating dual-queue shuffle model (Original Queue + Shuffled Queue).
2. **Playback Queue & State Persistence**: Storing active playback state (track list, current track, shuffle state, repeat mode, current position) per user in PostgreSQL using native arrays (`BIGINT[]`), synchronized with debounced client updates.

---

## 2. Requirements

### 2.1 Functional Requirements

- **FR-1 (Deterministic Shuffle)**:
  - Toggling shuffle ON retains the current track at index 0 and shuffles the remaining queue tracks using the Fisher-Yates algorithm into a separate `shuffledQueue`.
  - Next track (`playNext`) sequentially traverses `shuffledQueue` so that every track is played exactly once without repetition until the end of the queue.
  - Previous track (`playPrev`) moves back through the `shuffledQueue` history.
  - Toggling shuffle OFF restores the playback pointer to the current track's original position in the sequential `queue`.
- **FR-2 (Queue Persistence)**:
  - The user's active playback state (original queue track IDs, shuffled track IDs, current track ID, queue index, shuffle toggle, repeat mode, playback position) is persisted in PostgreSQL.
- **FR-3 (State Restoration)**:
  - Upon login or page reload, authenticated users retrieve their persisted playback state (`GET /api/users/me/playback`). The player initializes the queue, track metadata, and controls in a paused state.
- **FR-4 (State Synchronization)**:
  - Frontend player state updates (queue additions/removals, track changes, shuffle toggle, repeat mode) are debounced (2.5 seconds) and synced via `PUT /api/users/me/playback`.
  - Track deletion from the system automatically prunes IDs gracefully upon queue retrieval without failing requests.

### 2.2 Non-Functional Requirements

- **NFR-1 (UI Latency)**: Queue and shuffle manipulations must happen instantaneously in client memory with 0ms UI lag.
- **NFR-2 (Network Efficiency)**:
  - Client-to-server sync requests only send track IDs (`queueTrackIds: Long[]`), avoiding redundant metadata transfers.
  - Frequent slider/playback progress events are not constantly written to DB; position is captured on track transition or debounced pause.
- **NFR-3 (Relational vs Array Decision)**:
  - Use `BIGINT[]` for `queue_track_ids` and `shuffled_track_ids` in PostgreSQL to ensure single-row atomic updates and high I/O throughput for transient playback state.

---

## 3. Database & Architecture Design

### 3.1 PostgreSQL Flyway Migration (`V5__create_user_playback_state.sql`)

```sql
CREATE TABLE user_playback_state (
    user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_track_id    BIGINT REFERENCES music_file(id) ON DELETE SET NULL,
    queue_track_ids     BIGINT[] NOT NULL DEFAULT '{}',
    shuffled_track_ids  BIGINT[] NOT NULL DEFAULT '{}',
    queue_index         INT NOT NULL DEFAULT 0,
    is_shuffle          BOOLEAN NOT NULL DEFAULT FALSE,
    repeat_mode         VARCHAR(16) NOT NULL DEFAULT 'OFF',
    current_position_ms BIGINT NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_playback_state_updated ON user_playback_state(updated_at);
```

### 3.2 Backend Domain Model

#### Entity (`PlaybackState.kt` under `com.musichub.backend.domain.playback`)
```kotlin
@Entity
@Table(name = "user_playback_state")
class PlaybackState(
    @Id
    @Column(name = "user_id")
    val userId: Long,

    @Column(name = "current_track_id")
    var currentTrackId: Long? = null,

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "queue_track_ids", columnDefinition = "bigint[]")
    var queueTrackIds: List<Long> = emptyList(),

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "shuffled_track_ids", columnDefinition = "bigint[]")
    var shuffledTrackIds: List<Long> = emptyList(),

    @Column(name = "queue_index", nullable = false)
    var queueIndex: Int = 0,

    @Column(name = "is_shuffle", nullable = false)
    var isShuffle: Boolean = false,

    @Column(name = "repeat_mode", nullable = false)
    var repeatMode: String = "OFF",

    @Column(name = "current_position_ms", nullable = false)
    var currentPositionMs: Long = 0,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
```

### 3.3 Backend API Specification

#### 1) `GET /api/users/me/playback`
- **Auth**: Required (`Bearer <token>`)
- **Action**:
  - Finds or returns default empty state.
  - Queries `musicFileRepository.findAllByIdIn(trackIds)` to map IDs to full `MusicFileDto`s.
  - Filters out any track IDs that were deleted.
  - Orders the DTOs matching `queueTrackIds` and `shuffledTrackIds`.
- **Response `200 OK`**:
```json
{
  "currentTrack": { "id": 10, "title": "Track 1", ... } or null,
  "queue": [ { "id": 10, ... }, { "id": 12, ... } ],
  "shuffledQueue": [ { "id": 10, ... }, { "id": 12, ... } ],
  "queueIndex": 0,
  "isShuffle": false,
  "repeatMode": "OFF",
  "currentPositionMs": 0
}
```

#### 2) `PUT /api/users/me/playback`
- **Auth**: Required (`Bearer <token>`)
- **Request Body**:
```json
{
  "currentTrackId": 10,
  "queueTrackIds": [10, 12, 15],
  "shuffledTrackIds": [10, 15, 12],
  "queueIndex": 0,
  "isShuffle": true,
  "repeatMode": "ALL",
  "currentPositionMs": 35000
}
```
- **Response**: `200 OK`

---

## 4. Frontend Design

### 4.1 Fisher-Yates Dual Queue Algorithm in `playerStore.ts`

```typescript
function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

1. **`toggleShuffle()`**:
   - When enabling (`isShuffle` becomes `true`):
     - If `queue.length > 0` and `currentTrack`:
       - Current track placed at index 0 of `shuffledQueue`.
       - Remaining tracks shuffled via Fisher-Yates and appended.
       - `queueIndex` set to 0 (relative to `shuffledQueue`).
   - When disabling (`isShuffle` becomes `false`):
     - Find `currentTrack.id` in original `queue`.
     - Update `queueIndex` to that original index.
     - Clear `shuffledQueue`.
2. **`playNext()`**:
   - Active queue is `isShuffle ? shuffledQueue : queue`.
   - Next index = `queueIndex + 1`.
   - If `nextIndex >= activeQueue.length`:
     - If `repeatMode === 'ALL'`:
       - If `isShuffle`, re-shuffle the queue (keeping the transition smooth) or loop to 0.
       - `nextIndex = 0`.
     - Else: Stop playback (`isPlaying: false`).
   - Play track at `activeQueue[nextIndex]`.
3. **`playPrev()`**:
   - If `currentTime > 3`: restart track from 0.
   - Else: Active queue is `isShuffle ? shuffledQueue : queue`.
     - Previous index = `queueIndex - 1`. If `< 0`, wrap to `length - 1` or stay at 0.
     - Play track at `activeQueue[prevIndex]`.

### 4.2 State Synchronization & Restoration

- **Debounce Timer**:
  - `playbackDebounceTimer` with 2500ms delay.
  - Triggered on: `playTrack`, `toggleShuffle`, `toggleRepeat`, `addToQueue`, `removeFromQueue`, `clearQueue`, and `pause`.
- **Restoration**:
  - On auth session check / login in `authStore.ts`:
  - Fetch playback state via `playbackApi.getPlaybackState()`.
  - Populate `playerStore`: tracks, queue, shuffle status, and duration/position in paused mode ready for instant playback.

### 4.3 Queue Drawer UI

- `PlayerQueueDrawer`:
  - Displays the active queue (`isShuffle ? shuffledQueue : queue`).
  - Highlights currently playing track based on active index.
  - Allows removing items or clicking to play directly from the active queue.
