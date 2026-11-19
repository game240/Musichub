# Design: User Volume Setting Synchronization

## Overview
Stores the user's audio playback volume setting in the database as an `INTEGER` (0 to 100 percentage) and synchronizes it using a 5-second debounce from the frontend client. This ensures that a user's preferred volume persists across sessions without floating-point inaccuracies or overloading the backend with frequent API calls during slider manipulation.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1**: User can adjust audio playback volume in the web UI (0% to 100%, represented internally in HTML5 Audio as `0.0` to `1.0`).
- **FR-2**: The volume setting is persisted per user in the PostgreSQL database as an `INTEGER` column (`0` to `100`, default `100`).
- **FR-3**: When a user logs in or refreshes auth, their saved volume integer is returned via `UserDto` (`volume: Int`), and the player initializes to that volume (`volume / 100.0`).
- **FR-4**: Frontend buffers volume change events and triggers a synchronization API call only after **5 seconds** of inactivity.

### 1.2 Non-Functional Requirements
- **NFR-1**: Volume slider interactions must have zero UI/audio latency.
- **NFR-2**: Rapid slider dragging results in at most one API request per 5-second pause.
- **NFR-3**: Input validation on backend ensures integer value is between `0` and `100` inclusive (`@Min(0) @Max(100)`).
- **NFR-4**: Avoid floating-point conversion errors by standardizing integer percentage on the server/DB.

---

## 2. Architecture & Data Model

### 2.1 Database / Entity Changes
Add a `volume` column to the `users` table:
- **Migration**: Flyway `V2__add_user_volume.sql`
  ```sql
  ALTER TABLE users ADD COLUMN volume INT NOT NULL DEFAULT 100;
  ```
- **Entity**: `User.kt`
  ```kotlin
  @Column(name = "volume", nullable = false)
  var volume: Int = 100
  ```

### 2.2 Backend API

#### 1) `PATCH /api/users/me/volume`
- **Authentication**: Required (`Bearer <access_token>`)
- **Request Body**:
  ```json
  {
    "volume": 75
  }
  ```
- **Validation**:
  - `0 <= volume <= 100` (Return `400 Bad Request` if invalid)
- **Response**: `200 OK`
  ```json
  {
    "volume": 75
  }
  ```

#### 2) User Profile / Auth Response
Update `UserDto` in `AuthController.kt` to include `volume`:
```kotlin
data class UserDto(
    val id: Long,
    val email: String,
    val displayName: String?,
    val profileImageUrl: String?,
    val storageUsedBytes: Long,
    val volume: Int
)
```

---

## 3. Frontend Implementation

### 3.1 API Client (`frontend/src/api/userApi.ts`)
```typescript
export const userApi = {
  async updateVolume(volumePercent: number): Promise<{ volume: number }> {
    const res = await apiClient.patch('/users/me/volume', { volume: volumePercent });
    return res.data;
  }
};
```

### 3.2 Player Store Debounce (`frontend/src/stores/playerStore.ts`)
- Module-level `volumeDebounceTimer` in `playerStore.ts`.
- Inside `setVolume(volume: number)` (where `0.0 <= volume <= 1.0`):
  1. Immediately clamp volume (`0.0 <= safeVol <= 1.0`) and apply to `audioElement.volume`.
  2. Update Zustand store state (`set({ volume: safeVol, isMuted: safeVol === 0 })`).
  3. Reset the 5,000ms timer (`clearTimeout`).
  4. Once timer fires after 5 seconds of inactivity:
     - Check if user is authenticated.
     - Call `userApi.updateVolume(Math.round(safeVol * 100))`.
- Add an action `initVolumeFromUser(volumePercent: number)` to restore user's volume:
  - `const safeVol = Math.max(0, Math.min(100, volumePercent)) / 100.0;`
  - Update `audioElement.volume` and store state.

---

## 4. Verification & Testing

1. **Backend Tests**:
   - `PATCH /api/users/me/volume` updates user volume to given valid integer (0~100).
   - Test out-of-range values (-1, 101) return `400 Bad Request`.
   - `UserDto` serializes `volume` integer properly.
2. **Frontend Tests / Checks**:
   - Verify `userApi.updateVolume` makes the expected network call with integer payload.
   - Verify continuous volume slider change cancels previous timers and fires 1 request after 5s.
