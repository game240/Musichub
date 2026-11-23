# Implementation Plan: YouTube Audio Extraction Dedicated Page & Pipeline

- **Date:** 2026-11-23
- **Spec:** [docs/superpowers/specs/2026-11-23-youtube-audio-extraction-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-23-youtube-audio-extraction-design.md)
- **Status:** Pending Approval
- **Target Components:**
  - `backend/Dockerfile`
  - `backend/src/main/kotlin/com/musichub/backend/global/config/SecurityConfig.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/extraction/ExtractionController.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/extraction/ExtractionService.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/extraction/MediaExtractor.kt`
  - `backend/src/test/kotlin/com/musichub/backend/domain/extraction/ExtractionSecurityTest.kt`
  - `frontend/src/types/extraction.ts`
  - `frontend/src/api/extractionApi.ts`
  - `frontend/src/components/pages/extraction/ExtractionPage.tsx`
  - `frontend/src/components/pages/extraction/ExtractionInputCard.tsx`
  - `frontend/src/components/pages/extraction/ExtractionActiveJobCard.tsx`
  - `frontend/src/components/pages/extraction/ExtractionHistoryTable.tsx`
  - `frontend/src/components/pages/library/LibraryPage.tsx`
  - `frontend/src/components/organisms/AccountDropdown.tsx`
  - `frontend/src/App.tsx`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - `AGENTS.md`: "feat/* - feature branches cut from dev, merged back with --no-ff".
   - Feature branch: `feat/youtube-audio-extraction`.
   - Commit messages format: `type: subject`.
2. **Architecture**:
   - Backend leverages existing `extraction_job` table and `ExtractionScheduler`.
   - Access restricted to `ADMIN` and `DOWNLOADER`.
   - **Stealth 404**: 일반 사용자가 엔드포인트에 접근할 경우 `403 Forbidden`이 아닌 `404 Not Found`를 반환하여 기능의 존재 자체를 은폐.
   - Dedicated Frontend Page (`/extractions`) with smart conditional polling (active only during processing, idle = 0 requests).

---

## 2. Step-by-Step Milestones

### Milestone 1: 인가(RBAC) & 백엔드 Stealth 404 보안 강화
- [ ] `SecurityConfig.kt`에 `/api/extractions/**` 접근 권한을 `hasAnyRole('ADMIN', 'DOWNLOADER')`로 설정하고, 인가 실패 시 `404 Not Found`를 반환하는 `AccessDeniedHandler` 등록.
- [ ] 비인가 사용자(`role == null`) 요청 시 `404 Not Found` 반환 테스트 코드 작성 (`ExtractionSecurityTest.kt`).
- [ ] `ExtractionController.kt`에 입력 URL 사전 검증 로직 추가 (빈 값, 유효하지 않은 URL 스키마 등 400 Bad Request 반환).

### Milestone 2: 서버 런타임 인프라 환경 구축 (`Dockerfile`)
- [ ] `backend/Dockerfile`의 JRE 런타임 베이스 이미지(Alpine)에 `ffmpeg`, `python3`, `curl` 및 `yt-dlp` 바이너리 설치 스크립트 반영.
- [ ] 컨테이너 및 로컬 환경에서 `yt-dlp` 및 `ffmpeg` 실행 가능 여부 점검 및 에러 처리 보강.

### Milestone 3: 백엔드 추출 파이프라인 고도화
- [ ] `MediaExtractor.kt`:
  - YouTube URL 정규식 검증 추가 (`youtube.com`, `youtu.be`, `music.youtube.com`).
  - `--embed-thumbnail` 및 `--add-metadata` 옵션 적용으로 앨범 커버 및 기본 태그 추출.
  - 영상 최대 길이(예: 30분) 및 비정상 스트림 사전 차단 옵션 적용.
  - 프로세스 타임아웃(예: 최대 3분) 적용하여 좀비 프로세스 방지.
- [ ] `ExtractionService.kt`:
  - 작업 생성 전 사용자 잔여 용량 체크 (남은 용량이 최소 예상치 미만일 경우 즉시 예외 반환).
  - 썸네일 파일 파싱 및 R2 업로드(`artworkStorageKey`) 파이프라인 완성.
  - 사용자 친화적 에러 메시지 매핑 (예: "비공개 영상이거나 삭제된 영상입니다").

### Milestone 4: 프론트엔드 라우트 & API 클라이언트 구축
- [ ] `frontend/src/types/extraction.ts`:
  - `ExtractionJobStatus`, `ExtractionJobDto` 타입 정의.
- [ ] `frontend/src/api/extractionApi.ts`:
  - `requestExtraction(sourceUrl: string): Promise<ExtractionJobDto>`
  - `getExtractionStatus(id: number): Promise<ExtractionJobDto>`
  - `listMyExtractions(): Promise<ExtractionJobDto[]>`
- [ ] `frontend/src/App.tsx`:
  - `AppRoute`에 `'extractions'` 추가 및 `/extractions` 경로 매핑.
  - 비인가 유저(`/extractions` 직접 접근) 404 처리 또는 메인(`/`) 리다이렉트 가드.
- [ ] 진입 버튼 연동:
  - `LibraryPage.tsx` 상단 툴바에 `[YouTube 음원 추출]` 버튼 (권한 사용자에게만 노출).
  - `AccountDropdown.tsx` 메뉴에 `[음원 추출 (YouTube)]` 항목 추가 (권한 사용자에게만 노출).

### Milestone 5: 전용 페이지 UI 컴포넌트 개발 (`pages/extraction/`)
- [ ] `ExtractionPage.tsx`:
  - 상단 헤더: 뒤로가기(`ArrowLeft`), 페이지 타이틀, 권한 뱃지(`ADMIN`/`DOWNLOADER`), 새로고침 버튼.
- [ ] `ExtractionInputCard.tsx`:
  - YouTube URL 입력창 (실시간 YouTube URL 유효성 검사, 붙여넣기 편의 버튼).
  - "음원 추출 시작" 버튼 및 로딩 스피너.
  - 주의사항 안내 (단일 영상 지원, 최대 30분 길이, 개인 소장 목적).
- [ ] `ExtractionActiveJobCard.tsx`:
  - 현재 활성 상태(`PENDING`, `DOWNLOADING`, `CONVERTING`, `UPLOADING`)인 작업 대상 **조건부 스마트 폴링**(2초 주기).
  - 완료 시 즉시 폴링 정지, 3분 초과 시 타임아웃 보호.
- [ ] `ExtractionHistoryTable.tsx`:
  - 과거 추출 내역 목록 테이블 (상태 뱃지, 소요 시간, 실패 사유 툴팁, 생성 일시).
  - 완료된 곡 즉시 라이브러리 연동 및 확인.

### Milestone 6: E2E 검증 및 빌드 확인
- [ ] 비인가 사용자(`role == null`)가 API 및 `/extractions` URL 접근 시 `404 Not Found` 반환 확인 (기능 존재 은폐).
- [ ] `DOWNLOADER` 및 `ADMIN` 계정으로 정상 YouTube URL 추출, R2 업로드, 음원 보관함 추가 및 재생 확인.
- [ ] 프론트엔드 `pnpm run build` 및 `pnpm run lint` 통과 확인.
- [ ] 백엔드 `./gradlew test` 통과 확인.
