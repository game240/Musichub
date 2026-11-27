# Music Hub Intro Landing Page & SEO Design Specification

- **Date:** 2026-11-27
- **Status:** Approved
- **Topic:** Introduction Landing Page (Problem-Solution Framework), Subtle Motion, SEO & Metadata Optimization
- **Target:** Music Hub Web Client (`frontend/`)

---

## 1. Overview & Objectives

Music Hub의 외부 유입 및 신규 방문자를 위한 서비스 소개(랜딩) 페이지를 구현합니다.
기존의 바로 로그인 창만 노출되던 진입 방식을 개선하여, 서비스의 핵심 가치와 해결하려는 문제점을 직관적이고 세련되게 전달하며, 검색 엔진(SEO) 및 소셜 미디어 공유(OG/Twitter Card)에 최적화합니다.

### 핵심 설계 원칙
1. **절제된 미학 (Anti-AI Slop Aesthetic)**:
   - 과장된 AI 마케팅 수식어나 인위적인 3D 일러스트, 무지개 네온 그라데이션을 철저히 배제합니다.
   - Music Hub 고유의 Linear-inspired Dark Palette (`#08090a`, `#0f1011`, `#151618`)와 1px 미세 보더(`border-white/[0.08]`), 은은한 바이올렛 틴트(`#5e6ad2`)를 일관되게 적용합니다.
   - 실물감(Tangible Feel)을 위해 실제 서비스의 오디오 플레이어와 트랙 목록을 사실적으로 축소 재현한 다크모드 UI 목업을 배치합니다.
2. **문제점 해결 (Problem → Solution) 스토리라인**:
   - 리스너들이 겪는 현실적인 3대 불편함(스트리밍에 없는 음원, 기기 간 파일 이동의 피로감, 일반 클라우드 드라이브의 한계)을 조명하고, Music Hub가 이를 어떻게 우아하게 해결하는지 대비합니다.
3. **자연스러운 미세 모션 (Subtle Motion)**:
   - 외부 무거운 라이브러리 없이 경량 React Hook(`useScrollReveal`)과 Tailwind CSS 애니메이션을 결합합니다.
   - 부드러운 스크롤 등장(Scroll Reveal: Y축 16px 페이드인), 음악 재생 느낌을 주는 미세 웨이브폼 이퀄라이저 애니메이션, 절제된 카드 호버 인터랙션을 제공합니다.
4. **검색 엔진 & 소셜 최적화 (SEO & Social Sharing)**:
   - `index.html` 내 고품질 메타태그(Title, Description, Keywords, Open Graph, Twitter Cards) 구성.
   - Google 검색엔진용 `WebApplication` Schema.org JSON-LD 마크업 추가.
   - `robots.txt` 및 `sitemap.xml` 추가.
5. **아키텍처 및 라우팅 규칙 준수**:
   - `AGENTS.md`의 컴포넌트 분리 원칙에 따라 `frontend/src/components/pages/landing/` 내에 모듈화.
   - 비로그인 사용자는 `/` 접속 시 소개 페이지로 진입하며, [로그인] 또는 [시작하기] 클릭 시 기존 인증 페이지로 원활하게 전환.

---

## 2. Screen & Section Architecture

```text
frontend/src/components/pages/landing/
├── LandingPage.tsx                  # 메인 레이아웃 및 스크롤 관리
├── sections/
│   ├── LandingHeader.tsx            # Sticky 아크릴 헤더 & 내비게이션 링크 & CTA
│   ├── LandingHero.tsx              # 가치 제안 헤드라인 + CTA + UI 목업
│   ├── LandingProblem.tsx           # 3대 페인포인트 카드 (Problem)
│   ├── LandingSolution.tsx          # 솔루션 비교 그리드 (Solution)
│   ├── LandingFeatures.tsx          # 3대 핵심 기술 디테일 (Features)
│   ├── LandingHowItWorks.tsx        # 3단계 쉬운 사용법 (How It Works)
│   ├── LandingFaq.tsx               # 자주 묻는 질문 아코디언 (FAQ)
│   └── LandingFooter.tsx            # 푸터 및 법적 고지/깃허브 링크
├── components/
│   └── PlayerMockup.tsx             # Hero용 사실적인 다크모드 플레이어 목업
└── hooks/
    └── useScrollReveal.ts           # IntersectionObserver 기반 스크롤 등장 훅
```

