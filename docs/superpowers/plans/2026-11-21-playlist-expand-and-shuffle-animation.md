# Playlist Expand & Shuffle Reorder Animation Implementation Plan

- **Date:** 2026-11-21
- **Spec:** [docs/superpowers/specs/2026-11-21-playlist-expand-and-shuffle-animation-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-21-playlist-expand-and-shuffle-animation-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Feature branch: `feat/playlist-expand-and-shuffle-animation` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: implement playlist expand drawer and shuffle flip animations`).
2. **Architecture**:
   - Lightweight custom FLIP hook (`frontend/src/components/pages/player/queue/useFlipList.ts`) using `useLayoutEffect` and `requestAnimationFrame`.
   - Enhanced `PlayerQueueDrawer.tsx` with smooth CSS slide/expand transitions, backdrop blur, and Escape listener.
   - Forward `onToggleShuffle` from `GlobalPlayer.tsx` to `PlayerQueueDrawer.tsx`.

---

## 2. Step-by-Step Milestones

### Milestone 1: Git Branch Preparation
- [x] Create and checkout feature branch `feat/playlist-expand-and-shuffle-animation` from `dev`.

### Milestone 2: FLIP Animation Hook (`frontend/src/components/pages/player/queue/useFlipList.ts`)
- [x] Create `useFlipList` hook to track elements by key and execute FLIP transitions whenever list order changes.
- [x] Handle clean up, transition end handlers, and container relative layout offset.

### Milestone 3: Drawer Expand & Reorder Animation Integration (`PlayerQueueDrawer.tsx`)
- [x] Update `PlayerQueueDrawer` container classes to support smooth enter/exit slide-expand animations (`translate-x-full` vs `translate-x-0`).
- [x] Add backdrop click-dismiss and `Escape` key handler.
- [x] Position drawer from `top-0` to `bottom-20` so bottom player controls remain unblocked.
- [x] Add shuffle toggle button in the header with `onToggleShuffle` callback.
- [x] Connect `useFlipList` to the track item list and assign element refs with stable track keys.

### Milestone 4: Global Player Integration (`GlobalPlayer.tsx`)
- [x] Pass `onToggleShuffle={toggleShuffle}` to `PlayerQueueDrawer`.

### Milestone 5: Verification & Quality Assurance
- [x] Run `pnpm --prefix frontend build` and verify typechecking and compilation.
- [x] Run `pnpm --prefix frontend lint` and verify ESLint rules.
- [x] Verify backend tests (`./gradlew -p backend test`).
- [x] Commit changes with `type: subject`.
- [x] Merge `feat/playlist-expand-and-shuffle-animation` into `dev` with `--no-ff`.
