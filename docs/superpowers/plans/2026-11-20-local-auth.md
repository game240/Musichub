# Local Username/Password Authentication Implementation Plan

- **Date:** 2026-11-20
- **Spec:** [docs/superpowers/specs/2026-11-20-local-auth-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-20-local-auth-design.md)
- **Status:** Completed (Awaiting Merge)
- **Branch:** `feat/local-auth` (cut from `dev`, pending merge)

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/local-auth` cut from `dev`. Do not merge into `dev` until requested ("merge 대기").
   - Commit format: `type: subject` (e.g. `feat: implement local username and password authentication`).
2. **Architecture**:
   - Spring Security `BCryptPasswordEncoder` for password hashing.
   - Reuse existing PostgreSQL `users` table (`auth_provider = LOCAL`, `provider_id = email`, `password_hash`).
   - Standardized JWT Access Token + HttpOnly Refresh Token issuance.
   - Modern Linear dark-theme UI with seamless mode switching between Login and Register.

---

## 2. Step-by-Step Milestones

### Milestone 1: Backend Security & Service Layer
- [x] In `SecurityConfig.kt`:
  - Register `PasswordEncoder` bean (`BCryptPasswordEncoder`).
- [x] In `AuthController.kt`:
  - Define `LocalRegisterRequest(email, password, displayName)` with validation annotations.
  - Define `LocalLoginRequest(email, password)` with validation annotations.
- [x] In `AuthService.kt`:
  - Inject `PasswordEncoder`.
  - Implement `register(request: LocalRegisterRequest, deviceInfo: String?): TokenResult`.
  - Implement `loginWithLocal(request: LocalLoginRequest, deviceInfo: String?): TokenResult`.
- [x] In `AuthController.kt`:
  - Add `POST /api/auth/register` returning `AuthResponse` + Refresh Token cookie.
  - Add `POST /api/auth/login` returning `AuthResponse` + Refresh Token cookie.
- [x] Add unit test in `backend/src/test/kotlin/com/musichub/backend/domain/auth/AuthServiceTest.kt` verifying:
  - Register new local user with encrypted password.
  - Reject duplicate email registration.
  - Successful local login with matching credentials.
  - Failed local login with wrong password.

### Milestone 2: Frontend Types & API Client
- [x] In `frontend/src/types/auth.ts`:
  - Define `LocalLoginRequest` and `LocalRegisterRequest`.
- [x] In `frontend/src/api/authApi.ts`:
  - Implement `loginWithLocal(data: LocalLoginRequest): Promise<AuthResponse>`.
  - Implement `register(data: LocalRegisterRequest): Promise<AuthResponse>`.

### Milestone 3: Frontend UI & Interactive Forms
- [x] In `frontend/src/components/pages/auth/LoginPage.tsx`:
  - Add state for mode switching (`'login'` vs `'register'`).
  - Implement interactive form for Login (Email, Password, Submit button).
  - Implement interactive form for Register (Email, Display Name, Password, Confirm Password, Submit button).
  - Add client-side validation with clear inline error messages.
  - Retain Google login below divider ("또는 Google 계정으로 계속하기").
  - Retain local developer sandbox bypass for quick testing.

### Milestone 4: Verification & Build
- [x] Run backend tests (`./gradlew test`).
- [x] Run frontend build (`pnpm run build`) and lint (`pnpm run lint`).
- [x] Stage and commit changes to `feat/local-auth`.
- [ ] Wait for user request before merging.
