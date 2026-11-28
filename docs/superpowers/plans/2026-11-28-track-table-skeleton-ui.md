# Music List Screen Skeleton UI Implementation Plan

- **Date:** 2026-11-28
- **Topic:** Skeleton UI for Music Library Track Table & Toolbar
- **Spec:** [docs/superpowers/specs/2026-11-28-track-table-skeleton-ui-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-28-track-table-skeleton-ui-design.md)
- **Status:** Completed
- **Branch:** `feat/track-table-skeleton-ui` cut from `dev`

---

## 1. Execution Strategy & Architectural Rules

1. **Rule Compliance (`AGENTS.md`)**:
   - `main`: default branch, only verified releasable commits.
   - `dev`: primary development branch.
   - `feat/*`: feature branches cut from `dev`, merged back with `--no-ff`.
   - Commit messages: `type: subject` (e.g., `feat: add skeleton ui for track table and library toolbar`). Short imperative subject, no emoji, no non-ASCII characters.
   - Verification before claiming completion: run `pnpm --prefix frontend build` and `pnpm --prefix frontend lint`.
   - Do not push to remote without being asked; do not release.
2. **Frontend Component Architecture (`AGENTS.md`)**:
   - Shared UI vocabulary: `frontend/src/components/atoms/Skeleton.tsx` (domain-agnostic, props in, pure UI out).
   - Screen tree: `frontend/src/components/pages/library/track/TrackTableSkeleton.tsx` (domain-specific private sub-component under the screen folder).
   - Dependency direction: `LibraryPage` -> `TrackTableSkeleton` -> `Skeleton`. No reverse imports.
   - Visual design: Linear dark theme (`#08090a`, `#0f1011`, `border-white/[0.08]`, `bg-white/[0.06] animate-pulse`).

---

## 2. Step-by-Step Milestones

### Milestone 1: Git Branch Preparation
- [x] Ensure `dev` is clean and up-to-date.
- [x] Cut feature branch `feat/track-table-skeleton-ui` from `dev`.

### Milestone 2: Reusable Atom Primitive (`Skeleton.tsx`)
- [x] Create `frontend/src/components/atoms/Skeleton.tsx`:
  - Interface `SkeletonProps extends React.HTMLAttributes<HTMLDivElement>`.
  - Base classes: `cn('animate-pulse rounded bg-white/[0.06]', className)`.
  - Domain-agnostic, supporting custom width, height, rounded variations via `className`.

### Milestone 3: Domain Track Table Skeleton (`TrackTableSkeleton.tsx`)
- [x] Create `frontend/src/components/pages/library/track/TrackTableSkeleton.tsx`:
  - Interface `TrackTableSkeletonProps { rowCount?: number; }`. Default `rowCount = 8`.
  - Match container styling: `w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0f1011] shadow-2xl`.
  - Render exact `<thead>` layout with header titles:
    - `#` (w-10 sm:w-14)
    - `곡 제목 / 아티스트`
    - `앨범` (hidden md:table-cell)
    - `재생 시간` (hidden sm:table-cell)
    - `파일 크기` (hidden lg:table-cell)
    - `관리` (w-14 sm:w-36)
  - Colocated `TrackRowSkeleton`:
    - Track number placeholder.
    - Artwork square (40x40 / `w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-white/[0.07] shrink-0`).
    - Varying title widths (`w-40`, `w-52`, `w-36`, `w-48`, `w-44`, etc.) and artist widths (`w-24`, `w-32`, `w-20`, etc.) per row index to create an organic, natural feel.
    - Album width variants (hidden md:table-cell).
    - Duration placeholder (hidden sm:table-cell).
    - File size placeholder (hidden lg:table-cell).
    - Desktop 4 icon action placeholders / Mobile kebab placeholder.

### Milestone 4: LibraryPage Integration
- [x] Update `frontend/src/components/pages/library/LibraryPage.tsx`:
  - Import `TrackTableSkeleton` and `Skeleton`.
  - Replace the 256px spinner container (`isLoading ? ... : <TrackTable ... />`) with `<TrackTableSkeleton rowCount={8} />`.
  - Enhance toolbar track count badge:
    - While `isLoading`, display a compact `<Skeleton className="w-12 h-3.5 rounded bg-white/[0.08]" />` inside the badge rather than flashing `총 0곡`.
    - Seamlessly reveal `총 {filteredTracks.length}곡` once data arrives.

### Milestone 5: Verification & Quality Checks
- [x] Run typecheck and production build: `pnpm --prefix frontend build`.
- [x] Run code quality checks: `pnpm --prefix frontend lint` and `pnpm --prefix frontend format:check`.
- [x] Visually verify zero layout shift (CLS) between loading skeleton and populated `TrackTable`.
- [x] Verify responsive breakpoints (Mobile <640px, Tablet 640px~1024px, Desktop >1024px) for perfect column alignment.
- [x] Commit changes with `type: subject` format.
