# Design: Email Verification for Password Change

## Overview
기존에는 Google 로그인 사용자가 최초로 비밀번호를 등록(설정)할 때만 이메일 6자리 인증번호를 전송하고 검증했습니다.  
본 설계는 **이미 비밀번호를 보유한 사용자가 비밀번호를 변경할 때도 본인 계정 이메일로 6자리 인증번호를 발송하여 검증(2차 인증)**함으로써 계정 탈취 및 무단 변경을 방지하도록 보안을 강화합니다.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1 (인증번호 발송 요청 - 변경/설정 통합)**:
  - 비밀번호 설정(`hasPassword == false`)뿐만 아니라 비밀번호 변경(`hasPassword == true`) 시에도 사용자 이메일(`user.email`)로 6자리 일회용 인증코드를 전송한다.
  - 메일 제목 및 본문은 목적(신규 설정 vs 기존 변경)에 맞게 구분하여 안내한다.
  - 인증코드는 **5분간 유효**하며, 1분 내 재요청 방지(Rate Limiting) 및 최대 5회 오입력 제한 정책을 동일하게 적용한다.
- **FR-2 (비밀번호 변경 시 2중 검증)**:
  - 기존 비밀번호를 보유한 사용자는 다음 항목을 모두 검증받아야 변경이 완료된다:
    1. 이메일 6자리 인증코드 검증 (`verificationManager.verifyCode`)
    2. 기존(현재) 비밀번호 일치 검증 (`passwordEncoder.matches`)
    3. 새 비밀번호 복잡도 검증 (8자 이상, 영문/숫자/특수문자 조합)
- **FR-3 (프론트엔드 모달 UI 일원화)**:
  - 비밀번호 변경(`hasPassword == true`) 모달 폼에서도:
    1. [인증번호 발송] 버튼을 눌러 이메일로 코드를 수신
    2. [이메일 인증번호 6자리] + [현재 비밀번호] + [새 비밀번호] + [비밀번호 확인] 입력 후 제출
    3. 비밀번호 최초 설정(`hasPassword == false`)의 경우 [현재 비밀번호] 입력란만 생략되고 동일한 절차로 진행

---

## 2. Architecture & API Design

### 2.1 Backend Changes

#### 1) `EmailService.kt`
- 메일 전송 인터페이스 확장:
```kotlin
interface EmailService {
    fun sendPasswordSetupCode(toEmail: String, code: String) // 기존 하위 호환
    fun sendPasswordChangeCode(toEmail: String, code: String)
}
```
- `SmtpEmailService`:
  - `sendPasswordChangeCode`: 메일 제목 `[Music Hub] 비밀번호 변경을 위한 인증번호입니다`, 본문 안내 문구에 "비밀번호 변경" 명시.

#### 2) `UserIdentityController.kt` & `UserIdentityService.kt`
- 인증코드 발송 엔드포인트:
  - `POST /api/users/me/password/request-code` 신설 (기존 `password-setup/request`도 하위 호환 유지).
  - `hasPassword` 여부와 무관하게 현재 로그인된 사용자의 `user.email`로 코드를 발송.
- 비밀번호 변경/설정 엔드포인트:
  - `PUT /api/users/me/password`:
```kotlin
data class SetPasswordRequest(
    @field:NotBlank(message = "인증번호를 입력해 주세요.")
    val code: String,
    val currentPassword: String? = null,
    @field:NotBlank(message = "새 비밀번호를 입력해 주세요.")
    val newPassword: String
)
```
- 검증 로직:
  1. `verificationManager.verifyCode(userId, request.code)` 실행
  2. 만약 `hasPassword == true`:
     - `currentPassword` 필수 검증 (`passwordEncoder.matches`)
  3. `newPassword` 정규식 복잡도 검증
  4. 해싱 후 저장 및 세션 갱신

### 2.2 Frontend Changes

#### `AccountSecurityModal.tsx`
- `hasPassword === true`일 때도:
  - 폼 열기 $\rightarrow$ [인증번호 발송] 단계 $\rightarrow$ 발송 완료 시 6자리 코드 및 현재 비밀번호/새 비밀번호 입력란 노출
  - 제출 시 `code`, `currentPassword`, `newPassword`를 함께 전송

---

## 3. Verification Plan

1. **백엔드 단위 테스트**:
   - `UserIdentityServiceTest`:
     - 비밀번호 변경 시 올바른 인증코드 + 올바른 현재 비밀번호 제출 $\rightarrow$ 성공
     - 비밀번호 변경 시 잘못된 인증코드 제출 $\rightarrow$ 예외 발생 (비밀번호 미변경)
     - 비밀번호 변경 시 올바른 인증코드이지만 틀린 현재 비밀번호 제출 $\rightarrow$ 예외 발생
   - `SmtpEmailServiceTest`: 변경용 메일 발송 템플릿 검증
2. **프론트엔드 검증**:
   - `pnpm run build` 및 UI 상호작용 검증
