# Music Hub Frontend: Linear UI & Korean Localization Implementation Plan

- **Date:** 2026-11-18
- **Topic:** Linear-style Dark UI, Pretendard Font, and Full Korean Localization
- **Spec:** [docs/superpowers/specs/2026-11-18-frontend-linear-ui-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-18-frontend-linear-ui-design.md)
- **Target:** `frontend/`

---

## 1. Objectives

1. 기본 언어를 한국어(`ko-KR`)로 전면 전환하고 UI의 모든 영문 라벨, 안내문, 툴팁, 모달 다이얼로그를 자연스러운 한국어로 통일.
2. Pretendard Variable 웹폰트를 적용하고, 재생 시간 및 데이터 크기 변화 시 흔들림을 막는 고정폭 숫자(`tnum`)를 기본 적용.
3. Linear 시그니처 디자인 언어(딥 차콜 배경 `#08090a`, 1px 미세 보더 `border-white/[0.08]`, Linear 바이올렛 `#5e6ad2`, 아크릴 블러)를 컴포넌트 전반에 구현.
4. `AGENTS.md`의 아키텍처 규칙(Shared UI Vocabulary vs Domain Pages 분리) 및 `docs/frontend-verification-guide.md`의 엄격한 린트/포맷 규칙 준수.

---

## 2. Step-by-Step Implementation Tasks

### Task 1: 기본 HTML & 글로벌 폰트/스타일 설정
- [ ] `frontend/index.html`:
  - `<html lang="ko">` 설정
  - 타이틀: `Music Hub - 나만의 클라우드 음악 보관함`
  - Pretendard Variable CDN 웹폰트 링크 추가
- [ ] `frontend/src/index.css`:
  - Pretendard 폰트 패밀리 기본 적용
  - Linear 색상 팔레트 및 배경색 `#08090a` 지정
  - `font-feature-settings: "tnum"` (tabular figures) 적용
  - 슬림 스크롤바 디자인 적용

### Task 2: Shared UI Vocabulary (Atoms & Molecules) 스타일 개편
- [ ] `frontend/src/components/atoms/Button.tsx`:
  - `primary`: Linear 바이올렛 (`bg-[#5e6ad2] hover:bg-[#6f7cf4] text-white shadow-sm border border-indigo-400/30`)
  - `secondary`: 서피스 버튼 (`bg-white/[0.05] hover:bg-white/[0.08] text-neutral-200 border border-white/[0.08]`)
  - `ghost`: 투명 버튼 (`hover:bg-white/[0.05] text-neutral-400 hover:text-white`)
  - `danger`: 붉은 경고 버튼 (`bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30`)
- [ ] `frontend/src/components/atoms/Input.tsx`:
  - Linear 스타일 인풋 (`bg-[#0f1011] border border-white/[0.08] focus:border-[#5e6ad2] text-neutral-100 placeholder:text-neutral-500`)
- [ ] `frontend/src/components/atoms/Badge.tsx`:
  - 단축키 뱃지 및 상태 뱃지용 Linear pill 스타일
- [ ] `frontend/src/components/atoms/ProgressBar.tsx`:
  - 정교한 프로그레스 바 (`bg-white/[0.08]`, 채움 `bg-[#5e6ad2]`)
- [ ] `frontend/src/components/atoms/Slider.tsx`:
  - 호버 시 노출되는 원형 썸과 정밀한 슬라이더 트랙
- [ ] `frontend/src/components/molecules/SearchInput.tsx`:
  - 한국어 플레이스홀더 (`곡 제목, 아티스트, 앨범 검색...`)
  - `⌘K` / `/` 단축키 힌트 뱃지 포함
- [ ] `frontend/src/components/molecules/Dropzone.tsx`:
  - 한국어 안내 텍스트 (`오디오 파일을 여기에 끌어다 놓거나 클릭하여 선택하세요`)
  - 파일 규격 안내 (`MP3, FLAC, M4A, WAV, AAC, OGG 지원 (최대 50MB)`)
  - Linear 스타일의 점선 테두리 및 드래그 오버 상태
