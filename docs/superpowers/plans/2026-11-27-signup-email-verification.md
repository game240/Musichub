# Implementation Plan: Email Verification for Local Signup

## Overview
로컬 회원가입(`POST /api/auth/register`) 시 실제 이메일 소유권을 확인하기 위해 6자리 일회용 인증코드(OTP) 발송 및 검증 과정을 거치도록 백엔드와 프론트엔드를 확장합니다.

---

## Proposed Changes

### 1. Backend

#### `backend/src/main/kotlin/com/musichub/backend/domain/auth/SignupVerificationManager.kt` (신설)
- 이메일(`String`, normalized lowercase)을 키로 사용하는 인메모리 인증 관리자
- 5분 만료 유효기간 (`expiresAt`)
- 1분 이내 재요청 쿨다운 (`createdAt.plusSeconds(60)`)
- 5회 연속 오입력 시 파기 (브루트포스 방지)
- 검증 성공 시 일회용 즉시 파기 (`storage.remove(email)`)

#### `backend/src/main/kotlin/com/musichub/backend/global/mail/EmailService.kt`
- `sendSignupVerificationCode(toEmail: String, code: String)` 인터페이스 추가
- `SmtpEmailService`: 회원가입 인증용 이메일 제목 및 Linear 다크 테마 HTML 템플릿/콘솔 로깅 추가

#### `backend/src/main/kotlin/com/musichub/backend/domain/auth/AuthController.kt`
- `data class SignupVerificationRequest(@field:NotBlank @field:Email val email: String)` DTO 추가
- `POST /api/auth/signup/request-code` 엔드포인트 신설
- `data class LocalRegisterRequest`에 `@field:NotBlank @field:Size(min = 6, max = 6) val verificationCode: String` 필드 추가

#### `backend/src/main/kotlin/com/musichub/backend/domain/auth/AuthService.kt`
- `requestSignupVerification(email: String)` 메서드 추가:
  - 이메일 중복 체크 (`userRepository`, `userIdentityRepository`)
  - `signupVerificationManager.createCode(email)`
  - `emailService.sendSignupVerificationCode(email, code)`
- `register(request: LocalRegisterRequest, deviceInfo: String?)` 메서드 수정:
  - `signupVerificationManager.verifyCode(normalizedEmail, request.verificationCode)` 호출하여 코드 일치 여부 확인

#### Tests
- `backend/src/test/kotlin/com/musichub/backend/domain/auth/SignupVerificationManagerTest.kt` 신설:
  - 코드 생성 및 1분 쿨다운 검증
  - 코드 일치 검증 성공 및 일회용 삭제 확인
  - 코드 불일치 횟수 카운트 및 5회 초과 시 강제 파기 확인
  - 코드 만료(5분 초과) 처리 확인
- `backend/src/test/kotlin/com/musichub/backend/domain/auth/AuthServiceTest.kt`:
  - `LocalRegisterRequest`에 `verificationCode` 반영
  - 잘못된 인증코드로 가입 시도시 실패 검증
  - 정상 인증코드로 가입 시도시 성공 검증
  - 가입 전 인증코드 발송 시 이미 존재하는 이메일이면 예외 발생 검증
- `backend/src/test/kotlin/com/musichub/backend/domain/auth/AuthControllerTest.kt`:
  - `POST /api/auth/signup/request-code` 및 회원가입 요청 DTO 검증

---

### 2. Frontend

#### `frontend/src/types/auth.ts`
- `LocalRegisterRequest` 인터페이스에 `verificationCode: string` 추가

#### `frontend/src/api/authApi.ts`
- `requestSignupCode(email: string): Promise<void>` 메서드 추가 (`POST /auth/signup/request-code`)

#### `frontend/src/components/pages/auth/LoginPage.tsx`
- 회원가입 모드일 때:
  - 이메일 입력 필드 옆에 [인증번호 받기] 버튼 배치
  - 인증번호 발송 요청 시 로딩 스피너 및 발송 완료 안내
  - 발송 후:
    - 6자리 인증번호 입력란 노출
    - 5분 카운트다운 타이머 (`05:00`) 표시
    - 1분 경과 후 활성화되는 [재발송] 버튼 제공
  - 회원가입 제출 시 인증번호 입력 여부 사전 검증 및 `verificationCode` 함께 전송
  - Linear 다크 테마 및 StyleSeed UI 원칙 준수

---

## Verification Plan

### Automated Tests
1. 백엔드 테스트:
   - `cd backend; ./gradlew test`
2. 프론트엔드 린트 및 빌드:
   - `cd frontend; pnpm lint; pnpm run build`
