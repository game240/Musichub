# Design: Email Verification for Local Signup (회원가입 이메일 인증)

## Overview
현재 Music Hub의 로컬 회원가입(`POST /api/auth/register`)은 이메일과 비밀번호만 입력하면 즉시 계정이 생성되고 로그인 처리됩니다.  
본 설계는 **타인의 이메일을 무단 도용하여 가입하는 행위를 방지하고, 실제 소유하고 있는 유효한 이메일인지 검증**하기 위해 **회원가입 시 6자리 일회용 이메일 인증코드(OTP)**를 발송하고 검증하는 로직을 추가합니다.

기존 `PasswordSetupVerificationManager`와 동일한 보안 정책(5분 유효기간, 5회 오입력 초과 시 파기, 1분 내 재요청 방지)을 적용하되, 가입 전 미등록 상태이므로 **이메일 주소(String)**를 키로 관리하는 인메모리 인증 관리자를 설계합니다.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1 (인증번호 발송 요청 - `POST /api/auth/signup/request-code`)**:
  - 사용자는 회원가입 화면에서 이메일을 입력한 후 [인증번호 발송]을 요청할 수 있다.
  - 이메일 형식(`@`, 도메인)을 검증하고, 이미 가입된 이메일인 경우 "이미 가입된 이메일입니다." 오류를 반환한다.
  - 6자리 난수 인증코드(`100000`~`999999`)를 생성하여 서버 인메모리(`SignupVerificationManager`)에 5분간 저장한다.
  - 1분 이내 재요청 시 "인증번호가 이미 발송되었습니다. 1분 후에 다시 시도해 주세요." 예외를 발생시켜 Rate Limiting을 수행한다.
  - `EmailService`를 통해 사용자 이메일로 회원가입 인증 메일을 전송한다 (SMTP 미설정 시 개발 환경 콘솔 로깅).
- **FR-2 (인증번호 검증 및 회원가입 - `POST /api/auth/register`)**:
  - `LocalRegisterRequest`에 `verificationCode` (6자리 문자열) 필드를 추가한다.
  - 회원가입 요청 시 백엔드는:
    1. 비밀번호 복잡도(8자 이상, 영문+숫자+특수문자 조합) 검증
    2. 이메일 중복 검증
    3. 인메모리 캐시에서 해당 이메일의 인증코드 검증 (`SignupVerificationManager.verifyCode`)
       - 만료(5분) 여부 확인
       - 불일치 시 시도 횟수 증가 (최대 5회 초과 시 파기)
       - 일치 시 인증코드 즉시 파기 (일회용 보장)
    4. `User` 및 `UserIdentity(LOCAL)` 저장
    5. Access Token 및 Refresh Token 발급 (즉시 자동 로그인)
- **FR-3 (프론트엔드 UI/UX - `LoginPage.tsx`)**:
  - 회원가입 모드일 때 이메일 입력란 우측에 [인증번호 발송] 버튼을 배치한다.
  - 발송 성공 시:
    - 6자리 인증번호 입력란이 나타난다.
    - 5분 카운트다운 타이머(예: `05:00`)와 함께 [재발송] 버튼(1분 쿨다운)이 제공된다.
  - 인증번호가 입력되지 않았거나 유효하지 않은 경우 회원가입 제출을 방지하고 명확한 에러 메시지를 노출한다.
  - Linear 스타일 다크 테마 및 StyleSeed 원칙에 부합하는 일관된 디자인 적용.

---

## 2. Architecture & Backend Design

### 2.1 인메모리 인증 관리자 (`SignupVerificationManager.kt`)
- 패키지: `com.musichub.backend.domain.auth`
- 구조:
```kotlin
@Component
class SignupVerificationManager {
    data class VerificationEntry(
        val code: String,
        val createdAt: Instant = Instant.now(),
        val expiresAt: Instant = Instant.now().plus(Duration.ofMinutes(5)),
        var attempts: Int = 0
    )

    private val storage = ConcurrentHashMap<String, VerificationEntry>()

    fun createCode(email: String): String {
        val normalized = email.trim().lowercase()
        val existing = storage[normalized]
        if (existing != null && Instant.now().isBefore(existing.createdAt.plusSeconds(60))) {
            throw IllegalStateException("인증번호가 이미 발송되었습니다. 1분 후에 다시 시도해 주세요.")
        }
        val code = Random.nextInt(100000, 1000000).toString()
        storage[normalized] = VerificationEntry(code = code)
        return code
    }

    fun verifyCode(email: String, inputCode: String) {
        val normalized = email.trim().lowercase()
        val entry = storage[normalized]
            ?: throw IllegalArgumentException("인증번호가 만료되었거나 요청되지 않았습니다. 다시 요청해 주세요.")

        if (Instant.now().isAfter(entry.expiresAt)) {
            storage.remove(normalized)
            throw IllegalArgumentException("인증번호 유효 시간이 만료되었습니다. 다시 요청해 주세요.")
        }

        if (entry.code != inputCode.trim()) {
            entry.attempts++
            if (entry.attempts >= 5) {
                storage.remove(normalized)
                throw IllegalArgumentException("인증번호 입력 횟수(5회)를 초과하여 파기되었습니다. 다시 요청해 주세요.")
            }
            throw IllegalArgumentException("인증번호가 일치하지 않습니다. (남은 시도: ${5 - entry.attempts}회)")
        }

        // 검증 성공 시 즉시 파기 (일회용 보장)
        storage.remove(normalized)
    }

    fun clear(email: String) {
        storage.remove(email.trim().lowercase())
    }
}
```