- [ ] `frontend/src/components/molecules/EmptyState.tsx`:
  - 한국어 빈 보관함 안내 및 첫 업로드 유도 버튼

### Task 3: Organisms & AppLayout 개편
- [ ] `frontend/src/components/organisms/Modal.tsx`:
  - Linear 아크릴 백드롭 및 모달 카드 (`bg-[#0f1011] border border-white/[0.1] shadow-2xl rounded-2xl`)
- [ ] `frontend/src/components/organisms/ConfirmDialog.tsx`:
  - 한국어 삭제 확인 문구 및 버튼
- [ ] `frontend/src/components/organisms/QuotaIndicator.tsx`:
  - 한국어 저장 공간 라벨 및 퍼센트 게이지
- [ ] `frontend/src/components/templates/AppLayout.tsx`:
  - Linear 상단 내비게이션 바 및 아크릴 블러 헤더

### Task 4: Screen Tree Pages 한국어화 및 Linear UI 적용
- [ ] `frontend/src/App.tsx`:
  - 한국어 로딩 안내 (`뮤직허브 불러오는 중...`)
  - 사용자 프로필 영역 및 로그아웃 툴팁
- [ ] `frontend/src/components/pages/auth/LoginPage.tsx`:
  - Linear 스타일의 중앙 카드 및 배경 바이올렛 방사형 글로우
  - 한국어 카피 (`나만의 클라우드 음악 보관함`, `Google 계정으로 계속하기`)
- [ ] `frontend/src/components/pages/library/LibraryPage.tsx`:
  - 툴바 한국어 (`내 보관함`, `총 {count}곡`, `음원 업로드`)
  - 정렬 옵션 한국어화 (`최신 등록순`, `제목순`, `아티스트순`, `파일 크기순`, `재생 시간순`)
- [ ] `frontend/src/components/pages/library/track/TrackTable.tsx`:
  - 테이블 헤더 한국어 (`#`, `제목`, `아티스트`, `앨범`, `시간`, `크기`)
- [ ] `frontend/src/components/pages/library/track/TrackRow.tsx`:
  - 재생 중 활성 인디고 인디케이터 바 및 틴트 배경
  - 액션 툴팁 한국어화 (`재생`, `일시정지`, `삭제`)
- [ ] `frontend/src/components/pages/library/upload/UploadModal.tsx`:
  - 한국어 업로드 다이얼로그 및 진행 상태 (`대기 중`, `업로드 중...`, `완료`, `실패`)
- [ ] `frontend/src/components/pages/player/GlobalPlayer.tsx`:
  - 하단 아크릴 오디오 플레이어 바 (`backdrop-blur-2xl bg-[#08090a]/90 border-t border-white/[0.08]`)
- [ ] `frontend/src/components/pages/player/PlayerControls.tsx`:
  - 한국어 재생 제어 툴팁 및 키보드 단축키 힌트
- [ ] `frontend/src/components/pages/player/queue/PlayerQueueDrawer.tsx`:
  - 한국어 재생목록 드로어 (`재생목록`, `대기열 비우기`)

### Task 5: 빌드 및 린트 검증
- [ ] `pnpm -C frontend build` 실행 (TypeScript 컴파일 & Vite 프로덕션 번들링)
- [ ] `pnpm -C frontend lint` 실행 (ESLint 및 브레이스 규칙 확인)
- [ ] `pnpm -C frontend format:check` 실행 (Prettier 일치 여부 확인)

---

## 3. Verification Criteria

- [ ] 한글 텍스트 깨짐이나 미번역 영문 누락이 없을 것.
- [ ] Pretendard 폰트가 기본 적용되고, 숫자 카운트 및 시간 표시 시 폭이 고정되어 흔들림이 없을 것.
- [ ] Linear 특유의 세련된 다크 테마(보더, 인디고 포인트, 글래스모피즘)가 자연스럽게 조화를 이룰 것.
- [ ] 모든 빌드 및 린트가 무오류로 통과할 것.
