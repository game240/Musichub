# Design: Local Username/Password Authentication (아이디/비밀번호 로그인 및 회원가입)

## Overview
현재 Music Hub는 Google OIDC(OAuth2) 기반 로그인만 지원하고 있습니다.  
본 설계는 Google 계정이 없거나 일반 로그인을 선호하는 사용자를 위해 **이메일/아이디 및 비밀번호 기반의 로컬 인증(로그인 및 회원가입)** 기능을 추가합니다.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1 (회원가입)**:
  - 사용자는 이메일(아이디), 비밀번호, 표시 이름(닉네임)을 입력하여 계정을 생성할 수 있다.
  - 비밀번호는 8자 이상이어야 하며, 회원가입 시 비밀번호 확인 입력을 검증한다.
  - 중복된 이메일로 가입을 시도할 경우 명확한 에러 메시지를 반환한다.
  - 가입 성공 시 자동으로 로그인되어 즉시 서비스를 이용할 수 있도록 토큰(Access Token + Refresh Token Cookie)을 발급한다.
- **FR-2 (로그인)**:
  - 사용자는 가입한 이메일과 비밀번호로 로그인할 수 있다.
  - 인증 성공 시 JWT Access Token과 HttpOnly Refresh Token 쿠키를 발급받는다.
  - 계정이 존재하지 않거나 비밀번호가 틀린 경우 보안을 위해 동일하게 "이메일 또는 비밀번호가 올바르지 않습니다." 오류를 반환한다.
- **FR-3 (보안)**:
  - 비밀번호는 평문으로 저장되지 않으며, Spring Security의 `BCryptPasswordEncoder`를 통해 단방향 해싱되어 `users.password_hash`에 저장된다.
  - 기존의 Refresh Token Rotation 및 만료/탈취 방지 로직과 100% 호환된다.
- **FR-4 (프론트엔드 UI/UX)**:
  - `LoginPage.tsx`에 일반 로그인 폼을 기본으로 배치하고, 필요 시 "회원가입" 모드로 간편하게 전환할 수 있는 토글 UI를 제공한다.
  - 기존 Google 로그인 버튼은 "또는 Google 계정으로 계속하기" 구분선과 함께 그대로 유지된다.
  - Music Hub의 Linear 다크 테마 디자인 시스템(어두운 배경, 은은한 보더, 보라색 포인트 컬러)을 일관되게 적용한다.

---

## 2. Backend Design

### 2.1 Security Configuration (`SecurityConfig.kt`)
- `PasswordEncoder` Bean 등록:
  ```kotlin
  @Bean
  fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()
  ```
- `/api/auth/**` 엔드포인트는 이미 `permitAll()` 허용되어 있으므로 추가 URL 허용 작업은 불필요.

### 2.2 Domain & Data Model
- 기존 PostgreSQL `users` 테이블 스키마에 이미 `auth_provider`, `password_hash`, `provider_id`, `email` 컬럼이 준비되어 있음:
  - `auth_provider = AuthProvider.LOCAL`
  - `provider_id = email` (또는 사용자 고유 ID)
  - `email = email`
  - `password_hash = BCrypt.hashpw(...)`
  - `display_name = displayName ?: email.substringBefore("@")`
- 별도의 DB 스키마 마이그레이션 불필요 (`V1__init.sql`의 `uq_users_provider (auth_provider, provider_id)` 제약조건에 부합).

### 2.3 Auth DTOs (`AuthController.kt`)
```kotlin
data class LocalRegisterRequest(
    @field:NotBlank(message = "이메일은 필수 입력값입니다.")
    @field:Email(message = "올바른 이메일 형식이 아닙니다.")
    val email: String,

    @field:NotBlank(message = "비밀번호는 필수 입력값입니다.")
    @field:Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다.")
    val password: String,

    val displayName: String? = null
)

data class LocalLoginRequest(
    @field:NotBlank(message = "이메일은 필수 입력값입니다.")
    val email: String,

    @field:NotBlank(message = "비밀번호는 필수 입력값입니다.")
    val password: String
)
```