### 2.2 메일 발송 서비스 확장 (`EmailService.kt`, `SmtpEmailService.kt`)
- `interface EmailService`에 메서드 추가:
  ```kotlin
  fun sendSignupVerificationCode(toEmail: String, code: String)
  ```
- 메일 제목: `[Music Hub] 회원가입을 위한 인증번호입니다`
- 본문 템플릿: 기존 비밀번호 설정/변경 메일 템플릿과 동일한 Linear 스타일 다크 테마 HTML 안내 메일 발송

### 2.3 API 명세 & DTO (`AuthController.kt`)

#### 1) 인증번호 발송 요청
- **엔드포인트**: `POST /api/auth/signup/request-code`
- **Request DTO**:
  ```kotlin
  data class SignupVerificationRequest(
      @field:NotBlank(message = "이메일은 필수 입력값입니다.")
      @field:Email(message = "올바른 이메일 형식이 아닙니다.")
      val email: String
  )
  ```
- **Response**: `200 OK` (본문 없음)

#### 2) 회원가입 요청
- **엔드포인트**: `POST /api/auth/register`
- **Request DTO 수정**:
  ```kotlin
  data class LocalRegisterRequest(
      @field:NotBlank(message = "이메일은 필수 입력값입니다.")
      @field:Email(message = "올바른 이메일 형식이 아닙니다.")
      val email: String,

      @field:NotBlank(message = "인증번호는 필수 입력값입니다.")
      @field:Size(min = 6, max = 6, message = "인증번호는 6자리 숫자여야 합니다.")
      val verificationCode: String,

      @field:NotBlank(message = "비밀번호는 필수 입력값입니다.")
      @field:Pattern(
          regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?~]).{8,64}$",
          message = "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다."
      )
      val password: String,

      val displayName: String? = null
  )
  ```
- **Response**: `200 OK` (`AuthResponse` + Refresh Token Set-Cookie)

### 2.4 AuthService 로직 (`AuthService.kt`)
- `requestSignupVerification(email: String)`:
  1. 이메일 정규화 (`trim().lowercase()`)
  2. 기존 계정 여부 확인 (`userIdentityRepository`, `userRepository`) $\rightarrow$ 존재 시 `IllegalArgumentException("이미 가입된 이메일입니다.")`
  3. `signupVerificationManager.createCode(normalizedEmail)`
  4. `emailService.sendSignupVerificationCode(normalizedEmail, code)`
- `register(request: LocalRegisterRequest, deviceInfo: String?)`:
  1. 비밀번호 복잡도 정규식 검증
  2. 이메일 중복 검증
  3. **`signupVerificationManager.verifyCode(normalizedEmail, request.verificationCode)` 호출**
  4. 사용자 생성, 비밀번호 해싱 저장, 토큰 발급

---

## 3. Frontend Design

### 3.1 API Client (`frontend/src/api/authApi.ts`)
```typescript
export const authApi = {
  // ...
  async requestSignupCode(email: string): Promise<void> {
    await apiClient.post('/auth/signup/request-code', { email });
  },
  // register(data: LocalRegisterRequest)의 data에 verificationCode 포함
};
```

### 3.2 Types (`frontend/src/types/auth.ts`)
```typescript
export interface LocalRegisterRequest {
  email: string;
  verificationCode: string;
  password: string;
  displayName?: string;
}
```

### 3.3 UI Component (`LoginPage.tsx`)
- 회원가입 모드일 때:
  - 이메일 입력 필드 옆에 [인증번호 받기] 버튼
  - 인증번호 발송 요청 중 로딩 표시, 성공 시 토스트 또는 안내 문구 ("인증번호가 발송되었습니다.")
  - 인증번호 발송 완료 후:
    - 6자리 인증번호 입력 필드 및 타이머 (5분 카운트다운)
    - 타이머 종료 시 만료 안내 및 재발송 버튼 활성화 (발송 후 1분 쿨다운)
  - 가입 버튼 클릭 시 인증번호 포함하여 `authApi.register()` 호출

---

## 4. Verification Plan

### 4.1 Backend Unit & Integration Tests
- `SignupVerificationManagerTest`:
  - 인증코드 생성 및 1분 쿨다운 제한 검증
  - 올바른 코드 검증 성공 및 일회용 파기 검증
  - 잘못된 코드 입력 시도 횟수 제한(5회) 및 초과 시 파기 검증
  - 유효 시간(5분) 만료 검증
- `AuthServiceTest`:
  - 이미 가입된 이메일로 인증코드 발송 시 예외 발생 검증
  - 인증코드 없이 가입 시도 또는 틀린 인증코드로 가입 시도시 예외 발생 검증
  - 올바른 인증코드로 가입 시 사용자 생성 및 토큰 발급 성공 검증
- `AuthControllerTest`:
  - `POST /api/auth/signup/request-code` 엔드포인트 동작 검증
  - `POST /api/auth/register` 엔드포인트 파라미터 유효성 검증

### 4.2 Frontend Verification
- `pnpm run build` 및 `pnpm lint` 통과 검증
- 회원가입 화면에서:
  - 이메일 입력 전 발송 버튼 비활성화/유효성 체크
  - 발송 후 6자리 인증코드 입력란 노출 및 타이머 동작
  - 올바른 인증코드와 함께 회원가입 시 정상 로그인 화면 전환
