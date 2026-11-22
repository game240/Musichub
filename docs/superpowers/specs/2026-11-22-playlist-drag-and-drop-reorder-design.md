# Design: Playlist Drag-and-Drop Reordering

- **Date:** 2026-11-22
- **Status:** Approved / Implemented
- **Target Components:** Frontend (`playerStore.ts`, `PlayerQueueDrawer.tsx`, `useQueueDragAndDrop.ts`, `GlobalPlayer.tsx`)

---

## 1. Overview

This design outlines the architecture, user experience, and technical implementation for **drag-and-drop track reordering** inside the playback queue drawer (`PlayerQueueDrawer`). Users can freely reorder tracks in the active playback queue by dragging a dedicated grip handle or the track row. The new order immediately updates the playback queue, adjusts the current playback pointer (`queueIndex`), triggers smooth FLIP settlement animations, and synchronizes with the backend database.

---

## 2. Requirements

### 2.1 Functional Requirements

- **FR-1 (Drag Handle & Visual Affordance)**:
  - Each item in `PlayerQueueDrawer` displays a dedicated drag grip handle icon (`GripVertical`) to provide a clear drag affordance.
  - Hovering over the handle displays a grab cursor (`cursor-grab`) and a tooltip ("드래그하여 순서 변경"). While dragging, the cursor becomes `cursor-grabbing`.
- **FR-2 (Desktop HTML5 & Mobile Touch Support)**:
  - **Desktop**: Native HTML5 Drag and Drop API (`dragstart`, `dragover`, `drop`, `dragend`) provides native OS drag preview ghost and automatic container scrolling when dragging near top/bottom boundaries.
  - **Mobile / Touch**: Touch event listeners (`touchstart`, `touchmove`, `touchend`) on the grip handle enable seamless dragging on touch screens while retaining normal vertical scroll when touching the rest of the track row.
- **FR-3 (Visual Drop Indicator)**:
  - While dragging:
    - The item being dragged is rendered with reduced opacity (`opacity-40`), subtle dashed accent border, and scale (`scale-[0.99]`).
    - The target insertion slot displays a glowing Linear-style indigo accent line (`#5e6ad2`) above (`before`) or below (`after`) the hovered item, giving clear real-time placement feedback.
- **FR-4 (Playback State Synchronization)**:
  - Dropping the item updates the active queue (`queue` or `shuffledQueue` if shuffle is active) in `playerStore`.
  - `queueIndex` automatically updates to follow `currentTrack` if the currently playing song or items surrounding it are moved.
  - The updated queue order is persisted to PostgreSQL via the existing debounced `schedulePlaybackSync()`.
- **FR-5 (Harmony with FLIP Animation)**:
  - When the item is dropped and the new order is committed to state, the existing `useFlipList` hook executes FLIP animation, causing the affected items to glide smoothly into their new positions.

### 2.2 Non-Functional Requirements

- **NFR-1 (Zero External Dependencies)**: Implement drag-and-drop using standard HTML5 DnD and Pointer/Touch APIs without heavy external libraries, keeping bundle size lean and maintaining 100% React 19 compatibility.
- **NFR-2 (No Unintended Playback Trigger)**: Dragging must never accidentally trigger track playback (`onPlayTrack`). Clicking without dragging will play the track as expected.
- **NFR-3 (Linear Dark Aesthetic)**: Strict conformance to the Linear dark palette (`#0f1011`, border `#5e6ad2`, drop shadow `[0_0_8px_#8590ea]`).

---

## 3. Architecture & Technical Design

### 3.1 Player Store Update (`playerStore.ts`)

Add `reorderQueue(fromIndex: number, toIndex: number)` action to `PlayerState`:

```ts
reorderQueue: (fromIndex: number, toIndex: number) => {
  set((prev) => {
    const isShuffleActive = prev.isShuffle && prev.shuffledQueue.length > 0;
    const activeList = isShuffleActive ? [...prev.shuffledQueue] : [...prev.queue];
    if (
      fromIndex < 0 ||
      fromIndex >= activeList.length ||
      toIndex < 0 ||
      toIndex >= activeList.length ||
      fromIndex === toIndex
    ) {
      return prev;
    }

    const [movedItem] = activeList.splice(fromIndex, 1);
    activeList.splice(toIndex, 0, movedItem);

    // Keep queueIndex synchronized with currentTrack
    let nextQueueIndex = prev.queueIndex;
    if (prev.currentTrack) {
      const foundIdx = activeList.findIndex((t) => t.id === prev.currentTrack?.id);
      if (foundIdx !== -1) {
        nextQueueIndex = foundIdx;
      }
    }

    if (isShuffleActive) {
      return {
        shuffledQueue: activeList,
        queueIndex: nextQueueIndex,
      };
    } else {
      return {
        queue: activeList,
        queueIndex: nextQueueIndex,
      };
    }
  });
  schedulePlaybackSync();
}
```

### 3.2 Target Insertion Index Algorithm

```ts
export function calculateTargetIndex(
  fromIndex: number,
  overIndex: number,
  position: 'before' | 'after',
): number {
  if (fromIndex === overIndex) return fromIndex;

  if (fromIndex < overIndex) {
    // Dragging downward
    return position === 'after' ? overIndex : overIndex - 1;
  } else {
    // Dragging upward
    return position === 'after' ? overIndex + 1 : overIndex;
  }
}
```

### 3.3 Drag and Drop Hook (`useQueueDragAndDrop.ts`)

A dedicated helper hook placed in `frontend/src/components/pages/player/queue/useQueueDragAndDrop.ts`:
- **Desktop Handlers**: `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd`
- **Touch Handlers**: `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` with container edge auto-scrolling
- **DropTarget**: `{ index: number; position: 'before' | 'after' }`

---

## 4. Verification Plan

1. Desktop Drag and Drop: drag downwards and upwards, verify glowing indicator, drop, verify FLIP animation.
2. Mobile / Touch Drag: touch drag via `GripVertical`, auto-scroll when near edges.
3. Queue State & Persistence: verify `queueIndex` stays attached to `currentTrack` and `schedulePlaybackSync()` syncs.
4. Build & Lint: `pnpm build` and `pnpm lint` pass with 0 errors.
