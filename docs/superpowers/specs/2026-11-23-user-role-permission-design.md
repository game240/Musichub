# Design: User Role Column Addition (users.role)

- **Date:** 2026-11-23
- **Status:** Approved
- **Target Components:** Backend (Flyway, User Entity, UserDto, JWT, Spring Security), Frontend (UserDto Types)

---

## 1. Overview

사용자 테이블(`users`)에 역할/권한을 저장할 수 있는 `role` 컬럼을 추가합니다.  
현재 단계에서는 **`ADMIN` / `DOWNLOADER = NULL`**(즉, 관리자는 `ADMIN`, 현재 음원 다운로드가 가능한 일반 사용자는 `NULL`)로 상정하여 기반 데이터 모델 및 인증 인프라를 구축합니다.  
이후 필요 시 `role`에 따른 세부 분기 처리(다운로드 제한, 관리자 기능 등)를 진행할 수 있도록 확장성을 확보합니다.

> [!NOTE]  
> 이번 작업에서는 **어떠한 기존 기능(다운로드, 업로드, 재생 등)도 차단하거나 분기하지 않습니다.**  
> 기존의 모든 API와 UI 동작은 100% 동일하게 유지되며, 순수하게 `users` 테이블 스키마와 관련 엔티티/DTO/토큰에 `role` 컬럼을 반영하는 작업만 진행합니다.

---

## 2. Requirements & Scope

### 2.1 Scope
- **포함 사항 (In-Scope)**:
  1. `users` 테이블에 `role VARCHAR(32)` 컬럼 추가 (Flyway `V6__add_user_role.sql`)
  2. 역할 정의:
     - `'ADMIN'`: 최고 관리자
     - `'DOWNLOADER'`: 향후 세부 분기를 위해 허용하되, **현재는 `DOWNLOADER = NULL`**로 취급
     - `NULL`: 일반 사용자 (현재 음원 다운로드 및 기본 기능 이용자)
     - DB Check 제약조건: `CHECK (role IN ('ADMIN', 'DOWNLOADER') OR role IS NULL)`
  3. Kotlin `UserRole` Enum (`ADMIN`, `DOWNLOADER`) 및 `User.kt` 엔티티 매핑 (`var role: UserRole? = null`)
  4. Access Token(JWT) Claims 및 `UserPrincipal`에 `role` 필드 반영
  5. `UserDto` 및 프론트엔드 `UserDto` 타입 정의에 `role` 반영
- **제외 사항 (Out-of-Scope - 향후 별도 작업)**:
  - 역할(`role`)에 따른 기능 분기 처리 (다운로드 차단, 어드민 전용 API 등은 추후 진행)

---

## 3. Detailed Specifications

### 3.1 Database Migration (`V6__add_user_role.sql`)
```sql
-- 사용자 테이블에 역할(role) 컬럼 추가
-- ADMIN: 최고 관리자
-- DOWNLOADER: 향후 분기를 위해 허용 (현재는 DOWNLOADER = NULL로 상정)
-- NULL: 일반 사용자 (현재 음원 다운로드 등 기본 기능 이용)
ALTER TABLE users ADD COLUMN role VARCHAR(32);
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'DOWNLOADER') OR role IS NULL);

CREATE INDEX idx_users_role ON users(role);
```

### 3.2 Backend Implementation

#### 1) `UserRole.kt` & `User.kt`
- `UserRole` Enum 정의:
  ```kotlin
  enum class UserRole {
      ADMIN,
      DOWNLOADER
  }
  ```
- `User.kt`:
  ```kotlin
  @Enumerated(EnumType.STRING)
  @Column(name = "role")
  var role: UserRole? = null
  ```
  - 헬퍼 메서드:
    ```kotlin
    fun isAdmin(): Boolean = role == UserRole.ADMIN
    ```

#### 2) `JwtProvider.kt` & `UserPrincipal.kt` & `JwtAuthFilter.kt`
- Access Token 발급 시 `claim("role", user.role?.name)` 포함
- `UserPrincipal`:
  ```kotlin
  data class UserPrincipal(
      val id: Long,
      val email: String,
      val role: UserRole? = null
  ) : UserDetails {
      override fun getAuthorities(): Collection<GrantedAuthority> {
          val authorities = mutableListOf<GrantedAuthority>(SimpleGrantedAuthority("ROLE_USER"))
          when (role) {
              UserRole.ADMIN -> {
                  authorities.add(SimpleGrantedAuthority("ROLE_ADMIN"))
              }
              UserRole.DOWNLOADER -> {
                  authorities.add(SimpleGrantedAuthority("ROLE_DOWNLOADER"))
              }
              null -> {}
          }
          return authorities
      }
      fun isAdmin(): Boolean = role == UserRole.ADMIN
      ...
  }
  ```
- `JwtAuthFilter`:
  토큰 파싱 시 `role` claim(`String?`)을 읽어 `UserRole`로 변환 후 `UserPrincipal`에 주입.

#### 3) `UserDto` (`AuthController.kt`)
```kotlin
data class UserDto(
    val id: Long,
    val email: String,
    val displayName: String?,
    val profileImageUrl: String?,
    val storageUsedBytes: Long,
    val volume: Int,
    val role: String? = null
)
```

### 3.3 Frontend Types (`frontend/src/types/auth.ts`)
```typescript
export type UserRole = 'ADMIN' | 'DOWNLOADER' | null;

export interface UserDto {
  id: number;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  storageUsedBytes: number;
  volume: number;
  role?: UserRole;
}
```

---

## 4. Verification Plan

1. **DB Migration 검증**:
   - `V6__add_user_role.sql` 문법 및 Check 제약조건(`ADMIN`, `DOWNLOADER`, `NULL` 허용, 그 외 값 거부) 확인.
2. **백엔드 단위 테스트**:
   - `AuthServiceTest`: 회원가입/로그인 시 반환되는 `UserDto`에 `role` 필드 정상 바인딩 확인.
   - `UserPrincipalTest`: `role` 값에 따른 Spring Security `GrantedAuthority` 부여 검증.
3. **프론트엔드 빌드 검증**:
   - `pnpm run build`를 통해 TypeScript 컴파일 및 기존 코드 호환성 확인.
