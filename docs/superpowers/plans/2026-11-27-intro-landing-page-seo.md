# Music Hub Intro Landing Page & SEO Implementation Plan

- **Date:** 2026-11-27
- **Design Spec:** [docs/superpowers/specs/2026-11-27-intro-landing-page-seo-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-27-intro-landing-page-seo-design.md)
- **Target:** Web Frontend (`frontend/`)

---

## 1. Objectives

- Music Hub 방문자를 위한 세련되고 절제된 소개(랜딩) 페이지 구현.
- 문제점 해결(Problem → Solution) 프레임워크 기반의 신뢰도 높은 카피라이팅 및 인터랙티브 UI 목업.
- `index.html`, `robots.txt`, `sitemap.xml` 및 JSON-LD를 통한 SEO / 소셜 공유 최적화.
- 비로그인 유저의 첫 진입점을 랜딩 페이지로 설정하고, [시작하기/로그인]을 통해 로그인 화면으로 매끄럽게 연결.

---

## 2. Implementation Tasks

### Task 1: SEO, Metadata & Crawler Configuration
- Edit `frontend/index.html`:
  - Enhance Title, Description, Keywords, Canonical URL.
  - Add Open Graph (`og:*`) & Twitter Card (`twitter:*`) tags.
  - Add Schema.org JSON-LD `WebApplication` snippet.
- Create `frontend/public/robots.txt`:
  - Allow root and legal pages, disallow private/admin endpoints.
- Create `frontend/public/sitemap.xml`:
  - Standard XML sitemap listing `/`, `/privacy`, `/terms`.

### Task 2: Subtle Motion Hook & Animations
- Create `frontend/src/components/pages/landing/hooks/useScrollReveal.ts`:
  - IntersectionObserver-based hook to toggle visibility / transition classes on scroll.
- Add subtle CSS keyframes in `frontend/src/index.css` (e.g. `@keyframes wave` for equalizer bars).

### Task 3: Landing Page Components & Sections
- Create `frontend/src/components/pages/landing/components/PlayerMockup.tsx`:
  - Glassmorphic audio player card mockup with animated waveform and track listing.
- Create `frontend/src/components/pages/landing/sections/LandingHeader.tsx`:
  - Frosted glass navbar with navigation anchors and Login/CTA buttons.
- Create `frontend/src/components/pages/landing/sections/LandingHero.tsx`:
  - Value proposition headline, badge, CTA buttons, and `PlayerMockup`.
- Create `frontend/src/components/pages/landing/sections/LandingProblem.tsx`:
  - 3 problem cards (Unstreamable music, sync friction, cloud drive limits).
- Create `frontend/src/components/pages/landing/sections/LandingSolution.tsx`:
  - Problem vs. Solution comparison matrix.
- Create `frontend/src/components/pages/landing/sections/LandingFeatures.tsx`:
  - 3 core feature highlights (Native streaming, auto metadata, responsive/media session).
- Create `frontend/src/components/pages/landing/sections/LandingHowItWorks.tsx`:
  - 3 simple steps (Upload, Organize, Stream).
- Create `frontend/src/components/pages/landing/sections/LandingFaq.tsx`:
  - Interactive accordion for key user questions.
- Create `frontend/src/components/pages/landing/sections/LandingFooter.tsx`:
  - Minimal footer with legal links and copyright.
- Create `frontend/src/components/pages/landing/LandingPage.tsx`:
  - Main container pulling all sections together and handling route actions.

### Task 4: Routing Integration in `App.tsx`
- Update `App.tsx`:
  - Support `landing` / `about` routes explicitly.
  - For unauthenticated users:
    - Default route `/` displays `<LandingPage onLogin={() => ...} onNavigateLegal={...} />`.
    - If user clicks [로그인] or navigates to `/login`, display `<LoginPage />`.
    - Provide a back-to-landing button or link from `<LoginPage />`.
  - Maintain existing authenticated flow (authenticated users see `<LibraryPage />` directly).

### Task 5: Build & Lint Verification
- Run `pnpm run build` to verify TypeScript and bundling.
- Run `pnpm run lint` and `pnpm run format:check` to ensure code style compliance.
