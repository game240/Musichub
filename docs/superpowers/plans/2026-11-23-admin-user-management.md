# Implementation Plan: Admin User Management Screen & API

- **Date:** 2026-11-23
- **Spec:** [docs/superpowers/specs/2026-11-23-admin-user-management-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-23-admin-user-management-design.md)
- **Status:** Completed
- **Target Components:**
  - `backend/src/main/kotlin/com/musichub/backend/domain/admin/AdminUserController.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/admin/AdminUserService.kt`
  - `backend/src/main/kotlin/com/musichub/backend/global/config/SecurityConfig.kt`
  - `backend/src/test/kotlin/com/musichub/backend/domain/admin/AdminUserServiceTest.kt`
  - `frontend/src/api/adminApi.ts`
  - `frontend/src/components/pages/admin/users/AdminUsersPage.tsx`
  - `frontend/src/components/pages/admin/users/UserRoleBadge.tsx`
  - `frontend/src/components/pages/admin/users/UserRoleSelect.tsx`
  - `frontend/src/components/organisms/AccountDropdown.tsx`
  - `frontend/src/App.tsx`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - `AGENTS.md`: "feat/* - feature branches cut from dev, merged back with --no-ff".
   - `AGENTS.md`: "Frontend component structure: pages/<domain>/<screen>/ holding private sub-components".
   - `AGENTS.md`: "Frontend visual design: use StyleSeed".
   - Commit format: `type: subject` (e.g. `feat: implement admin user management screen and apis`).
2. **Branch**:
   - Cut `feat/admin-user-management` from `dev`.

---

## 2. Step-by-Step Milestones

### Milestone 1: Backend Security & Admin APIs
- [x] Enable `@EnableMethodSecurity` in `SecurityConfig.kt` or configure `/api/admin/**` with `hasRole('ADMIN')`.
- [x] Create `AdminUserController.kt` with endpoints:
  - `GET /api/admin/users`: 페이징 및 검색 지원
  - `PATCH /api/admin/users/{id}/role`: 사용자 역할 변경
- [x] Implement `AdminUserService.kt`:
  - 유저 목록 및 곡 수 집계 조회 로직
  - 유저 권한 수정 및 관리자 본인 강등 차단 로직
- [x] Write unit tests in `AdminUserServiceTest.kt`.

### Milestone 2: Frontend API & Admin Components
- [x] Create `frontend/src/api/adminApi.ts` for admin endpoints.
- [x] Create `frontend/src/components/pages/admin/users/UserRoleBadge.tsx` (역할별 스타일 뱃지).
- [x] Create `frontend/src/components/pages/admin/users/UserRoleSelect.tsx` (역할 변경 드롭다운/버튼 및 확인 모달).
- [x] Create `frontend/src/components/pages/admin/users/AdminUsersPage.tsx` (Linear 감성의 검색/필터/페이징 테이블 UI).

### Milestone 3: Navigation & Integration
- [x] Add `[유저 관리]` 메뉴 항목 to `AccountDropdown.tsx` (조건: `user.role === 'ADMIN'`).
- [x] Update `App.tsx` to handle admin route `/admin/users` or admin view toggle with non-admin fallback.

### Milestone 4: Verification & Git Merge
- [x] Run backend tests (`./gradlew test`).
- [x] Run frontend tests and build (`pnpm run build && pnpm run lint`).
- [x] Commit to `feat/admin-user-management` and merge into `dev` with `--no-ff`.
