# Music Hub Frontend: Linear UI & Korean Localization Design Specification

- **Date:** 2026-11-18
- **Status:** Proposed (Awaiting User Review)
- **Topic:** Korean Localization, Pretendard Typography, and Linear-Style Aesthetic System
- **Target:** Music Hub Web Client (`frontend/`)

---

## 1. Overview & Goals

Music Hub의 웹 클라이언트를 현대적이고 전문적인 생산성 도구의 대표 격인 **Linear 스타일의 다크 모드 인터페이스**로 개편하고, 기본 언어를 **한국어**로 전면 전환하며, 고품질 한글/영문 가독성을 위해 **Pretendard** 폰트를 기본 서체로 적용합니다.

### 핵심 목표
1. **기본 언어 한국어(ko-KR) 전면 적용**:
   - `index.html` 언어 속성 `lang="ko"` 변경.
   - 인증, 라이브러리, 업로드, 플레이어, 모달, 툴팁, 용량 표시 등 모든 사용자 접점 텍스트의 자연스러운 한국어화.
2. **Pretendard Variable 서체 도입**:
   - 한글과 영문, 기호 간 완벽한 시각적 균형을 가진 Pretendard 도입.
   - 숫자 고정폭(`tnum`) 설정을 통해 재생 시간(03:45) 및 용량 크기(MB/GB) 수치 변화 시 글자 떨림 및 레이아웃 흔들림 제거.
3. **Linear 시그니처 인터페이스(Linear Aesthetic) 구현**:
   - **Deep Dark Palette**: 차분하고 깊은 흑색 배경(`#08090a`, `#0f1011`, `#151618`)과 1px의 절제된 반투명 경계선(`border-white/[0.08]`).
   - **Linear Signature Violet/Indigo Accent**: 프라이머리 액센트 컬러 `#5e6ad2` 및 은은한 백라이트 글로우(`box-shadow: 0 0 20px rgba(94, 106, 210, 0.2)`).
   - **Acrylic / Frosted Glass**: 헤더, 플레이어 바, 큐 드로어 등에 `backdrop-blur-xl bg-[#08090a]/80` 적용.
   - **High-Density & Clean Typography**: 작고 선명한 텍스트 척도(12px~14px), 촘촘한 자간(`tracking-tight`), 키보드 단축키 뱃지(`Kbd`) 스타일 적용.
   - **Subtle Micro-Interactions**: 호버 시 부드러운 명도 상승(`hover:bg-white/[0.04]`), 반응형 상태 표시 등 섬세한 인터랙션.
4. **아키텍처 규칙 준수 (`AGENTS.md`)**:
   - `components/atoms/`, `molecules/`, `organisms/`, `templates/`는 도메인 무관(Props in, Events out) 유지.
   - 도메인 특화 텍스트와 레이아웃은 `pages/auth/`, `pages/library/`, `pages/player/`에 엄격히 격리.

---

## 2. Linear Design Tokens & Color Palette

### 2.1 Color Palette

| Token Role | Hex / Value | Description |
|---|---|---|
| **Background (App Canvas)** | `#08090a` | 가장 깊은 기본 배경 (Deep Charcoal Black) |
| **Surface (Card / Sidebar)** | `#0f1011` | 1단계 상위 표면 (카드, 패널 배경) |
| **Surface Elevated (Hover / Input)** | `#151618` | 2단계 상위 표면 (인풋 박스, 리스트 아이템 호버) |
| **Surface Floating (Popup / Drawer)** | `#1c1d20` | 드롭다운 메뉴, 툴팁, 플로팅 모달 표면 |
| **Border Subtle** | `rgba(255, 255, 255, 0.08)` | 1px 미세 구분선 (헤더 하단, 테이블 행 구분) |
| **Border Strong / Active** | `rgba(255, 255, 255, 0.16)` | 포커스 링, 활성화된 카드 테두리 |
| **Text Primary** | `#f7f8f8` | 기본 헤드라인 및 주요 텍스트 |
| **Text Secondary (Muted)** | `#8a8f98` | 아티스트명, 앨범명, 서브라벨 |
| **Text Tertiary (Subtle)** | `#575a61` | 비활성 텍스트, 플레이스홀더, 단축키 라벨 |
| **Brand Primary (Linear Violet)** | `#5e6ad2` | 메인 액션 버튼, 프로그레스 바, 선택 뱃지 |
| **Brand Hover** | `#6f7cf4` | 프라이머리 버튼 호버 상태 |
| **Brand Subtle** | `rgba(94, 106, 210, 0.15)` | 활성 트랙 배경 틴트, 액센트 태그 배경 |
| **Success Emerald** | `#27a672` | 업로드 완료, 정상 연결 상태 |
| **Danger Crimson** | `#eb5757` | 트랙 삭제, 용량 초과 경고, 에러 |
| **Warning Amber** | `#f2994a` | 용량 80% 이상 도달 경고 |

