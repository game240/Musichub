# Design: Comprehensive Mobile Responsive Design & Touch UX Optimization

## Overview
Music Hub was originally built with a desktop-first layout. On mobile devices (screen width 320px ~ 768px), several functional and visual issues prevent smooth usage:
1. **GlobalPlayer Layout Breakdown**: Fixed minimum widths (`min-w-[200px]`, `w-2/4`, `min-w-[200px]`) cause horizontal overflow on mobile viewports (< 768px). Volume controls are redundant on mobile OSes (hardware keys are used).
2. **Track Interaction in Library**: Play button and track management actions (download, add to queue, edit metadata, delete) rely on desktop `:hover` (`hidden group-hover:flex`, `opacity-0 group-hover:opacity-100`), making them inaccessible on mobile touch devices. Double-clicking rows to play is desktop-only.
3. **Header Spacing**: Fixed width storage quota gauge (`w-45`) in the top navigation bar collides with branding and account menus on screens under 640px.
4. **Queue Drawer Width & Touch Support**: Fixed `w-80` drawer leaves awkward gaps or overflows on 360px phones, and remove-track buttons are hidden behind hover.
5. **Modal Forms & Dialogs**: 3-column input layouts (`grid-cols-3` in `EditMetadataModal`) and horizontally aligned buttons in `AccountSecurityModal` squeeze and wrap awkwardly.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1 [Touch Playback in Track List]**:
  - Single tap on any track row (or its artwork/play target) plays the track directly.
  - Hover dependency for play button removed or augmented so that touch users always have a clear visual touch target to play/pause.
- **FR-2 [Mobile Action Menu for Tracks]**:
  - Provide an accessible touch action menu (e.g. mobile action popover / dropdown via a visible more button or touch-friendly icon group) allowing mobile users to Download, Add to Queue, Edit Metadata, and Delete tracks.
- **FR-3 [Compact Mobile Bottom Player]**:
  - When viewport is `< 768px` (or `< sm/md`), render a mobile-optimized compact bottom dock:
    - Top edge: continuous slim progress bar (2px) indicating playback progress and scrubbable.
    - Single compact row:
      - Left: Artwork (32x32) + Title & Artist (truncated).
      - Right: Play/Pause button, Next track button, and Queue toggle button.
    - Redundant volume slider hidden on mobile (`hidden md:flex`).
- **FR-4 [Mobile-Friendly Queue Drawer]**:
  - Drawer occupies full width on mobile (`w-full max-w-[380px] sm:w-96`) to eliminate awkward sliver backdrops.
  - Remove-track button ("X") permanently visible on touch devices (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).
  - Drawer bottom anchor aligns with mobile player dock height.
- **FR-5 [Responsive Header & Container]**:
  - Storage quota indicator in the sticky top header hidden on small screens (`hidden sm:flex` / `hidden md:flex`), as the exact storage gauge is already accessible inside `AccountDropdown`.
  - Header branding badge ("클라우드 보관함") hidden on narrow screens (`hidden sm:inline`).
  - Main container padding reduced from `px-6 py-8` to `px-3.5 sm:px-6 py-4 sm:py-8`.
- **FR-6 [Modal & Form Responsiveness]**:
  - `EditMetadataModal`: Year, Genre, Track Number inputs change from `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`.
  - `AccountSecurityModal`: Provider cards stack vertically (`flex-col sm:flex-row`) to prevent Google login button or unlink button collision.
  - `LoginPage`: Outer and card padding relaxed on mobile (`p-4 sm:p-6`, card `p-5 sm:p-8`) to prevent cramped feature cards and forms.
  - `FloatingTagSyncWidget`: Constrained to mobile safe margins (`left-4 right-4 sm:left-auto sm:right-6 sm:w-80`).

### 1.2 Non-Functional Requirements
- **NFR-1**: Preserve existing desktop UI/UX without regression (all desktop hover effects, 3-column player layout, and multi-column tables remain identical at `>= 768px`).
- **NFR-2**: Pure Tailwind CSS utility classes and responsive breakpoints (`sm:`, `md:`, `lg:`). No bulky third-party component libraries added.
- **NFR-3**: Clean touch targets: Touch interactive targets must have at least 36px~44px touch boundaries.

---

## 2. Technical Architecture & Component Changes

### 2.1 Component Tree & File Mapping
- `frontend/src/components/templates/AppLayout.tsx`:
  - Header: Responsive padding (`px-4 sm:px-6`), hide branding badge on `< sm`.
  - Main: Responsive padding (`px-3.5 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-32`).
- `frontend/src/App.tsx`:
  - `headerRight`: Hide `QuotaIndicator` on small screens (`hidden md:flex`).
- `frontend/src/components/pages/player/GlobalPlayer.tsx`:
  - Desktop view (`hidden md:flex`): 3-column layout.
  - Mobile view (`flex md:hidden`): Slim top progress line + compact row (Artwork + Title/Artist + Prev/Play/Next/Queue).
- `frontend/src/components/pages/player/queue/PlayerQueueDrawer.tsx`:
  - Responsive width: `w-full max-w-[380px] sm:w-96`.
  - Responsive bottom anchor: `bottom-16 sm:bottom-20`.
  - Remove button opacity: `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`.
- `frontend/src/components/pages/library/LibraryPage.tsx`:
  - Toolbar: Responsive search input (`w-full sm:w-auto flex-1`), flex wrapping for track count and upload button.
- `frontend/src/components/pages/library/track/TrackRow.tsx`:
  - Support single-click / tap to play.
  - Responsive action buttons: on mobile (`md:hidden`), provide a clear action menu or compact visible buttons so touch users can download, edit, add to queue, or delete without hover.
- `frontend/src/components/pages/library/track/TrackTable.tsx`:
  - Adjust column widths and padding for mobile (`px-2 sm:px-4`).
- `frontend/src/components/pages/library/track/EditMetadataModal.tsx`:
  - `grid-cols-1 sm:grid-cols-3` for Year, Genre, Track Number.
- `frontend/src/components/organisms/AccountSecurityModal.tsx`:
  - `flex-col sm:flex-row` for account link cards.
- `frontend/src/components/organisms/FloatingTagSyncWidget.tsx`:
  - `left-4 right-4 sm:left-auto sm:right-6 sm:w-80`.
- `frontend/src/components/pages/auth/LoginPage.tsx`:
  - Responsive padding and card spacing.
