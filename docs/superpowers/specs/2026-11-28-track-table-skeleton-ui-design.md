# Music List Screen Skeleton UI Design Specification

- **Date:** 2026-11-28
- **Topic:** Skeleton UI for Music Library Track Table & Toolbar
- **Target:** `frontend/src/components/pages/library/` & `frontend/src/components/atoms/`
- **Status:** Proposed

---

## 1. Overview & Problem Statement

Currently, when a user accesses the Music Library (`LibraryPage.tsx`) or reloads the application, the track list area displays a simple centered spinner box (`w-full h-64 flex flex-col items-center justify-center ... animate-spin`) while tracks are fetched from the backend API.

### Current Issues:
1. **Cumulative Layout Shift (CLS)**: The placeholder box (height 256px) does not match the actual dimensions and structure of the 6-column track table. Once data arrives, the screen suddenly jumps into a large table, degrading visual stability.
2. **Toolbar Counter Flash**: The counter badge displays `총 0곡` while data is loading, before abruptly jumping to the actual count (e.g. `총 42곡`).
3. **Perceived Performance**: A generic spinner emphasizes waiting time. A skeleton UI mirroring the actual table layout provides immediate spatial feedback, drastically improving perceived loading speed and polish.

---

## 2. Goals & Non-Goals

### Goals
- **Zero Layout Shift**: The skeleton table container, table header, padding, row heights, and responsive columns must match `TrackTable.tsx` and `TrackRow.tsx` exactly.
- **Organic & Realistic Feel**: Skeleton text blocks (title, artist, album) will use varied realistic widths per row (rather than uniform identical rectangles) to emulate an actual music library list.
- **Architectural Separation (`AGENTS.md`)**:
  - Reusable, domain-agnostic base primitive `Skeleton` placed in `frontend/src/components/atoms/Skeleton.tsx`.
  - Domain-specific table skeleton `TrackTableSkeleton` placed in `frontend/src/components/pages/library/track/TrackTableSkeleton.tsx`.
- **Responsive Parity**: Skeleton columns must toggle at the exact same breakpoints (`hidden md:table-cell`, `hidden sm:table-cell`, `hidden lg:table-cell`, etc.) as the real `TrackRow`.
- **Toolbar Counter Skeleton**: While loading, the `총 N곡` badge should render a subtle skeleton placeholder instead of flashing `0곡`.

### Non-Goals
- Replacing the background refetch indicator: During background refetching (`isRefetching && !isLoading`), the existing tracks table remains visible while the refresh button spins. Skeleton UI applies specifically during initial load or full query invalidation where `isLoading` is true.
- Pagination skeleton: The current library loads 100 tracks per page; infinite scroll or virtualized table skeleton is out of scope.

---

## 3. Design Tokens & Styling (Linear Dark Theme)

All skeleton components will adhere to Music Hub's Linear-style dark aesthetic tokens:
- **Base Canvas**: `#08090a`
- **Surface**: `#0f1011`
- **Border**: `rgba(255, 255, 255, 0.08)`
- **Skeleton Shimmer/Pulse Base**: `rgba(255, 255, 255, 0.06)` with subtle pulse animation (`animate-pulse`).
- **Muted Subtext Skeletons**: `rgba(255, 255, 255, 0.04)` for secondary text (artist, album, duration).

---

## 4. Component Structure & Specifications

### 4.1 Atom Primitive: `Skeleton.tsx` (`components/atoms/Skeleton.tsx`)
A domain-agnostic atom component for rendering pulsing placeholder blocks:
```tsx
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded bg-white/[0.06]', className)}
      {...props}
    />
  );
};
```

### 4.2 Track Table Skeleton: `TrackTableSkeleton.tsx` (`pages/library/track/TrackTableSkeleton.tsx`)
Private screen sub-component matching `TrackTable.tsx`:
- **Outer Container**: `w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0f1011] shadow-2xl`
- **Table Header**: Identical `<thead>` structure:
  - Column 1 (`#`): `w-10 sm:w-14 py-2.5 px-1 sm:px-3 text-center`
  - Column 2 (`곡 제목 / 아티스트`): `py-2.5 px-2 sm:px-4`
  - Column 3 (`앨범`): `py-2.5 px-4 hidden md:table-cell`
  - Column 4 (`재생 시간`): `py-2.5 px-4 hidden sm:table-cell`
  - Column 5 (`파일 크기`): `py-2.5 px-4 hidden lg:table-cell`
  - Column 6 (`관리`): `py-2.5 px-3 sm:px-4 text-center sm:text-right w-14 sm:w-36`
- **Table Body (`TrackRowSkeleton`)**:
  - Renders `rowCount` (default: 8) rows separated by `divide-y divide-white/[0.04]`.
  - Row columns:
    1. **Track Number**: `Skeleton` 16x16px centered.
    2. **Artwork & Title/Artist**:
       - Artwork placeholder: `w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-white/[0.07] shrink-0`.
       - Title line: `h-4 rounded bg-white/[0.08]` with alternating widths (`w-40`, `w-52`, `w-36`, `w-48`, `w-44`, `w-56`, `w-32`).
       - Artist line: `h-3 rounded bg-white/[0.04]` with alternating widths (`w-24`, `w-32`, `w-20`, `w-28`, `w-36`, `w-24`, `w-30`).
    3. **Album** (`hidden md:table-cell`):
       - `h-3.5 rounded bg-white/[0.05]` with alternating widths (`w-28`, `w-36`, `w-24`, `w-32`, `w-40`, `w-20`, `w-32`).
    4. **Duration** (`hidden sm:table-cell`):
       - `h-3.5 w-10 rounded bg-white/[0.05]`.
    5. **File Size** (`hidden lg:table-cell`):
       - `h-3.5 w-14 rounded bg-white/[0.05]`.
    6. **Actions** (`w-14 sm:w-36`):
       - Desktop (`hidden sm:flex justify-end gap-1.5`): Four 28x28px rounded icons (`w-7 h-7 rounded-lg bg-white/[0.04]`).
       - Mobile (`sm:hidden flex justify-center`): One 28x28px circular button (`w-7 h-7 rounded-full bg-white/[0.04]`).

### 4.3 Library Page Integration: `LibraryPage.tsx`
1. **Toolbar Count Badge**:
   ```tsx
   <span className="text-xs text-neutral-400 border border-white/10 bg-white/[0.03] px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
     <Music className="w-3.5 h-3.5 text-[#5e6ad2]" />
     {isLoading ? (
       <Skeleton className="w-12 h-3.5 rounded bg-white/[0.08]" />
     ) : (
       <span>총 {filteredTracks.length}곡</span>
     )}
   </span>
   ```
2. **Table Area Replacement**:
   Replace spinner block with:
   ```tsx
   {isLoading ? (
     <TrackTableSkeleton rowCount={8} />
   ) : (
     <TrackTable ... />
   )}
   ```

---

## 5. Verification Plan
1. **Visual Consistency Check**:
   - Verify table column alignment between skeleton and loaded track table across Mobile (<640px), Tablet (640px - 1024px), and Desktop (>1024px).
   - Confirm zero visual jump (CLS = 0) upon transition from loading to rendered tracks.
2. **Type Checking & Linting**:
   - Run `pnpm run build` in `frontend/` to ensure full TypeScript compilation and Vite bundle pass.
   - Run `pnpm run lint` and `pnpm run format:check` to ensure zero ESLint/Prettier warnings.
