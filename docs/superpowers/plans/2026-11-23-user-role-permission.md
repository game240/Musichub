# Implementation Plan: User Role Column Addition (users.role)

- **Date:** 2026-11-23
- **Spec:** [docs/superpowers/specs/2026-11-23-user-role-permission-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-23-user-role-permission-design.md)
- **Status:** Completed
- **Target Components:**
  - `backend/src/main/resources/db/migration/V6__add_user_role.sql`
  - `backend/src/main/kotlin/com/musichub/backend/domain/user/User.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/auth/AuthController.kt` (UserDto)
  - `backend/src/main/kotlin/com/musichub/backend/domain/auth/AuthService.kt`
  - `backend/src/main/kotlin/com/musichub/backend/global/security/UserPrincipal.kt`
  - `backend/src/main/kotlin/com/musichub/backend/global/security/JwtProvider.kt`
  - `backend/src/main/kotlin/com/musichub/backend/global/security/JwtAuthFilter.kt`
  - `backend/src/test/kotlin/com/musichub/backend/domain/user/UserPrincipalTest.kt`
  - `frontend/src/types/auth.ts`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - `AGENTS.md`: "feat/* - feature branches cut from dev, merged back with --no-ff".
   - Commit format: `type: subject` (e.g. `feat: add role column to users table and domain models`).
2. **Design Assumption**:
   - Role modeling: `ADMIN` / `DOWNLOADER = NULL` (for now, admin is `ADMIN`, general users/downloaders are `NULL`).
   - No feature blocking or branching in this phase; pure schema and domain infrastructure enablement.

---

## 2. Step-by-Step Milestones

### Milestone 1: Database Migration & Domain Entity
- [x] Create `V6__add_user_role.sql` with `role VARCHAR(32)` and check constraint `CHECK (role IN ('ADMIN', 'DOWNLOADER') OR role IS NULL)`.
- [x] Define `UserRole` enum (`ADMIN`, `DOWNLOADER`) in `User.kt`.
- [x] Add `var role: UserRole? = null` and helper `isAdmin()` to `User.kt`.

### Milestone 2: Security & Authentication Pipeline
- [x] Update `JwtProvider.generateAccessToken` to include `claim("role", role?.name)`.
- [x] Update `UserPrincipal` to include `val role: UserRole? = null` and map `getAuthorities()` accordingly.
- [x] Update `JwtAuthFilter` to extract `role` claim and instantiate `UserPrincipal(userId, email, userRole)`.
- [x] Update `UserDto` in `AuthController.kt` to include `val role: String? = null`.
- [x] Update `AuthService` mappings to pass `role` into `generateAccessToken` and `UserDto`.

### Milestone 3: Frontend Types
- [x] Update `frontend/src/types/auth.ts` to add `UserRole` and `role?: UserRole` on `UserDto`.

### Milestone 4: Verification & Git Merge
- [x] Write unit test for `UserPrincipal` authorities mapping (`UserPrincipalTest.kt`).
- [x] Verify existing backend tests pass (`AuthServiceTest`, etc.).
- [x] Run `pnpm run build` and `pnpm run lint` in `frontend/` to confirm type check and build pass.
- [x] Commit to `feat/user-role` and merge into `dev` with `--no-ff`.
