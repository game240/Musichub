# Design: YouTube Audio Extraction Dedicated Page & Pipeline

- **Date:** 2026-11-23
- **Status:** Proposed (Approved for Dedicated Page & Stealth 404 Approach)
- **Target Components:** 
  - Backend: `SecurityConfig`, `ExtractionController`, `ExtractionService`, `MediaExtractor`, `backend/Dockerfile`
  - Frontend: `types/extraction.ts`, `api/extractionApi.ts`, `pages/extraction/ExtractionPage.tsx`, `App.tsx`, `LibraryPage.tsx`, `AccountDropdown.tsx`

---

## 1. Overview

유튜브 음원을 고음질(MP3)로 추출하여 개인 보관함(`music_file`)에 자동으로 등록하는 **전용 페이지(`/extractions`) 및 비동기 처리 파이프라인**을 구축합니다.

사용자는 전용 페이지에서 YouTube URL을 입력해 추출을 요청하고, 현재 진행 중인 작업의 진행률(다운로드 -> 변환 -> R2 업로드)과 과거 추출 히스토리를 대시보드 형태로 한눈에 확인할 수 있습니다.

본 기능은 서버 리소스를 집중적으로 소모하므로, **`ADMIN`** 및 **`DOWNLOADER`** 역할을 가진 사용자에게만 권한을 부여하며, 비인가 사용자의 접근은 엔드포인트 존재 자체를 숨기기 위해 **`404 Not Found`**로 응답하여 철저히 보안을 유지합니다.

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
- **BR-5 (도커 및 런타임 환경)**:
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
    - 브라우저 탭 비활성화 시 불필요한 백그라운드 호출 억제(`refetchOnWindowFocus: false`).
    - 3분 이상 지연 시 자동 타임아웃 처리.
  - **추출 내역 테이블 (`ExtractionHistoryTable`)**:
    - 과거 및 현재 추출 작업 목록 표시.
    - 항목: 썸네일/곡명(또는 원본 URL), 상태 뱃지(완료, 진행 중, 실패), 소요시간/일시, 보관함 바로가기.
    - 실패 항목: 구체적인 에러 사유 툴팁 표시.

---

## 3. Architecture & API Design

### 3.1 Security Layer (Stealth 404)
```kotlin
// SecurityConfig.kt
// 비인가 사용자가 /api/extractions/**에 접근할 경우 403 Forbidden 대신 404 Not Found 반환
.authorizeHttpRequests { auth ->
    auth
        .requestMatchers("/api/auth/**").permitAll()
        .requestMatchers("/error").permitAll()
        .requestMatchers("/api/extractions/**").hasAnyRole("ADMIN", "DOWNLOADER")
        .anyRequest().authenticated()
}
.exceptionHandling { handling ->
    // /api/extractions에 대한 AccessDenied 발생 시 404로 응답하는 커스텀 AccessDeniedHandler 등록
}
```

### 3.2 Backend Service & Docker
- `backend/Dockerfile`:
  ```dockerfile
  FROM eclipse-temurin:21-jre-alpine
  RUN apk add --no-cache ffmpeg python3 py3-pip curl && \
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
      chmod a+rx /usr/local/bin/yt-dlp
  ```
- `MediaExtractor.kt`:
  - ProcessBuilder 옵션 고도화: `--extract-audio`, `--audio-format mp3`, `--audio-quality 0`, `--no-playlist`, `--embed-thumbnail`, `--add-metadata`
  - URL 정규식 사전 검증

### 3.3 Frontend Architecture
- `types/extraction.ts`:
  ```typescript
  export type ExtractionJobStatus = 'PENDING' | 'DOWNLOADING' | 'CONVERTING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';

  export interface ExtractionJobDto {
    id: number;
    sourceUrl: string;
    status: ExtractionJobStatus;
    attempts: number;
    errorMessage: string | null;
    musicFileId: number | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
  }
  ```
- `api/extractionApi.ts`:
  - `requestExtraction(sourceUrl: string): Promise<ExtractionJobDto>`
  - `getExtractionStatus(id: number): Promise<ExtractionJobDto>`
  - `listMyExtractions(): Promise<ExtractionJobDto[]>`
- `components/pages/extraction/`:
  - `ExtractionPage.tsx`: 전용 페이지 메인 컴포넌트
  - `ExtractionInputCard.tsx`: URL 입력 및 추출 시작 폼
  - `ExtractionActiveJobCard.tsx`: 진행 중인 작업 프로그레스 바 카드 (조건부 2초 폴링)
  - `ExtractionHistoryTable.tsx`: 이전 추출 작업 목록 테이블

---

## 4. Verification Plan

1. **Stealth 404 보안 검증**:
   - `role == null` 일반 사용자로 `/api/extractions/**` 호출 시 `404 Not Found` 반환 확인 (존재 은폐).
   - `ADMIN` 및 `DOWNLOADER` 계정으로 정상 호출 확인.
   - 프론트엔드 비인가 사용자의 `/extractions` 직접 접근 시 404 또는 메인 화면 리다이렉트 확인.
2. **도커 및 런타임 환경 검증**:
   - 컨테이너 내 `yt-dlp` 및 `ffmpeg` 실행 확인.
3. **E2E 추출 파이프라인 및 조건부 폴링 검증**:
   - URL 입력 -> 작업 생성 -> 실시간 상태 변화(`DOWNLOADING` -> `CONVERTING` -> `UPLOADING` -> `COMPLETED`) 동안만 2초 폴링되고, 완료 후 즉시 폴링 정지 확인.
   - Cloudflare R2에 오디오 및 썸네일 업로드 확인 -> `music_file` 등록 -> 라이브러리에서 스트리밍 재생 확인.
