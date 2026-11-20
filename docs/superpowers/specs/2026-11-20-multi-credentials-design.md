# Design: Multi-Credential Account Linking & Security Management

## Overview
Music Hub 계정에서 **계정 병합(Merge) 없이 단일 계정에 다중 로그인 수단(Google 계정 + 일반 이메일/비밀번호)을 안전하게 추가·관리**할 수 있는 아키텍처와 UI를 설계합니다.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1 (인증 수단 매핑 테이블 분리)**:
  - `user_identities` 테이블을 도입하여 사용자와 인증 수단을 1:N 구조로 관리한다.
  - 기존 가입자(Google 및 Local) 데이터를 무중단 마이그레이션(Backfill)한다.
- **FR-2 (독점 매핑 원칙)**:
  - 하나의 Google 계정(고유 `sub`)이나 이메일은 오직 **단 하나의 Music Hub 계정**에만 연결될 수 있다. 이미 다른 계정에 연결된 수단을 추가하려 하면 409 Conflict 에러를 반환한다.
- **FR-3 (고아 계정 방지)**:
  - 등록된 인증 수단이 1개뿐일 때는 해당 인증 수단의 연동 해제를 차단한다 (항상 최소 1개의 로그인 수단 유지).
- **FR-4 (비밀번호 설정 및 변경)**:
  - Google로 가입한 사용자도 마이페이지 모달에서 비밀번호를 등록하여 일반 로그인을 활성화할 수 있다.
  - 이미 비밀번호가 있는 사용자는 기존 비밀번호 확인 후 새 비밀번호로 변경할 수 있다.
- **FR-5 (Google 계정 추가 연동)**:
  - 일반 이메일로 가입한 사용자도 마이페이지 모달에서 Google 원클릭 인증을 거쳐 본인 계정에 Google 로그인을 추가 연결할 수 있다.
- **FR-6 (UI/UX)**:
  - 헤더 우측 상단 프로필/아바타 클릭 시 부드러운 드롭다운 메뉴(이메일, 스토리지 사용량, 계정 보안 설정, 로그아웃) 노출.
  - "계정 및 보안 관리" 클릭 시 Linear 다크 테마 기반의 모달(`AccountSecurityModal`) 표시.
  - 모달 내에서 연결된 수단 상태 확인, Google 연결/해제, 비밀번호 설정/변경을 원스톱으로 지원.

---

## 2. Backend Architecture

### 2.1 Database Migration (`V4__create_user_identities.sql`)
```sql
CREATE TABLE user_identities (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(32) NOT NULL, -- 'LOCAL', 'GOOGLE'
    provider_id     VARCHAR(255) NOT NULL, -- email or google sub
    password_hash   VARCHAR(255),          -- LOCAL일 때만 저장
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_identities_provider_id UNIQUE (provider, provider_id)
);

CREATE INDEX idx_identities_user_id ON user_identities(user_id);

-- 기존 users 테이블의 데이터를 무중단 마이그레이션
INSERT INTO user_identities (user_id, provider, provider_id, password_hash, created_at)
SELECT id, auth_provider, provider_id, password_hash, created_at FROM users;
```

### 2.2 Domain Entity (`UserIdentity.kt`)
```kotlin
@Entity
@Table(
    name = "user_identities",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_identities_provider_id", columnNames = ["provider", "provider_id"])
    ]
)
class UserIdentity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    val provider: AuthProvider,

    @Column(name = "provider_id", nullable = false)
    val providerId: String,

    @Column(name = "password_hash")
    var passwordHash: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)
```

### 2.3 API Endpoints
- `GET /api/user/identities`
  - 반환:
    ```json
    {
      "hasPassword": true,
      "identities": [
        { "provider": "LOCAL", "identifier": "user@naver.com", "createdAt": "..." },
        { "provider": "GOOGLE", "identifier": "user@gmail.com", "createdAt": "..." }
      ]
    }
    ```
- `POST /api/user/identities/password`
  - Request: `{ "currentPassword": "...", "newPassword": "..." }` (최초 등록 시 currentPassword 생략 가능)
  - 로직: 비밀번호 해싱 후 `LOCAL` identity 생성 또는 기존 `passwordHash` 업데이트.
- `POST /api/user/identities/google`
  - Request: `{ "idToken": "..." }`
  - 로직: Google ID 토큰 검증 $\rightarrow$ 다른 계정 점유 여부 확인 $\rightarrow$ 미점유 시 현재 유저에게 `GOOGLE` identity 추가.
- `DELETE /api/user/identities/{provider}`
  - 로직: 현재 연결된 identity 개수 확인 $\rightarrow$ 1개면 예외 발생(최소 1개 필수) $\rightarrow$ 2개 이상이면 해당 provider 삭제.

---

## 3. Frontend Architecture

### 3.1 Components Structure
- `frontend/src/components/organisms/AccountDropdown.tsx`:
  - 헤더 우측 상단 프로필 영역에 배치
  - 프로필 이미지, 닉네임, 이메일, 스토리지 사용 바 표시
  - "계정 및 보안 설정" 버튼 $\rightarrow$ `AccountSecurityModal` 열기
  - "로그아웃" 버튼
- `frontend/src/components/organisms/AccountSecurityModal.tsx`:
  - `Modal` atom/organism 활용
  - **로그인 수단 섹션**:
    - **Google 계정**:
      - 연결됨: 녹색 배지 + 연결된 이메일 + "연결 해제" 버튼
      - 미연결: "Google 계정 연결" 버튼 (클릭 시 Google One Tap / OAuth 팝업)
    - **비밀번호 로그인**:
      - 등록됨: "비밀번호 변경" 버튼
      - 미등록: "비밀번호 설정" 버튼
  - 인라인 폼 (비밀번호 입력/변경) 및 에러/성공 토스트 피드백

---

## 4. Verification & Testing
1. **Backend Tests**:
   - `V4` Flyway 마이그레이션 정합성 검증
   - 비밀번호 없는 Google 계정에 비밀번호 추가 등록 및 두 방식으로 각각 로그인 성공 검증
   - 네이버 일반 계정에 Google 계정 추가 연동 및 두 방식으로 각각 로그인 성공 검증
   - 이미 타 계정에 연결된 Google 계정 연동 시 409 Conflict 검증
   - 유일한 로그인 수단 삭제 시도 시 거절 검증
2. **Frontend Tests**:
   - 드롭다운 토글 및 모달 렌더링 검증
   - 모달 내 Google 연동/해제, 비밀번호 설정 폼 동작 검증
   - `tsc -b && vite build` 및 `eslint .` 검증
