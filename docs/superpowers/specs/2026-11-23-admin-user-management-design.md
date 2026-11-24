# Design: Admin User Management Screen & API

- **Date:** 2026-11-23
- **Status:** Proposed (Awaiting Approval)
- **Target Components:** Backend (Spring Boot 3, Spring Security `@PreAuthorize`, Admin Controller & Service), Frontend (React 19, TypeScript, `pages/admin/AdminUsersPage`, `AccountDropdown`, `AppLayout`)

---

## 1. Overview

이전 작업에서 `users` 테이블에 `role` 컬럼(`ADMIN`, `DOWNLOADER`, `NULL`) 및 인증 인프라를 구축했습니다.  
본 설계는 **최고 관리자(`role == 'ADMIN'`) 전용 유저 관리 화면 및 API**를 도입하여, 관리자가 등록된 사용자 목록을 조회하고 각 사용자의 권한(`role`)을 변경(예: 일반 유저를 `DOWNLOADER` 또는 `ADMIN`으로 승격/변경)할 수 있는 관리 도구를 제공합니다.

---

## 2. Requirements & Scope

### 2.1 Backend Requirements
- **BR-1 (인가 제어 - Admin Only)**:
  - 모든 관리자 API는 `/api/admin/**` 하위에 위치하며, Spring Security에서 `hasRole('ADMIN')` 권한을 요구한다.
  - 비관리자 접근 시 `403 Forbidden` 반환.
- **BR-2 (사용자 목록 조회 API)**:
  - `GET /api/admin/users`:
    - 페이징(`Pageable`, 기본 page=0, size=20) 지원.
    - 검색 쿼리(`query: String?`): 이메일(`email`) 및 닉네임(`displayName`) 대상 대소문자 무시 검색.
    - 응답 데이터(`AdminUserDto`):
      - `id`: 유저 ID
      - `email`: 이메일
      - `displayName`: 닉네임
      - `profileImageUrl`: 프로필 이미지
      - `authProvider`: 가입 수단 (`GOOGLE`, `LOCAL`, `GITHUB`)
      - `role`: 현재 역할 (`ADMIN`, `DOWNLOADER`, `null`)
      - `storageUsedBytes`: 사용 용량
      - `createdAt`: 가입 일시
      - `trackCount`: 보유 음악 파일 수
- **BR-3 (사용자 권한 변경 API)**:
  - `PATCH /api/admin/users/{id}/role`:
    - 요청 바디: `{ "role": "ADMIN" | "DOWNLOADER" | null }`
    - 권한 변경 후 갱신된 `AdminUserDto` 반환.
    - **자폭 방지 (Self-Demotion Guard)**: 현재 로그인한 관리자 본인의 `ADMIN` 권한을 해제(`null` 또는 `DOWNLOADER`로 변경)하려는 요청은 `400 Bad Request`로 차단하여 관리자 고립 사고를 방지한다.

### 2.2 Frontend Requirements
- **FR-1 (진입 경로 및 권한 가드)**:
  - `user.role === 'ADMIN'`인 사용자에게만 `AccountDropdown` 메뉴 상단에 `[유저 관리]` 버튼(Shield/Users 아이콘)을 노출한다.
  - 비관리자이거나 비로그인 사용자가 브라우저 URL(`/admin/users`)로 직접 접근 시 메인 화면(`/`)으로 자동 리다이렉트한다.
- **FR-2 (유저 관리 화면 UI - `pages/admin/AdminUsersPage.tsx`)**:
  - Linear 스타일의 세련된 다크 테마 UI (`#08090a` 배경, 반투명 글래스모피즘 테이블, 섬세한 보더).
  - 상단 헤더: 관리자 대시보드 타이틀, 메인 라이브러리로 돌아가기 버튼, 전체 유저 수 요약, 이메일/닉네임 실시간 검색창.
  - 유저 테이블:
    - 프로필 / 닉네임 / 이메일
    - 가입 제공자 뱃지 (Google / Local 등)
    - 저장공간 사용량 및 곡 수
    - 가입일시 (YYYY-MM-DD)
    - 현재 역할 뱃지 & 역할 변경 드롭다운/버튼 (`ADMIN`, `DOWNLOADER`, `일반 사용자`)
- **FR-3 (역할 변경 상호작용 및 피드백)**:
  - 역할 변경 시 즉각적인 로딩 스피너 및 성공 토스트(`toastStore`) 피드백.
  - 관리자(`ADMIN`)로 승격 시 한 번 더 확인할 수 있는 확인 다이얼로그(또는 확인 토글) 제공.
  - 본인 계정의 권한 변경은 비활성화(disabled + "본인 계정은 변경 불가" 툴팁).

