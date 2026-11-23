# Implementation Plan: YouTube Audio Extraction Dedicated Page, In-Screen Metadata Edit & Pipeline

- **Date:** 2026-11-23
- **Spec:** [docs/superpowers/specs/2026-11-23-youtube-audio-extraction-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-23-youtube-audio-extraction-design.md)
- **Status:** Completed
- **Target Components:**
  - `backend/Dockerfile`
  - `backend/src/main/kotlin/com/musichub/backend/global/config/SecurityConfig.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/extraction/ExtractionController.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/extraction/ExtractionService.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/extraction/MediaExtractor.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileController.kt`
  - `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileService.kt`
  - `backend/src/test/kotlin/com/musichub/backend/domain/extraction/ExtractionSecurityTest.kt`
  - `backend/src/test/kotlin/com/musichub/backend/domain/extraction/ExtractionControllerTest.kt`
  - `backend/src/test/kotlin/com/musichub/backend/domain/extraction/ExtractionServiceTest.kt`
  - `frontend/src/types/extraction.ts`
  - `frontend/src/api/extractionApi.ts`
  - `frontend/src/api/musicApi.ts`
  - `frontend/src/components/atoms/YoutubeIcon.tsx`
  - `frontend/src/components/organisms/EditMetadataModal.tsx`
  - `frontend/src/components/pages/extraction/ExtractionPage.tsx`
  - `frontend/src/components/pages/extraction/ExtractionInputCard.tsx`
  - `frontend/src/components/pages/extraction/ExtractionActiveJobCard.tsx`
  - `frontend/src/components/pages/extraction/ExtractionHistoryTable.tsx`
  - `frontend/src/components/pages/extraction/ExtractionStatusBadge.tsx`
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
   - Access restricted to `ADMIN` and `DOWNLOADER` with Stealth 404 response.
   - Dedicated Frontend Page (`/extractions`) with in-screen metadata editing via promoted `EditMetadataModal`.

---

## 2. Step-by-Step Milestones

### Milestone 1: 인가(RBAC) & 백엔드 Stealth 404 보안 강화
- [x] `SecurityConfig.kt`에 `/api/extractions/**` 접근 권한을 `hasAnyRole('ADMIN', 'DOWNLOADER')`로 설정하고, 인가 실패 시 `404 Not Found`를 반환하는 `AccessDeniedHandler` 등록.
- [x] 비인가 사용자(`role == null`) 요청 시 `404 Not Found` 반환 테스트 코드 작성 (`ExtractionSecurityTest.kt`).
- [x] `ExtractionController.kt`에 입력 URL 사전 검증 로직 추가 (빈 값, 유효하지 않은 URL 스키마 등 400 Bad Request 반환).

### Milestone 2: 서버 런타임 인프라 환경 구축 (`Dockerfile`)
- [x] `backend/Dockerfile`의 JRE 런타임 베이스 이미지(Alpine)에 `ffmpeg`, `python3`, `curl` 및 `yt-dlp` 바이너리 설치 스크립트 반영.
- [x] 컨테이너 및 로컬 환경에서 `yt-dlp` 및 `ffmpeg` 실행 가능 여부 점검 및 에러 처리 보강.

### Milestone 3: 백엔드 추출 파이프라인 고도화 & 단건 조회 API
- [x] `MediaExtractor.kt`:
  - YouTube URL 정규식 검증 추가 (`youtube.com`, `youtu.be`, `music.youtube.com`).
  - `--embed-thumbnail` 및 `--add-metadata` 옵션 적용으로 앨범 커버 및 기본 태그 추출.
  - 영상 최대 길이(30분) 및 비정상 스트림 사전 차단 옵션 적용.
  - 프로세스 타임아웃(5분) 적용하여 좀비 프로세스 방지.
- [x] `ExtractionService.kt`:
  - 작업 생성 전 사용자 잔여 용량 체크 (남은 용량이 최소 예상치 미만일 경우 즉시 예외 반환).
  - 썸네일 파일 파싱 및 R2 업로드(`artworkStorageKey`) 파이프라인 완성.
  - 사용자 친화적 에러 메시지 매핑 (예: "비공개 영상이거나 삭제된 영상입니다").
- [x] `MusicFileService.kt` 및 `MusicFileController.kt`:
  - `GET /api/music-files/{id}` 단건 조회 API 추가 (본인 소유 검증 포함).

### Milestone 4: 프론트엔드 라우트 & API 클라이언트 구축
- [x] `frontend/src/types/extraction.ts`:
  - `ExtractionJobStatus`, `ExtractionJobDto` 타입 정의.
- [x] `frontend/src/api/extractionApi.ts`:
  - `requestExtraction(sourceUrl: string): Promise<ExtractionJobDto>`
  - `getExtractionStatus(id: number): Promise<ExtractionJobDto>`
  - `listMyExtractions(): Promise<ExtractionJobDto[]>`
- [x] `frontend/src/api/musicApi.ts`:
  - `getMusicFile(id: number): Promise<MusicFileDto>` 추가.
- [x] `frontend/src/App.tsx`:
  - `AppRoute`에 `'extractions'` 추가 및 `/extractions` 경로 매핑.
  - 비인가 유저(`/extractions` 직접 접근) 404 처리 또는 메인(`/`) 리다이렉트 가드.
- [x] 진입 버튼 연동:
  - `LibraryPage.tsx` 상단 툴바에 `[YouTube 음원 추출]` 버튼.
  - `AccountDropdown.tsx` 메뉴에 `[음원 추출 (YouTube)]` 항목 추가.

### Milestone 5: 컴포넌트 승격 & 전용 화면 메타데이터 수정 UI 연동
- [x] `EditMetadataModal` 승격:
  - `pages/library/track/EditMetadataModal.tsx`를 `organisms/EditMetadataModal.tsx`로 이동 및 승격.
  - `LibraryPage.tsx`의 import 경로 갱신.
- [x] `ExtractionHistoryTable.tsx`:
  - 완료된 음원 행에 `[수정(연필 아이콘)]` 버튼 추가.
- [x] `ExtractionActiveJobCard.tsx`:
  - 작업 완료 시 `[지금 메타데이터 수정]` 바로가기 버튼 제공.
- [x] `ExtractionPage.tsx`:
  - `editingTrack` 상태 관리 및 `EditMetadataModal` 연결.
  - 수정 완료 시 R2 동기화 및 캐시 갱신 연동.

### Milestone 6: E2E 검증 및 빌드 확인
- [x] 비인가 사용자(`role == null`)가 API 및 `/extractions` URL 접근 시 `404 Not Found` 반환 확인.
- [x] 추출 화면에서 완료된 곡의 `[수정]` 버튼 클릭 -> 메타데이터 수정 및 R2 동기화 확인.
- [x] 프론트엔드 `pnpm run build` 및 `pnpm run lint` 통과 확인.
- [x] 백엔드 `./gradlew test` 통과 확인.
