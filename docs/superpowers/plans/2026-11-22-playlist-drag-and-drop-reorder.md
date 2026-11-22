# Playlist Drag-and-Drop Reordering Implementation Plan

- **Date:** 2026-11-22
- **Spec:** [docs/superpowers/specs/2026-11-22-playlist-drag-and-drop-reorder-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-22-playlist-drag-and-drop-reorder-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Feature branch: `feat/playlist-drag-and-drop-reorder` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: implement playlist drag and drop reordering`).
2. **Architecture**:
   - Store action `reorderQueue(fromIndex, toIndex)` in `playerStore.ts` with queueIndex synchronization.
   - Dedicated drag and drop hook `useQueueDragAndDrop.ts` supporting both HTML5 DnD (desktop) and Touch events (mobile).
   - Linear style visual drop indicator line and dragging ghost styling in `PlayerQueueDrawer.tsx`.
   - Smooth FLIP animation via existing `useFlipList.ts` upon drop.

---

## 2. Step-by-Step Milestones

### Milestone 1: Git Branch Preparation
- [x] Create and checkout feature branch `feat/playlist-drag-and-drop-reorder` from `dev`.

### Milestone 2: Store Action Implementation (`frontend/src/stores/playerStore.ts`)
- [x] Add `reorderQueue(fromIndex: number, toIndex: number)` to `PlayerState` interface.
- [x] Implement `reorderQueue`:
  - Splice item from `fromIndex` and insert at `toIndex` in `activeList` (`shuffledQueue` or `queue`).
  - Calculate updated `queueIndex` to track `currentTrack.id`.
  - Invoke `schedulePlaybackSync()` to persist the reordered list.

### Milestone 3: Drag and Drop Hook (`frontend/src/components/pages/player/queue/useQueueDragAndDrop.ts`)
- [x] Implement `calculateTargetIndex(fromIndex, overIndex, position)`.
- [x] Implement `useQueueDragAndDrop`:
  - `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd` for desktop HTML5 Drag & Drop.
  - `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` for mobile touch screens.
  - Container auto-scroll when dragging near top/bottom edges.

### Milestone 4: Queue Drawer UI Integration (`PlayerQueueDrawer.tsx`, `GlobalPlayer.tsx`)
- [x] Add `GripVertical` drag handle with `cursor-grab` styling and tooltip to each track row.
- [x] Add glowing Linear-style drop indicator lines (`before` and `after`) based on `dropTarget`.
- [x] Connect `onReorderTrack` prop to `PlayerQueueDrawer`.
- [x] Pass `reorderQueue` from `usePlayerStore` in `GlobalPlayer.tsx`.

### Milestone 5: Verification & Merge
- [x] Run `pnpm --prefix frontend build` and verify typechecking and compilation.
- [x] Run `pnpm --prefix frontend lint` and verify ESLint rules.
- [ ] Merge `feat/playlist-drag-and-drop-reorder` into `dev` with `--no-ff`.