### 2.2 Typography: Pretendard System

- **Webfont URL**: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css`
- **Font Stack**:
  ```css
  font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont,
               system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo',
               'Noto Sans KR', 'Malgun Gothic', sans-serif;
  ```
- **Font Features**:
  - `font-feature-settings: "tnum"`: 재생 시간(02:41) 및 파일 크기(14.8 MB)가 실시간으로 변할 때 레이아웃이 덜컥거리지 않도록 고정폭 숫자 적용.
  - `letter-spacing: -0.015em`: Linear 특유의 정교하고 조밀한 헤드라인/본문 자간.

---

## 3. Screen-by-Screen Korean Localization & Linear UI Specs

### 3.1 로그인 페이지 (`pages/auth/LoginPage.tsx`)
- **디자인 컨셉**:
  - 중앙의 미니멀한 Linear 스타일 글래스 모달 카드 (`bg-[#0f1011] border border-white/[0.08] rounded-2xl shadow-2xl`).
  - 상단에 은은한 Linear 바이올렛 방사형 배경 조명 (`radial-gradient`).
  - 브랜드 로고 아이콘과 세련된 인디고 그라데이션 타이틀.
- **한국어 카피**:
  - 서비스명: `Music Hub`
  - 서브 타이틀: `나만의 클라우드 음악 보관함`
  - 설명: `보유한 음원 파일을 손실 없이 안전하게 보관하고, 언제 어디서나 웹과 모바일에서 끊김 없이 스트리밍하세요.`
  - 버튼: `Google 계정으로 계속하기`
  - 하단 안내: `클라우드플레어 R2 다이렉트 스트리밍 기술로 빠르고 쾌적한 재생 경험을 제공합니다.`

### 3.2 글로벌 헤더 & 레이아웃 (`templates/AppLayout.tsx`, `App.tsx`)
- **디자인 컨셉**:
  - `h-14` 컴팩트 상단바 (`backdrop-blur-xl bg-[#08090a]/80 border-b border-white/[0.08] sticky top-0 z-40`).
  - 좌측: Music Hub 미니멀 로고 + 버전/베타 뱃지 (`text-[11px] font-mono border border-white/10 bg-white/5 text-neutral-400 px-1.5 py-0.5 rounded`).
  - 우측: 실시간 저장 공간 인디케이터 + 구분선(`h-4 w-[1px] bg-white/[0.08]`) + 유저 프로필 + 로그아웃 버튼.
- **한국어 텍스트**:
  - 로딩 상태: `뮤직허브 불러오는 중...`
  - 로그아웃 툴팁/버튼: `로그아웃`

### 3.3 저장 공간 인디케이터 (`organisms/QuotaIndicator.tsx`)
- **디자인 컨셉**:
  - Linear 스타일의 미니멀 인라인 게이지 바 (높이 `h-1.5`, 둥근 모서리, 배경 `bg-white/[0.06]`).
  - 게이지 색상: 평상시 `#5e6ad2`, 80% 이상 `#f2994a`, 95% 이상 `#eb5757`.
- **한국어 텍스트**:
  - `저장 공간`
  - `{used} / {total} ({percent}%)` (예: `1.2 GB / 2.0 GB (60%)`)
  - 툴팁: `개인 보관함 허용량 2.0 GB 중 {used} 사용 중`

### 3.4 라이브러리 페이지 (`pages/library/LibraryPage.tsx`)
- **디자인 컨셉**:
  - 상단 액션 툴바: 트랙 수 카운트 뱃지, 실시간 검색창, 정렬 필터 드롭다운, Linear 스타일 `음원 업로드` 프라이머리 버튼.
  - 단축키 힌트 뱃지: 검색창 우측에 `⌘K` 또는 `/` 뱃지 노출.
- **한국어 텍스트**:
  - 타이틀: `내 보관함`
  - 트랙 수: `총 {count}곡`
  - 검색창 플레이스홀더: `곡 제목, 아티스트, 앨범 검색...`
  - 정렬 옵션:
    - `최신 등록순` (기본값)
    - `제목 가나다순`
    - `아티스트 가나다순`
    - `파일 크기순`
    - `재생 시간순`
  - 버튼: `음원 업로드`

### 3.5 빈 보관함 상태 (`molecules/EmptyState.tsx`)
- **디자인 컨셉**:
  - 중앙의 엠티 스테이트 일러스트/아이콘(음표/클라우드)과 점선 테두리 카드(`border border-dashed border-white/10 rounded-2xl bg-white/[0.01] p-12`).
- **한국어 텍스트**:
  - 타이틀: `보관함에 등록된 음원이 없습니다`
  - 설명: `소장하고 계신 MP3, FLAC, M4A 오디오 파일을 업로드하여 나만의 스트리밍 컬렉션을 시작해보세요.`
  - 버튼: `첫 음원 업로드하기`

### 3.6 트랙 목록 테이블 & 행 (`pages/library/track/TrackTable.tsx`, `TrackRow.tsx`)
- **디자인 컨셉**:
  - 미니멀 테이블 헤더(`text-xs font-medium text-neutral-400 border-b border-white/[0.08]`).
  - 행 호버: `hover:bg-white/[0.03] transition-colors duration-150`.
  - 현재 재생 중인 트랙: 좌측 인디고 세로 인디케이터 바(`w-0.5 bg-[#5e6ad2]`) + 은은한 틴트 배경(`bg-[#5e6ad2]/10`) + 제목 텍스트 컬러 강조.
  - 앨범 아트워크: 섬세한 1px 내부 보더와 둥근 모서리(`rounded-md border border-white/10`).
- **한국어 컬럼 헤더 & 액션**:
  - `#` (트랙 번호 / 재생 버튼)
  - `제목`
  - `아티스트`
  - `앨범`
  - `시간`
  - `크기`
  - 액션 툴팁: `재생`, `일시정지`, `재생목록에 추가`, `음원 삭제`

### 3.7 음원 업로드 모달 (`pages/library/upload/UploadModal.tsx`, `Dropzone.tsx`)
- **디자인 컨셉**:
  - Linear 스타일 팝업 다이얼로그 (`bg-[#0f1011] border border-white/[0.1] rounded-2xl shadow-2xl max-w-xl`).
  - 드래그 앤 드롭 영역: 호버 시 인디고 글로우 테두리 (`border-dashed border-[#5e6ad2] bg-[#5e6ad2]/5`).
  - 업로드 큐 아이템: 파일 크기, 압축 형식 태그, 정밀한 실시간 프로그레스 바.
- **한국어 텍스트**:
  - 모달 제목: `음원 업로드`
  - 모달 설명: `클라우드플레어 R2로 직접 안전하게 전송되며 ID3 메타데이터가 자동 추출됩니다.`
  - 드롭존 안내: `오디오 파일을 여기에 끌어다 놓거나 클릭하여 선택하세요`
  - 지원 포맷 안내: `MP3, FLAC, M4A, WAV, AAC, OGG 지원 (최대 50MB)`
  - 큐 상태: `대기 중`, `업로드 중...`, `완료`, `실패`
  - 버튼: `선택 취소`, `업로드 시작 ({count}개 파일)`, `닫기`

### 3.8 글로벌 오디오 플레이어 바 (`pages/player/GlobalPlayer.tsx`, `PlayerControls.tsx`)
- **디자인 컨셉**:
  - 하단 고정 플로팅 바 (`h-20 backdrop-blur-2xl bg-[#08090a]/90 border-t border-white/[0.08] fixed bottom-0 left-0 right-0 z-50`).
  - 3단 레이아웃:
    - **좌측**: 현재 재생 곡 아트워크, 곡 제목, 아티스트, 포맷 태그 (FLAC/MP3)
    - **중앙**: 시크바(Seek bar)와 재생/일시정지, 이전/다음, 셔플, 반복 버튼
    - **우측**: 볼륨 슬라이더, 음소거 토글, 재생목록 서랍(Queue Drawer) 토글 버튼
- **한국어 툴팁 & 상태**:
  - 버튼 툴팁: `재생 (Space)`, `일시정지 (Space)`, `이전 곡`, `다음 곡`, `셔플 켜기/끄기`, `반복 (전체/한곡/끔)`, `음소거`, `재생목록 열기/닫기`
  - 트랙 없을 때: `재생 중인 곡이 없습니다`

### 3.9 재생목록 드로어 (`pages/player/queue/PlayerQueueDrawer.tsx`)
- **디자인 컨셉**:
  - 우측에서 슬라이드되는 아크릴 패널 (`w-80 bg-[#0f1011]/95 border-l border-white/[0.08] backdrop-blur-xl`).
- **한국어 텍스트**:
  - 헤더: `재생목록`
  - 서브: `총 {count}곡 대기 중`
  - 액션: `목록 비우기`
  - 빈 목록: `대기열이 비어 있습니다. 보관함에서 곡을 재생해 보세요.`

### 3.10 삭제 확인 다이얼로그 (`organisms/ConfirmDialog.tsx`)
- **한국어 텍스트**:
  - 제목: `음원 삭제`
  - 내용: `'{title}' 음원을 보관함에서 삭제하시겠습니까? 클라우드 스토리지(R2)에서도 즉시 영구 삭제되며 복구할 수 없습니다.`
  - 취소 버튼: `취소`
  - 삭제 버튼: `삭제하기`

---

## 4. UI 컴포넌트 라이브러리 (Atoms & Molecules) 스타일 명세

### Button (`atoms/Button.tsx`)
- `primary`: Linear 스타일 인디고 버튼 (`bg-[#5e6ad2] hover:bg-[#6f7cf4] text-white shadow-sm border border-indigo-400/30 font-medium active:scale-[0.98] transition-all`)
- `secondary`: 어두운 서피스 버튼 (`bg-white/[0.05] hover:bg-white/[0.08] text-neutral-200 border border-white/[0.08]`)
- `ghost`: 투명 배경 버튼 (`hover:bg-white/[0.05] text-neutral-400 hover:text-white`)
- `danger`: 붉은 경고 버튼 (`bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30`)

### Input (`atoms/Input.tsx`)
- `bg-[#0f1011] border border-white/[0.08] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] text-sm text-neutral-100 placeholder:text-neutral-500 rounded-lg transition-all`

### Slider / SeekBar (`atoms/Slider.tsx`, `PlayerSeekBar.tsx`)
- 트랙 배경: `h-1 bg-white/[0.08] rounded-full group-hover:h-1.5 transition-all`
- 진행 바: `bg-[#5e6ad2] rounded-full`
- 썸(Thumb): 평상시 숨김 또는 최소화, 호버/드래그 시 화이트 원형 썸 노출 (`w-3 h-3 bg-white rounded-full shadow-md transition-transform scale-0 group-hover:scale-100`)

---

## 5. Verification Plan

1. **빌드 및 타입 체크**:
   - `pnpm -C frontend build` (`tsc -b && vite build`) 통과 확인.
2. **코드 린트 및 포맷팅 검증**:
   - `pnpm -C frontend lint`
   - `pnpm -C frontend format:check` (docs/frontend-verification-guide.md 기준 필수 브레이스 및 스타일 점검).
3. **UI 시각 및 기능 점검**:
   - 한글 텍스트 깨짐 없는지 및 어색한 번역 검수.
   - Pretendard 폰트 로드 및 고정폭 숫자(`tnum`) 정상 적용 여부 확인.
   - Linear 특유의 보더(`border-white/[0.08]`), 인디고 액센트(`#5e6ad2`), 아크릴 블러 배경 정상 렌더링 확인.