### 2.4 AuthService (`AuthService.kt`)
- `register(request: LocalRegisterRequest, deviceInfo: String?): TokenResult`
  1. `userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, request.email)` 존재 여부 확인 $\rightarrow$ 중복 시 `IllegalArgumentException("이미 등록된 이메일입니다.")`
  2. `passwordEncoder.encode(request.password)`로 비밀번호 암호화
  3. `User(authProvider = AuthProvider.LOCAL, providerId = request.email, email = request.email, passwordHash = ..., displayName = ...)` 생성 및 저장
  4. `issueTokens(user, deviceInfo)` 호출 및 반환
- `loginWithLocal(request: LocalLoginRequest, deviceInfo: String?): TokenResult`
  1. `userRepository.findByAuthProviderAndProviderId(AuthProvider.LOCAL, request.email)` 조회
  2. 사용자 미존재 또는 `passwordHash == null` 또는 `!passwordEncoder.matches(request.password, user.passwordHash)`인 경우 $\rightarrow$ `IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.")`
  3. `issueTokens(user, deviceInfo)` 호출 및 반환

### 2.5 AuthController (`AuthController.kt`)
- `POST /api/auth/register`:
  - Request: `@Valid @RequestBody request: LocalRegisterRequest`
  - Response: `AuthResponse` + Refresh Token Set-Cookie
- `POST /api/auth/login`:
  - Request: `@Valid @RequestBody request: LocalLoginRequest`
  - Response: `AuthResponse` + Refresh Token Set-Cookie

---

## 3. Frontend Design

### 3.1 API Client (`frontend/src/api/authApi.ts`)
```typescript
loginWithLocal(data: LocalLoginRequest): Promise<AuthResponse>
register(data: LocalRegisterRequest): Promise<AuthResponse>
```

### 3.2 Types (`frontend/src/types/auth.ts`)
```typescript
export interface LocalLoginRequest {
  email: string;
  password: string;
}

export interface LocalRegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}
```

### 3.3 UI Layout (`LoginPage.tsx`)
1. **헤더 영역**:
   - Music Hub 로고 아이콘 + 타이틀 + 서비스 소개 문구
2. **모드 토글 및 폼 영역**:
   - 로그인 모드 / 회원가입 모드 탭 또는 하단 전환 링크
   - **로그인 모드**:
     - 이메일 입력 필드 (`type="email"`, `Input` 컴포넌트)
     - 비밀번호 입력 필드 (`type="password"`, `Input` 컴포넌트)
     - 로그인 버튼 (`Button` 컴포넌트, `variant="primary"`)
   - **회원가입 모드**:
     - 이메일 입력 필드
     - 표시 이름(닉네임) 입력 필드 (선택)
     - 비밀번호 입력 필드 (최소 8자)
     - 비밀번호 확인 입력 필드
     - 회원가입 버튼
3. **구분선**:
   - "또는 Google 계정으로 계속하기"
4. **Google 로그인 버튼 영역**:
   - 기존 `<GoogleLogin />` 컴포넌트
5. **개발자 모드 바이패스**:
   - 하단 개발용 버튼 유지

---

## 4. Verification & Testing

1. **백엔드 단위/통합 테스트**:
   - `AuthServiceTest`:
     - 신규 사용자 로컬 회원가입 성공 및 토큰 발급 검증
     - 동일 이메일 중복 회원가입 시 예외 발생 검증
     - 정상 이메일/비밀번호 로그인 성공 검증
     - 잘못된 비밀번호 또는 미등록 이메일 로그인 실패 검증
2. **프론트엔드 검증**:
   - 비밀번호 8자 미만 또는 불일치 시 폼 유효성 에러 표시 확인
   - 회원가입 성공 후 자동 로그인 및 메인 대시보드 진입 확인
   - 로그인 성공 후 메인 대시보드 진입 확인
   - 잘못된 자격증명 입력 시 친절한 에러 메시지 노출 확인
   - `pnpm run build` 및 `pnpm run lint` 통과 검증
