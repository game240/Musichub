# User Volume Setting Synchronization Implementation Plan

- **Date:** 2026-11-19
- **Spec:** [docs/superpowers/specs/2026-11-19-volume-sync-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-19-volume-sync-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/volume-sync` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: add user volume persistence with 5s debounce`).
2. **Architecture**:
   - PostgreSQL 16 & Flyway migration (`V2__add_user_volume.sql`).
   - Store volume as integer `0`..`100` (`DEFAULT 100`).
   - Frontend `playerStore.ts` buffers changes with 5-second debounce.
   - Frontend restores initial volume from user profile on login.

---

## 2. Step-by-Step Milestones

### Milestone 1: Database Migration & Backend Entity
- [x] Create Flyway migration script `backend/src/main/resources/db/migration/V2__add_user_volume.sql`:
  - `ALTER TABLE users ADD COLUMN volume INT NOT NULL DEFAULT 100;`
  - `ALTER TABLE users ADD CONSTRAINT chk_users_volume CHECK (volume >= 0 AND volume <= 100);`
- [x] Update `backend/src/main/kotlin/com/musichub/backend/domain/user/User.kt`:
  - Add `var volume: Int = 100` with helper `updateVolume(volume: Int)`.

### Milestone 2: Backend API & DTOs
- [x] Update `UserDto` in `backend/src/main/kotlin/com/musichub/backend/domain/auth/AuthController.kt`:
  - Add `val volume: Int` field.
  - Update `AuthService.kt` to map user `volume` into `UserDto`.
- [x] Create `UserService.kt` (or extend `UserController.kt`) under `com.musichub.backend.domain.user`:
  - Create `UpdateVolumeRequest(val volume: Int)`.
  - Create endpoint `PATCH /api/users/me/volume`.
  - Validate `0 <= volume <= 100`.
  - Update user entity and return response `{ "volume": volume }`.

### Milestone 3: Frontend API & Types
- [x] Update `frontend/src/types/auth.ts`:
  - Add `volume: number` to `UserDto`.
- [x] Create `frontend/src/api/userApi.ts`:
  - Add `updateVolume(volumePercent: number): Promise<{ volume: number }>`.

### Milestone 4: Frontend Player Store Integration
- [x] Update `frontend/src/stores/playerStore.ts`:
  - Add 5-second debounce timer variable for volume sync.
  - In `setVolume(volume: number)`:
    - Update audio and state immediately.
    - Cancel pending timer.
    - Set 5-second timer to call `userApi.updateVolume(Math.round(safeVol * 100))` if user is logged in.
  - Add `initVolumeFromUser(volumePercent: number)` to restore volume on login/app init.
- [x] Update auth initialization / login flow in frontend to call `initVolumeFromUser` when user data is loaded.

### Milestone 5: Verification & Compilation
- [x] Run backend compile / test: `./gradlew compileKotlin` or `./gradlew test`.
- [x] Run frontend build / test: `npm run build` or `npm test`.
- [x] Verify git commit & merge to `dev` using `--no-ff`.
