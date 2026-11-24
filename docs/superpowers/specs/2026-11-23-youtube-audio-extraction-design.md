# Design: YouTube Audio Extraction Dedicated Page, Metadata Edit & Pipeline

- **Date:** 2026-11-23
- **Status:** Approved
- **Target Components:** 
  - Backend: `SecurityConfig`, `ExtractionController`, `ExtractionService`, `MediaExtractor`, `MusicFileController`, `MusicFileService`, `backend/Dockerfile`
  - Frontend: `types/extraction.ts`, `api/extractionApi.ts`, `api/musicApi.ts`, `organisms/EditMetadataModal.tsx`, `pages/extraction/ExtractionPage.tsx`, `pages/extraction/ExtractionHistoryTable.tsx`, `pages/extraction/ExtractionActiveJobCard.tsx`, `App.tsx`, `LibraryPage.tsx`, `AccountDropdown.tsx`

---

## 1. Overview

유튜브 음원을 고음질(MP3)로 추출하여 개인 보관함(`music_file`)에 자동으로 등록하는 **전용 페이지(`/extractions`) 및 비동기 처리 파이프라인**을 구축합니다.

YouTube 영상 특성상 제목에 불필요한 태그(`[MV]`, `(Official Audio)`, `[4K]` 등)가 포함되거나 아티스트/앨범 정보가 누락되는 경우가 많으므로, 사용자가 라이브러리로 이동할 필요 없이 **추출 완료 직후 해당 화면에서 즉시 메타데이터(곡명, 아티스트, 앨범 등)를 수정**할 수 있는 인라인 워크플로우를 제공합니다.

본 기능은 **`ADMIN`** 및 **`DOWNLOADER`** 역할을 가진 사용자에게만 권한을 부여하며, 비인가 사용자의 접근은 엔드포인트 존재 자체를 숨기기 위해 **`404 Not Found`**로 응답하여 철저히 보안을 유지합니다.

---

## 2. Requirements & Scope

### 2.1 Backend Requirements
- **BR-1 (인가 제어 - Stealth 404 RBAC)**:
  - `/api/extractions/**` 모든 엔드포인트는 `ROLE_ADMIN` 또는 `ROLE_DOWNLOADER` 사용자만 호출 가능.
  - 비인가 유저(`role == null` 또는 일반 유저) 접근 시 기능 노출을 막기 위해 `403 Forbidden`이 아닌 **`404 Not Found`**를 반환하여 엔드포인트가 존재하지 않는 것처럼 위장.
- **BR-2 (URL 유효성 검사)**:
  - YouTube URL 정규식 검증 (`youtube.com/watch?v=`, `youtu.be/`, `music.youtube.com/watch?v=` 등).
  - 단일 영상(Video)만 허용하고 재생목록 링크 입력 시 안내 및 차단 처리.
- **BR-3 (사용자 저장 공간 사전 검사)**:
  - 유저 잔여 용량(`storageUsedBytes`) 부족 시 사전 예외 처리.
- **BR-4 (추출 엔진 및 메타데이터/썸네일 파이프라인)**:
  - `yt-dlp` 및 `ffmpeg`를 통한 MP3 최고 품질(320k / VBR 최고) 추출.
  - `--embed-thumbnail` 및 `--add-metadata`를 통해 곡 제목, 아티스트 태그와 썸네일(앨범 아트워크) 자동 추출 및 R2 업로드.
  - 최대 30분 영상 길이 제한 및 타임아웃 방지.
- **BR-5 (단건 음원 파일 조회 API - `GET /api/music-files/{id}`)**:
  - 추출 완료 후 즉각적인 메타데이터 편집을 위해 사용자 소유의 단건 `MusicFile` 상세 정보를 조회하는 API 제공.
- **BR-6 (도커 및 런타임 환경)**:
  - `backend/Dockerfile` 런타임(Alpine)에 `ffmpeg`, `python3`, `yt-dlp` 최신 바이너리 설치.

### 2.2 Frontend Requirements
- **FR-1 (라우팅 및 권한 가드 - Stealth 404 처리)**:
  - URL: `/extractions`
  - `user.role === 'ADMIN' || user.role === 'DOWNLOADER'`인 경우에만 접근 허용.
  - 비인가 사용자가 URL로 직접 접근 시 권한 오류 화면 대신 **404 (존재하지 않는 페이지) 또는 메인 화면 리다이렉트**로 처리하여 기능의 존재 자체를 숨김.
- **FR-2 (진입점 UI)**:
  - 라이브러리 상단 툴바: 권한 보유자에게만 `[YouTube 음원 추출]` 버튼 노출 (비인가자에게는 버튼 미노출).
  - 프로필 메뉴(`AccountDropdown`): 권한 보유자에게만 `[음원 추출 (YouTube)]` 메뉴 항목 추가.
