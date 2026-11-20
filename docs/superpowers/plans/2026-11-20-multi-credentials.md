# Multi-Credential Account Linking & Security Management Implementation Plan

- **Date:** 2026-11-20
- **Spec:** [docs/superpowers/specs/2026-11-20-multi-credentials-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-20-multi-credentials-design.md)
- **Status:** Completed (Awaiting Merge)
- **Branch:** `feat/local-auth` (cut from `dev`, pending merge)

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/local-auth`. Do not merge into `dev` until requested ("merge 대기").
   - Commit format: `type: subject` (e.g. `feat: add multi-credential linking and account security modal`).
2. **Architecture**:
   - PostgreSQL Flyway migration `V4__create_user_identities.sql` with backfill query.
   - `UserIdentity` entity and repository for 1:N authentication credentials.
   - Restful API for identity inspection, password setting/updating, Google linking, and unlinking.
   - Modern Linear dark-theme dropdown and modal in React frontend.

---

## 2. Step-by-Step Milestones

### Milestone 1: Database Migration & Domain Entity
- [x] Create Flyway migration `backend/src/main/resources/db/migration/V4__create_user_identities.sql`:
  - Create table `user_identities` (`id`, `user_id`, `provider`, `provider_id`, `password_hash`, `created_at`).
  - Unique constraint on `(provider, provider_id)`.
  - Backfill existing data from `users` table into `user_identities`.
- [x] Create domain entity `UserIdentity.kt` in `domain/user/`:
  - Mapping to `user_identities`.
- [x] Create `UserIdentityRepository.kt`:
  - `findByProviderAndProviderId(provider, providerId)`
  - `findAllByUserId(userId)`
  - `findByUserIdAndProvider(userId, provider)`

### Milestone 2: Backend Service & Controller
- [x] Update `AuthService.kt`:
  - In `loginWithGoogle`: look up `UserIdentity(GOOGLE, googleSubject)`. If not found, create new `User` + `UserIdentity`.
  - In `register`: create new `User` + `UserIdentity(LOCAL, email)`.
  - In `loginWithLocal`: look up `UserIdentity(LOCAL, email)` and check password hash.
- [x] Create `UserIdentityService.kt` in `domain/user/`:
  - `getIdentities(userId: Long): UserIdentitiesDto`
  - `setPassword(userId: Long, currentPassword: String?, newPassword: String)`
  - `linkGoogle(userId: Long, idToken: String)`
  - `unlinkProvider(userId: Long, provider: AuthProvider)`
- [x] Create `UserIdentityController.kt` in `domain/user/`:
  - `GET /api/user/identities`
  - `POST /api/user/identities/password`
  - `POST /api/user/identities/google`
  - `DELETE /api/user/identities/{provider}`

### Milestone 3: Backend Unit Tests
- [x] Add unit tests in `UserIdentityServiceTest.kt`:
  - Get identities returns correct list and password presence.
  - Set password creates LOCAL identity if absent, or updates existing with verification.
  - Link Google creates GOOGLE identity, rejecting duplicate google sub.
  - Unlink removes identity if 2+ exist, rejecting when only 1 exists.
- [x] Update `AuthServiceTest.kt` for `UserIdentityRepository` integration.

### Milestone 4: Frontend API & Types
- [x] In `frontend/src/types/user.ts` (or `auth.ts`):
  - Define `IdentityDto`, `UserIdentitiesResponse`, `SetPasswordRequest`, `LinkGoogleRequest`.
- [x] In `frontend/src/api/userApi.ts`:
  - Add `getIdentities()`, `setPassword()`, `linkGoogle()`, `unlinkProvider()`.

### Milestone 5: Frontend UI
- [x] Create `frontend/src/components/organisms/AccountDropdown.tsx`:
  - User avatar, name, email, storage progress bar.
  - "계정 및 보안 설정" button to open modal.
  - "로그아웃" button.
- [x] Create `frontend/src/components/organisms/AccountSecurityModal.tsx`:
  - Modal with Google status/link/unlink and Password status/setup/change.
  - Google OAuth trigger via `@react-oauth/google`.
- [x] Update `App.tsx`:
  - Replace static header profile with `AccountDropdown` and `AccountSecurityModal`.

### Milestone 6: Verification & Compilation
- [x] Run backend tests (`./gradlew test`).
- [x] Run frontend build (`pnpm run build`) and lint (`pnpm run lint`).
- [x] Git commit to `feat/local-auth`.