---

## 3. Detailed Section Specifications

### 3.1 LandingHeader
- `h-14` Sticky Header with `backdrop-blur-xl bg-[#08090a]/80 border-b border-white/[0.08]`.
- 좌측: Music Hub 심볼 및 텍스트 로고.
- 중앙: 앵커 링크 (`#problem`, `#solution`, `#features`, `#faq`) - 클릭 시 스무스 스크롤.
- 우측: [로그인] 서브 버튼 및 [무료로 시작하기] 프라이머리 버튼.

### 3.2 LandingHero
- 상단 뱃지: `Linear-inspired Personal Cloud Locker`
- 메인 타이틀: `스트리밍에 없는 음악도, 어디서나 나만의 플레이리스트로.`
- 서브 텍스트: `CD 리핑 음원, 미발매곡, 라이브 트랙까지. Cloudflare R2 기반의 초고속 개인 보관함에서 끊김 없이 감상하세요.`
- CTA: [내 보관함 만들기] (Primary) / [기능 살펴보기] (Secondary)
- **PlayerMockup**:
  - 다크 글래스 카드 배경 (`#0f1011`, `border-white/[0.08]`, 그림자 `shadow-2xl`).
  - 앨범 커버, 아티스트/곡명, 재생 상태 바, 부드럽게 높낮이가 변하는 4-bar 오디오 웨이브폼 인디케이터.
  - 가상 트랙 목록 (CD 리핑 트랙, 라이브 세션 트랙 등 현실적인 음악 리스트).

### 3.3 LandingProblem
- 타이틀: `우리가 좋아하던 음악들은 왜 항상 흩어져 있을까요?`
- 3개 카드:
  1. `스트리밍의 사각지대`: 인디 음원, 커버곡, 사운드트랙 등 판권 만료나 미계약으로 스트리밍에 없는 음원들.
  2. `기기 간 전송의 피로감`: PC에서 받은 파일을 스마트폰에 넣으려면 케이블 연결이나 메신저 '나에게 보내기'를 반복해야 하고, 폰 용량은 늘 부족함.
  3. `일반 클라우드 드라이브의 한계`: 구글 드라이브나 드롭박스는 음악 전용이 아니라 태그/앨범아트가 깨지고 백그라운드 재생이나 셔플이 어려움.

### 3.4 LandingSolution
- 타이틀: `로컬 저장의 한계와 스트리밍의 사각지대를 한 번에 해결하는 새로운 방식.`
- 3자 비교 대상: `로컬 저장 / 일반 드라이브` vs `일반 스트리밍 (Spotify, YouTube 등)` vs `Music Hub (개인 클라우드 락커)`
- 4개 핵심 대비 영역:
  1. `미발매곡 / CD / 커버 음원`: 스마트폰 용량 압박 vs 정식 유통곡 외 재생 불가 vs 포맷/출처 무관 브라우저 드래그 앤 드롭 자유 보관
  2. `기기 이동 & 즉시 스트리밍`: 케이블/외장드라이브 & 일반 드라이브 버퍼링 vs 플랫폼 등록곡 한정 vs 어디서나 브라우저 하나로 Range Request 0초 즉시 스트리밍
  3. `메타데이터 & 앨범아트`: 복잡한 태그 프로그램 & 깨짐 vs 플랫폼 고정 정보 수정 불가 vs ID3 자동 파싱 & 브라우저 인라인 편집 & 원본 동기화
  4. `비용 & 광고 / 기능 제한`: 외장하드 구매/드라이브 구독료 vs 월 1~2만 원 구독료 & 광고/백그라운드 차단 vs 광고 제로, 기본 10GB 영구 무료, 모바일 잠금화면 제어 무료