- **FR-3 (전용 페이지 레이아웃 - `ExtractionPage.tsx`)**:
  - Linear 스타일의 세련된 다크 테마 UI (`#08090a` 배경, 반투명 글래스모피즘 카드/테이블).
  - **헤더**: 라이브러리로 돌아가기 버튼, 페이지 타이틀, 권한 뱃지 (`ADMIN` / `DOWNLOADER`), 새로고침 버튼.
  - **URL 입력 섹션 (`ExtractionInputCard`)**:
    - YouTube URL 입력창 (실시간 정규식 유효성 검사, 붙여넣기 편의 버튼).
    - 추출 시작 버튼 (즉각적인 로딩 스피너 피드백).
    - 이용 유의사항 (단일 영상 지원, 최대 30분 길이, 개인 소장 목적 등).
  - **활성 작업 진행률 섹션 (Active Job Progress - 스마트 조건부 폴링)**:
    - 진행 중인 작업(`PENDING`, `DOWNLOADING`, `CONVERTING`, `UPLOADING`)이 **존재할 때만 2초 주기로 폴링**, 완료(`COMPLETED`) 또는 실패(`FAILED`) 시 **폴링 즉시 완전 정지**.
    - 완료 시 `[지금 메타데이터 수정]` 바로가기 액션 버튼 제공.
  - **추출 내역 테이블 (`ExtractionHistoryTable`)**:
    - 과거 및 현재 추출 작업 목록 표시.
    - 항목: 썸네일/곡명(또는 원본 URL), 상태 뱃지(완료, 진행 중, 실패), 소요시간/일시, 보관함 바로가기.
    - 완료된 음원 행에 **`[수정(연필 아이콘)]`** 버튼 제공 -> 클릭 시 즉시 `EditMetadataModal` 실행.
- **FR-4 (공유 컴포넌트 승격 - `EditMetadataModal`)**:
  - `pages/library/track/EditMetadataModal.tsx`를 두 도메인(`library`, `extraction`)에서 공유하기 위해 `components/organisms/EditMetadataModal.tsx`로 승격.
  - 수정 완료 시 R2 ID3 비동기 동기화(`tagSyncStore`) 및 추출/라이브러리 쿼리 캐시 동시 무효화.

---

## 3. Architecture & API Design

### 3.1 Security Layer (Stealth 404)
```kotlin
// SecurityConfig.kt
.authorizeHttpRequests { auth ->
    auth
        .requestMatchers("/api/auth/**").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/extractions/**").hasAnyRole("ADMIN", "DOWNLOADER")
        .requestMatchers("/error").permitAll()
        .anyRequest().authenticated()
}
.exceptionHandling { handling ->
    handling.accessDeniedHandler { request, response, _ ->
        if (request.requestURI.startsWith("/api/extractions")) {
            response.status = HttpStatus.NOT_FOUND.value()
            response.contentType = "application/json;charset=UTF-8"
            response.writer.write("""{"status":404,"error":"Not Found","message":"요청하신 리소스를 찾을 수 없습니다."}""")
        } else {
            response.status = HttpStatus.FORBIDDEN.value()
            response.contentType = "application/json;charset=UTF-8"
            response.writer.write("""{"status":403,"error":"Forbidden","message":"접근 권한이 없습니다."}""")
        }
    }
}
```

### 3.2 Music File Detail Endpoint
```kotlin
// MusicFileController.kt
@GetMapping("/{id}")
fun getMusicFile(
    @AuthenticationPrincipal user: UserPrincipal,
    @PathVariable id: Long
): ResponseEntity<MusicFileDto> {
    val musicFile = musicFileService.getMusicFile(user.id, id)
    return ResponseEntity.ok(musicFileService.toDto(musicFile))
}
```

---

## 4. Verification Plan

1. **단건 음원 조회 및 메타데이터 수정 검증**:
   - `GET /api/music-files/{id}` 정상 반환 및 본인 소유 파일 검증.
   - 추출 페이지 내 `[수정]` 클릭 시 모달 오픈 -> 제목/가수 수정 -> R2 동기화 및 즉시 반영 확인.
2. **Stealth 404 보안 검증**:
   - `role == null` 일반 사용자로 `/api/extractions/**` 호출 시 `404 Not Found` 반환 확인.
   - `ADMIN` 및 `DOWNLOADER` 계정으로 정상 호출 확인.
3. **E2E 추출 및 인라인 수정 검증**:
   - URL 입력 -> 추출 완료 -> 해당 화면에서 즉시 메타데이터 수정 -> 라이브러리 목록 확인.
