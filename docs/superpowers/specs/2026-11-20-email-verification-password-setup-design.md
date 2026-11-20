# Design: In-Memory Email Verification for Initial Password Setup

## Overview
Google 로그인으로 가입한 계정에 최초로 비밀번호 로그인 수단을 추가(설정)할 때, **타인의 무단 등록을 방지하고 계정 소유권을 확인하기 위해 Google 이메일로 6자리 일회용 인증코드를 발송하여 검증**합니다.  
별도의 DB 테이블을 생성하지 않고, **가볍고 빠른 인메모리 캐시(`ConcurrentHashMap`)** 기반으로 인증코드의 생성, 만료(5분), 브루트포스(5회 실패 시 파기), 속도 제한(1분 재요청 방지)을 처리합니다.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1 (인증코드 발송 요청)**:
  - 비밀번호가 없는 사용자(`hasPassword == false`)가 비밀번호 설정을 요청하면, 사용자의 Google 계정 이메일(`user.email`)로 6자리 숫자 인증코드를 발송한다.
  - 생성된 인증코드는 5분간 유효하며, 서버 인메모리에 저장된다.
  - 연속 호출로 인한 메일 폭탄을 방지하기 위해 1분 내 재요청은 차단한다 (Rate Limiting).
- **FR-2 (인증코드 검증 및 비밀번호 설정)**:
  - 사용자는 전달받은 6자리 인증코드와 새 비밀번호(8자 이상, 영문+숫자+특수문자 조합), 비밀번호 확인을 입력하여 제출한다.
  - 인증코드가 일치하고 유효기간 내인 경우, `LOCAL` UserIdentity를 생성하고 비밀번호 해시를 저장한다.
  - 검증 성공 즉시 해당 인증코드는 인메모리에서 파기된다 (일회용 보장).
- **FR-3 (무차별 대입 공격 방어 - Brute-force Protection)**:
  - 인증코드 검증을 5회 연속 실패할 경우, 해당 인증코드를 즉시 삭제하고 강제 만료 처리한다.
- **FR-4 (기존 비밀번호 변경과의 분리)**:
  - 이미 비밀번호가 존재하는 사용자(`hasPassword == true`)의 "비밀번호 변경"은 기존 비밀번호 대조를 통해 본인을 확인하므로 이메일 인증을 거치지 않는다.
- **FR-5 (UI/UX)**:
  - `AccountSecurityModal`에서 비밀번호 미등록 상태일 때:
    - 1단계: 이메일 전송 안내 문구 + [인증번호 발송] 버튼
    - 2단계: 인증번호 6자리 입력란 + 새 비밀번호 입력란 + [비밀번호 설정 완료] 버튼

---

## 2. Backend Design

### 2.1 인메모리 인증 관리자 (`PasswordSetupVerificationManager.kt`)
```kotlin
@Component
class PasswordSetupVerificationManager {
    data class VerificationEntry(
        val code: String,
        val createdAt: Instant = Instant.now(),
        val expiresAt: Instant = Instant.now().plus(Duration.ofMinutes(10)),
        var attempts: Int = 0
    )

    private val storage = ConcurrentHashMap<Long, VerificationEntry>()

    fun createCode(userId: Long): String {
        val existing = storage[userId]
        if (existing != null && Instant.now().isBefore(existing.createdAt.plusSeconds(60))) {
            throw IllegalStateException("인증번호가 이미 발송되었습니다. 1분 후에 다시 시도해 주세요.")
        }

        val code = "%06d".format(Random.nextInt(100000, 999999))
        storage[userId] = VerificationEntry(code = code)
        return code
    }

    fun verifyCode(userId: Long, inputCode: String) {
        val entry = storage[userId]
            ?: throw IllegalArgumentException("인증번호가 만료되었거나 요청되지 않았습니다. 다시 요청해 주세요.")

        if (Instant.now().isAfter(entry.expiresAt)) {
            storage.remove(userId)
            throw IllegalArgumentException("인증번호 유효 시간이 만료되었습니다. 다시 요청해 주세요.")
        }

        if (entry.code != inputCode.trim()) {
            entry.attempts++
            if (entry.attempts >= 5) {
                storage.remove(userId)
                throw IllegalArgumentException("인증번호 입력 횟수(5회)를 초과하여 파기되었습니다. 다시 요청해 주세요.")
            }
            throw IllegalArgumentException("인증번호가 일치하지 않습니다. (남은 시도: ${5 - entry.attempts}회)")
        }

        // 검증 성공 -> 즉시 파기
        storage.remove(userId)
    }
}
```

### 2.2 메일 발송 서비스 (`EmailService.kt`)
- `interface EmailService`: `fun sendVerificationCode(toEmail: String, code: String)`
- 개발 및 로컬 테스트 환경을 위해 로그 출력 기반의 `DevEmailService` 기본 활성화:
  ```kotlin
  logger.info("========== [EMAIL VERIFICATION] To: {}, Code: {} ==========", toEmail, code)
  ```
- 실제 SMTP 설정이 존재할 경우 JavaMailSender로 실 발송 가능하도록 확장 설계.

### 2.3 API 엔드포인트 (`UserIdentityController.kt`)
- `POST /api/users/me/password-setup/request`:
  - 인증번호 발송 요청 $\rightarrow$ 200 OK
- `POST /api/users/me/password-setup/confirm`:
  - Request: `{ "code": "123456", "newPassword": "password123!" }`
  - 인증코드 검증 + 비밀번호 복잡도 검증 + 비밀번호 저장 $\rightarrow$ 200 OK

---

## 3. Frontend Design

### 3.1 API Client (`frontend/src/api/userApi.ts`)
```typescript
requestPasswordSetupCode(): Promise<void>
confirmPasswordSetup(code: string, newPassword: string): Promise<void>
```

### 3.2 UI Flow (`AccountSecurityModal.tsx`)
1. `hasPassword === false` 상태에서 "비밀번호 설정" 클릭 시:
   - 안내: `"Google 계정 이메일({userEmail})로 인증번호 6자리가 발송됩니다."`
   - 버튼: `[인증번호 발송]` (클릭 시 로딩 스피너 및 발송 성공 토스트)
2. 발송 완료 후:
   - 폼 노출:
     - **인증번호 6자리** (`type="text"`, placeholder: "6자리 인증번호")
     - **새 비밀번호** (8자 이상, 영문/숫자/특수문자)
     - **비밀번호 확인**
     - `[비밀번호 설정 완료]` 버튼 및 `[인증번호 재전송]` 옵션

---

## 4. Verification & Testing
1. **단위 테스트**:
   - `PasswordSetupVerificationManagerTest`:
     - 6자리 난수 생성 및 정상 검증 시 성공 후 파기 확인
     - 1분 내 재요청 시 Rate Limit 예외 확인
     - 5분 만료 후 검증 시 만료 예외 확인
     - 5회 연속 오입력 시 강제 파기 확인
   - `UserIdentityServiceTest`:
     - 이메일 인증 기반 비밀번호 신규 설정 성공 및 복잡도 검증 확인
2. **프론트엔드 검증**:
   - 폼 스텝 전환 및 에러 메시지 노출 확인
   - `tsc -b && vite build` 및 `eslint .` 검증