---

## 3. Architecture & API Design

### 3.1 Backend Architecture

#### 1) `AdminUserController.kt`
```kotlin
package com.musichub.backend.domain.admin

import com.musichub.backend.domain.user.UserRole
import com.musichub.backend.global.security.UserPrincipal
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.Instant

data class AdminUserDto(
    val id: Long,
    val email: String,
    val displayName: String?,
    val profileImageUrl: String?,
    val authProvider: String,
    val role: String?,
    val storageUsedBytes: Long,
    val trackCount: Long,
    val createdAt: Instant
)

data class UpdateUserRoleRequest(
    val role: UserRole? = null
)

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
class AdminUserController(
    private val adminUserService: AdminUserService
) {
    @GetMapping
    fun listUsers(
        @RequestParam(required = false) query: String?,
        pageable: Pageable
    ): ResponseEntity<Page<AdminUserDto>> {
        return ResponseEntity.ok(adminUserService.getUsers(query, pageable))
    }

    @PatchMapping("/{id}/role")
    fun updateUserRole(
        @AuthenticationPrincipal admin: UserPrincipal,
        @PathVariable id: Long,
        @RequestBody request: UpdateUserRoleRequest
    ): ResponseEntity<AdminUserDto> {
        return ResponseEntity.ok(adminUserService.updateRole(admin.id, id, request.role))
    }
}
```

#### 2) `AdminUserService.kt`
- `userRepository`와 `musicFileRepository`를 조회하여 유저 목록 및 곡 수를 집계.
- `updateRole(adminId: Long, targetUserId: Long, newRole: UserRole?)`:
  - `adminId == targetUserId && newRole != UserRole.ADMIN` 시 `IllegalArgumentException("본인의 관리자 권한은 해제할 수 없습니다.")`.
  - 유저 조회 $\rightarrow$ `user.role = newRole` $\rightarrow$ 저장 후 DTO 반환.

#### 3) `SecurityConfig.kt`
- `@EnableMethodSecurity` 활성화 또는 `requestMatchers("/api/admin/**").hasRole("ADMIN")` 추가.

### 3.2 Frontend Architecture

#### 1) 디렉터리 구조 (`frontend/src/components/pages/admin/`)
```
frontend/src/components/pages/admin/
├── AdminUsersPage.tsx          # 메인 유저 관리 화면
├── user/
│   ├── UserSearchInput.tsx     # 검색창 컴포넌트
│   ├── UserRoleBadge.tsx       # 역할별 컬러 뱃지 (ADMIN: 보라, DOWNLOADER: 파랑, 일반: 회색)
│   └── UserRoleSelect.tsx      # 역할 변경 드롭다운/버튼
```

#### 2) API 클라이언트 (`frontend/src/api/adminApi.ts`)
```typescript
export interface AdminUserDto {
  id: number;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  authProvider: string;
  role: 'ADMIN' | 'DOWNLOADER' | null;
  storageUsedBytes: number;
  trackCount: number;
  createdAt: string;
}

export const adminApi = {
  getUsers: (query?: string, page = 0, size = 20) =>
    apiClient.get<Page<AdminUserDto>>('/admin/users', { params: { query, page, size } }),
  updateRole: (userId: number, role: 'ADMIN' | 'DOWNLOADER' | null) =>
    apiClient.patch<AdminUserDto>(`/admin/users/${userId}/role`, { role }),
};
```

#### 3) 라우팅 연동 (`App.tsx`)
- `adminRoute: boolean` 상태 지원 (경로 `/admin` 또는 `/admin/users`).
- `user?.role === 'ADMIN'`일 때만 렌더링, 그 외는 홈으로 전환.

---

## 4. Verification Plan

1. **백엔드 단위/통합 테스트**:
   - `AdminUserServiceTest`:
     - 일반 유저를 `ADMIN` 또는 `DOWNLOADER`로 변경 성공
     - 비관리자 호출 시 Security 403 거부
     - 관리자 본인의 권한 해제 시도 시 400 거부
     - 검색어 및 페이징 정상 동작 확인
2. **프론트엔드 검증**:
   - `pnpm run build` 및 `pnpm run lint` 통과
   - 관리자 계정 로그인 시 `AccountDropdown`에 메뉴 노출 확인
   - 유저 검색, 역할 변경 시 즉시 반영 및 토스트 알림 확인
