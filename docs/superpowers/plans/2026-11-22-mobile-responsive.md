# Mobile Responsive Design & Touch UX Implementation Plan

- **Date:** 2026-11-22
- **Spec:** [docs/superpowers/specs/2026-11-22-mobile-responsive-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-22-mobile-responsive-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules
- Branch: `feat/mobile-responsive` cut from `dev`.
- Component architecture follows `AGENTS.md` (shared vs domain screens, one-way dependency direction).
- StyleSeed / Linear dark theme fidelity preserved.
- Desktop experience preserved without regressions.

---

## 2. Step-by-Step Milestones

### Milestone 1: App Layout & Global Navigation
- [x] Update `frontend/src/components/templates/AppLayout.tsx`:
  - Header padding `px-4 sm:px-6`.
  - Sub-badge `hidden sm:inline-block`.
  - Main container padding `px-3.5 sm:px-6 py-4 sm:py-8 pb-24 sm:pb-32`.
- [x] Update `frontend/src/App.tsx`:
  - Wrap `QuotaIndicator` in `hidden md:flex` so header does not wrap or overflow on mobile.
- [x] Update `frontend/src/components/organisms/FloatingTagSyncWidget.tsx`:
  - Safe mobile positioning `left-4 right-4 sm:left-auto sm:right-6 sm:w-80 max-w-[calc(100vw-32px)]`.
  - Bottom alignment responsive to player height (`bottom-20 sm:bottom-24`).

### Milestone 2: Mobile Bottom Player & Queue Drawer
- [x] Update `frontend/src/components/pages/player/GlobalPlayer.tsx`:
  - Provide dual responsive layout:
    - Desktop: `>= md` existing 3-column dock (`h-20`).
    - Mobile: `< md` sleek compact dock (`h-16`) with top progress line + compact row (Artwork + Title/Artist + Prev/Play/Next/Queue).
- [x] Update `frontend/src/components/pages/player/queue/PlayerQueueDrawer.tsx`:
  - Width: `w-full max-w-[380px] sm:w-96`.
  - Height & bottom anchor: `bottom-16 sm:bottom-20`.
  - Remove track button: visible on touch devices (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).

### Milestone 3: Track Library & Row Touch Optimization
- [x] Update `frontend/src/components/pages/library/LibraryPage.tsx`:
  - Search toolbar: full-width search input on mobile (`flex-1 w-full sm:w-auto`).
  - Action buttons: smooth wrapping on narrow viewports.
- [x] Update `frontend/src/components/pages/library/track/TrackRow.tsx` & `TrackTable.tsx`:
  - Row tap / single click to play on mobile (while preserving double-click or play button click on desktop).
  - Play button state visible and operable on mobile.
  - Action buttons: provide touch-friendly mobile action menu (or touch-visible icons) so touch users can easily download, edit, queue, and delete.
  - Responsive table column padding (`px-2 sm:px-4`).

### Milestone 4: Modals, Forms & Login Page
- [x] Update `frontend/src/components/pages/library/track/EditMetadataModal.tsx`:
  - Switch Year, Genre, Track Number from `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`.
- [x] Update `frontend/src/components/organisms/AccountSecurityModal.tsx`:
  - Make card headers stack vertically on mobile (`flex-col sm:flex-row sm:items-center`).
  - Ensure Google login button and unlink button fit within card boundaries.
- [x] Update `frontend/src/components/organisms/Modal.tsx`:
  - Optimize padding on mobile (`p-4 sm:p-6`, header `px-4 sm:px-6 py-3 sm:py-4`).
- [x] Update `frontend/src/components/pages/auth/LoginPage.tsx`:
  - Outer container `p-4 sm:p-6`, card `p-5 sm:p-8`.
  - 3-column feature highlights font and padding refinement for mobile screens.

### Milestone 5: Verification & Build
- [x] Run `pnpm --prefix frontend build` and verify bundle builds with 0 errors.
- [x] Run `pnpm --prefix frontend lint` and verify 0 errors.
- [x] Run `pnpm --prefix frontend format:check` and verify formatting.
