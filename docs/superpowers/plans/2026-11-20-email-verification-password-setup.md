# In-Memory Email Verification for Password Setup Implementation Plan

- **Date:** 2026-11-20
- **Spec:** [docs/superpowers/specs/2026-11-20-email-verification-password-setup-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-20-email-verification-password-setup-design.md)
- **Status:** Completed (Awaiting Merge)
- **Branch:** `feat/local-auth` (cut from `dev`, pending merge)

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/local-auth`. Do not merge into `dev` until requested ("merge 대기").
   - Commit format: `type: subject` (e.g. `feat: add in-memory email verification for initial password setup`).
2. **Architecture**:
   - No DB migrations required.
   - In-memory `ConcurrentHashMap` with 10-minute expiration, 1-minute rate limiting, and 5-attempt brute-force protection.
   - Clean email abstraction with `DevEmailService` logger fallback.
   - Step-by-step UI in `AccountSecurityModal.tsx`.

---

## 2. Step-by-Step Milestones

### Milestone 1: In-Memory Verification Manager & Email Service
- [x] Create `PasswordSetupVerificationManager.kt` in `backend/src/main/kotlin/com/musichub/backend/domain/user/`:
  - `createCode(userId: Long): String`
  - `verifyCode(userId: Long, inputCode: String)`
- [x] Create `EmailService.kt` in `backend/src/main/kotlin/com/musichub/backend/global/mail/`:
  - Interface and `DevEmailService` implementation logging formatted verification emails.

### Milestone 2: Backend Business Logic & Endpoints
- [x] In `UserIdentityService.kt`:
  - Add `requestPasswordSetup(userId: Long)`: sends code via `EmailService`.
  - Add `confirmPasswordSetup(userId: Long, code: String, newPassword: String)`: verifies code, validates password complexity, saves LOCAL identity.
  - Keep `setPassword` for existing password update only.
- [x] In `UserIdentityController.kt`:
  - `POST /api/users/me/password-setup/request`
  - `POST /api/users/me/password-setup/confirm`
- [x] Add unit tests in `PasswordSetupVerificationManagerTest.kt` and update `UserIdentityServiceTest.kt`.

### Milestone 3: Frontend API & Interactive Modal UI
- [x] In `frontend/src/api/userApi.ts`:
  - Add `requestPasswordSetupCode(): Promise<void>`.
  - Add `confirmPasswordSetup(code: string, newPassword: string): Promise<void>`.
- [x] In `frontend/src/components/organisms/AccountSecurityModal.tsx`:
  - For `hasPassword === false`:
    - Step 1: Explanation and `[인증번호 전송]` button.
    - Step 2: 6-digit code input, new password, confirm password, and `[비밀번호 설정 완료]` button.
  - For `hasPassword === true`:
    - Keep current direct change form (current password + new password).

### Milestone 4: Verification & Compilation
- [x] Run backend tests (`./gradlew test`).
- [x] Run frontend build (`pnpm run build`) and lint (`pnpm run lint`).
- [x] Stage and commit to `feat/local-auth`.
