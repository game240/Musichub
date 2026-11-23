# Implementation Plan: Email Verification for Password Change

## Overview
기존 사용자가 비밀번호를 변경할 때도 본인 이메일로 6자리 인증번호를 전송받아 검증하도록 백엔드와 프론트엔드를 확장합니다.

---

## Proposed Changes

### 1. Branch Strategy
- `feat/password-change-email-verification` 브랜치를 `dev`에서 생성하여 작업

### 2. Backend

#### `backend/src/main/kotlin/com/musichub/backend/global/mail/EmailService.kt`
- `sendPasswordChangeCode(toEmail: String, code: String)` 메서드 추가
- `SmtpEmailService`: "비밀번호 변경" 안내 제목 및 HTML 템플릿/콘솔 로그 작성

#### `backend/src/main/kotlin/com/musichub/backend/domain/user/UserIdentityService.kt`
- `requestPasswordVerification(userId: Long)`:
  - 사용자의 `hasPassword` 여부에 따라 `sendPasswordChangeCode` 또는 `sendPasswordSetupCode` 호출
- `setPassword(userId: Long, code: String, currentPassword: String?, newPassword: String)`:
  - `verificationManager.verifyCode(userId, code)` 실행
  - `hasPassword == true`일 때 `currentPassword` 대조 검증
  - `newPassword` 정규식 검증 및 암호화 저장

#### `backend/src/main/kotlin/com/musichub/backend/domain/user/UserIdentityController.kt`
- `POST /api/users/me/password/request-code` 엔드포인트 추가
- `SetPasswordRequest` DTO에 `@field:NotBlank val code: String` 추가
- 기존 `password-setup/request` 및 `confirm`은 하위 호환 유지

#### Tests
- `SmtpEmailServiceTest.kt`: 변경 메일 발송 케이스 추가
- `UserIdentityServiceTest.kt`:
  - 변경 시 정상 코드 + 정상 현재 비밀번호 성공
  - 변경 시 비정상 코드 실패
  - 변경 시 정상 코드 + 틀린 현재 비밀번호 실패

### 3. Frontend

#### `frontend/src/types/auth.ts`
- `SetPasswordRequest` 인터페이스에 `code: string` 추가

#### `frontend/src/api/userApi.ts`
- `requestPasswordCode()` 함수 추가 (`POST /api/users/me/password/request-code`)

#### `frontend/src/components/organisms/AccountSecurityModal.tsx`
- 비밀번호 변경(`hasPassword === true`) 시에도:
  - [인증번호 발송] 단계 제공
  - 발송 후 6자리 인증코드 입력란 + 현재 비밀번호 + 새 비밀번호 + 비밀번호 확인 입력
  - 변경 요청 시 `code` 함께 전송

---

## Verification Plan

### Automated Tests
1. 백엔드 테스트:
   - `cd backend; .\gradlew test`
2. 프론트엔드 빌드:
   - `cd frontend; pnpm run build`
