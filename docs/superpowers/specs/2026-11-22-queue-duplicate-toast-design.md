# Design: Toast Notification on Duplicate Track Selection in Playlist Queue

- **Date:** 2026-11-22
- **Status:** Approved
- **Target Components:**
  - Frontend Toast System: `frontend/src/stores/toastStore.ts`, `frontend/src/components/molecules/Toast.tsx`, `frontend/src/components/organisms/ToastContainer.tsx`, `frontend/src/components/templates/AppLayout.tsx`
  - Frontend Player Store: `frontend/src/stores/playerStore.ts`
  - Frontend Library View: `frontend/src/components/pages/library/LibraryPage.tsx`
  - Backend Safeguard: `backend/src/main/kotlin/com/musichub/backend/domain/playback/PlaybackService.kt`
  - Backend Tests: `backend/src/test/kotlin/com/musichub/backend/domain/playback/PlaybackServiceTest.kt`

---

## 1. Problem Statement

When users add songs from the library to their playlist queue (either individually via the track row or in bulk via multi-select batch actions), adding duplicates previously resulted in redundant entries and queue desynchronization bugs.
When a duplicate song is encountered, instead of silently dropping it or failing, the user should receive clear, immediate, and polished visual feedback via a non-intrusive Toast notification.

---

## 2. Requirements & UX Copy (Option B)

### 2.1 UX Copy Requirements
1. **Single Track Duplicate (`onAddToQueue`)**:
   - If the song is already present in `queue`: Show info toast:
     > `"이미 재생목록에 있는 곡입니다."`
   - If successfully added: Show success toast:
     > `"재생목록에 추가했습니다."`
2. **Batch Add (`handleBatchAddToQueue`)**:
   - If **all** selected songs are already in `queue`: Show info toast:
     > `"선택한 곡이 모두 이미 재생목록에 있습니다."`
   - If **some** selected songs are already in `queue` and some are newly added: Show info toast:
     > `"이미 있는 {duplicateCount}곡을 제외하고 {addedCount}곡을 재생목록에 추가했습니다."`
   - If **all** selected songs are newly added: Show success toast:
     > `"{addedCount}곡을 재생목록에 추가했습니다."`

### 2.2 Functional Requirements
- **FR-1 (Global Toast System)**: Create a lightweight Zustand store `toastStore` supporting `info`, `success`, `warning`, and `error` toasts with configurable duration (default 3000ms), unique IDs, and dismiss functionality.
- **FR-2 (Design System Compliance)**: Follow StyleSeed and Linear dark theme:
  - Background `bg-[#18191b]/95 border border-white/10 text-neutral-100 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl`.
  - Positioned top-center (`top-5 left-1/2 -translate-x-1/2 z-50`) to avoid collision with the persistent bottom audio player.
  - Word break `break-keep` to prevent awkward Korean word truncation on mobile screens.
- **FR-3 (Store Return Values)**:
  - `addToQueue(track)` returns `{ added: boolean }`.
  - `addTracksToQueue(tracks)` returns `{ addedCount: number; duplicateCount: number }`.
- **FR-4 (Backend Safeguard)**:
  - Maintain `distinct()` on `queueTrackIds` and `shuffledTrackIds` in `PlaybackService.kt`.

---

## 3. Architecture & Component Hierarchy

```
frontend/src/
  stores/
    toastStore.ts              <- Zustand store managing active toast list and timers
    playerStore.ts             <- Updated addToQueue & addTracksToQueue returning add/dup counts
  components/
    molecules/
      Toast.tsx                <- Single toast item with icon, message, and close button
    organisms/
      ToastContainer.tsx       <- Fixed top-center overlay rendering toast items
    templates/
      AppLayout.tsx            <- Mounts ToastContainer globally
    pages/library/
      LibraryPage.tsx          <- Invokes toast based on addToQueue / addTracksToQueue results
```

---

## 4. Verification Plan

1. **Unit Tests**:
   - Run backend `PlaybackServiceTest` verifying duplicate ID persistence deduplication.
2. **Build & Lint**:
   - Run `pnpm run build` to verify TypeScript types and bundle integrity.
   - Run `pnpm run lint` to verify ESLint compliance.
3. **Manual Flow Verification**:
   - Add a track once -> verify success toast.
   - Add the same track again -> verify "이미 재생목록에 있는 곡입니다." toast.
   - Select multiple tracks where some exist in queue -> verify "이미 있는 N곡을 제외하고 M곡을 재생목록에 추가했습니다." toast.