- 하단 신뢰 및 인프라 노트: `글로벌 클라우드 인프라 기반의 독립 저장소로 안전하게 암호화 보관됩니다.` / `Unlimited Free Streaming` 뱃지

### 3.5 LandingFeatures
- 세부 특장점 3선:
  1. `0초 대기 시간의 네이티브 스트리밍`: Presigned URL 기반 브라우저 네이티브 Range Request로 버퍼링 없는 즉각적인 탐색.
  2. `정교한 메타데이터 & 앨범아트 동기화`: ID3v2.3 태그 파싱, 커버아트 추출, 인라인 태그 편집 및 R2 원본 파일 비동기 동기화.
  3. `모든 기기를 아우르는 감상 환경`: PC/태블릿/모바일 반응형 레이아웃 및 MediaSession API를 통한 스마트폰 잠금화면 제어 지원.

### 3.6 LandingHowItWorks
- 3단계 플로우:
  - Step 1: `업로드 (Upload)` - 브라우저 화면에 오디오 파일을 드래그하여 올립니다.
  - Step 2: `자동 정리 (Organize)` - 메타데이터와 커버아트를 자동으로 분석하여 라이브러리에 정렬합니다.
  - Step 3: `즉시 스트리밍 (Stream)` - 어떤 기기에서든 브라우저 하나로 끊김 없이 감상합니다.

### 3.7 LandingFaq
- 아코디언 컴포넌트:
  - Q1: 무료로 사용할 수 있나요? (네, 10GB의 무료 저장 공간이 기본 제공됩니다.)
  - Q2: 어떤 오디오 포맷을 지원하나요? (MP3, FLAC, M4A, WAV 등 주요 오디오 포맷을 지원합니다.)
  - Q3: 모바일에서도 재생이 가능한가요? (별도 앱 설치 없이 모바일 웹 브라우저에서 백그라운드 재생 및 잠금화면 제어가 가능합니다.)
  - Q4: 내 음원 파일은 안전하게 보관되나요? (Cloudflare R2 기반 사용자별 독립 격리 경로에 안전하게 저장됩니다.)

### 3.8 LandingFooter
- 브랜드 로고 및 설명.
- 저작권 표기 및 개인정보처리방침 / 이용약관 링크.
- GitHub 프로젝트 링크.

---

## 4. SEO & Social Meta Specification

- `frontend/index.html`:
  - `title`: `Music Hub - 나만의 클라우드 음악 보관함 & 스트리밍`
  - `meta[name="description"]`: `스트리밍 플랫폼에 없는 소장 음원을 클라우드에 안전하게 보관하고, 모바일과 웹에서 끊김 없이 고음질로 감상하세요.`
  - `meta[name="keywords"]`: `음악 보관함, 개인 클라우드 스트리밍, 소장 음원, MP3 스트리밍, Cloudflare R2, Music Hub`
  - `meta[property^="og:"]`: title, description, url, site_name, type="website"
  - `meta[name^="twitter:"]`: card="summary_large_image", title, description
  - `<script type="application/ld+json">`: `schema.org/WebApplication` 스키마 마크업
- `frontend/public/robots.txt`:
  - 기본 크롤링 허용 (`User-agent: *`, `Allow: /`), 관리자 및 API 보호 (`Disallow: /api/`, `Disallow: /admin`)
- `frontend/public/sitemap.xml`:
  - `/`, `/privacy`, `/terms` 정적 URL 사이트맵

---

## 5. Verification & Quality Gates

- `pnpm run build`: TypeScript 컴파일 및 Vite 번들링 무오류.
- `pnpm run lint`: ESLint / Prettier 룰 준수 및 미사용 변수 없음.
- 모바일 및 데스크톱 반응형 뷰포트 레이아웃 안정성.
