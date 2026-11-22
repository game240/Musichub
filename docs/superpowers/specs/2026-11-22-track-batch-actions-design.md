# Design: Track Batch Actions (Multi-Select, Batch Download, and Batch Metadata Edit)

- **Date:** 2026-11-22
- **Status:** Approved
- **Target Components:**
  - Frontend Shared UI: `atoms/Checkbox.tsx`, `molecules/FloatingActionBar.tsx`
  - Frontend Screen (Library): `pages/library/LibraryPage.tsx`, `pages/library/track/TrackTable.tsx`, `pages/library/track/TrackRow.tsx`, `pages/library/track/BatchActionBar.tsx`, `pages/library/track/BatchEditMetadataModal.tsx`
  - Frontend Utilities: `utils/downloadBatch.ts`
  - Frontend API & Stores: `api/musicApi.ts`, `stores/playerStore.ts`, `stores/tagSyncStore.ts`

---

## 1. Overview & Problem Statement

Currently, users in MusicHub can only interact with audio tracks individually:
1. **Single-file Download Only**: Exporting multiple songs requires manually clicking each track's download button and waiting one by one.
2. **Repetitive Metadata Edits**: When uploading an album with 10–15 tracks, users must open `EditMetadataModal` on every single song to type identical artist/album names.
3. **No Batch Queue / Batch Delete**: Queueing or cleaning up multiple files requires dozens of repetitive clicks.

This design introduces a cohesive, high-performance **Track Batch Actions System** tailored to MusicHub's Linear-inspired dark UI. Priority is given to **Batch Download**, followed by **Batch Queueing / Batch Delete**, and **Batch Metadata Editing**.

---

## 2. Requirements

### 2.1 Functional Requirements

#### Milestone 1: Selection Mode & Interaction (Core Foundation)
- **FR-1.1 (Dual Entry Points)**:
  - **Implicit Hover Entry**: Hovering over track index `#` reveals a ghost checkbox. Clicking it immediately toggles selection and enters Selection Mode.
  - **Explicit Toolbar Button**: Clicking `[선택]` in the library action toolbar activates Selection Mode across all rows.
  - **Keyboard Shortcuts**: `Shift + Click` selects ranges; `Ctrl/Cmd + A` selects all currently filtered tracks; `Escape` exits selection mode.
- **FR-1.2 (Row Selection Feedback)**:
  - Selected rows highlight with `bg-[#5e6ad2]/10` and `border-l-2 border-[#5e6ad2]`.
  - Master checkbox in table header supports `checked`, `unchecked`, and `indeterminate` states.
- **FR-1.3 (Floating Batch Action Bar)**:
  - Appears smoothly via CSS transitions (`translate-y-0 opacity-100`) above the sticky `GlobalPlayer` (`fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-40`).
  - Displays selected track count (`{N}개 선택됨`), action buttons, and an exit button (`✕`).

#### Milestone 2: Batch Download & Queue Actions (Top Priority)
- **FR-2.1 (Sequential Safe Batch Download)**:
  - Initiates sequential downloads with a 400ms stagger between files to prevent browser multi-file popup blockers.
  - Fetches presigned download URLs via `musicApi.getDownloadUrl(trackId)` for each selected track.
  - Updates progress in the action bar (`다운로드 중... (2/5)`) and provides a cancel/reset mechanism.
- **FR-2.2 (Batch Add to Queue)**:
  - Appends all selected tracks to the current playback queue (`addToQueue` bulk operation) in preserved table order.
- **FR-2.3 (Batch Delete Confirmation)**:
  - Prompts a `ConfirmDialog` stating `"선택한 {N}개 음원을 보관함에서 삭제하시겠습니까?"`.
  - Sequentially or concurrently invokes `musicApi.deleteMusicFile(id)` and updates quota.

#### Milestone 3: Common Metadata Batch Edit
- **FR-3.1 (Selective Overwrite / Field-level Checkbox)**:
  - In `BatchEditMetadataModal`, editable common fields (`Artist`, `Album`, `Year`, `Genre`) each have an "Apply" checkbox toggle.
  - Only fields checked by the user are sent in update payloads; unchecked fields preserve each track's existing values.
- **FR-3.2 (Individual Field Protection)**:
  - `Title`, `TrackNumber`, and `Lyrics` are uniquely track-specific and disabled with explanatory helper text (`곡 제목 등 개별 속성은 변경되지 않습니다`).
- **FR-3.3 (Background Cloud Tag Sync Integration)**:
  - Dispatches tag sync tasks to `useTagSyncStore` so ID3 tags are updated in Cloudflare R2 asynchronously with visual progress.

---

## 3. UI/UX Architecture & Layout

### 3.1 Component Hierarchy (AGENTS.md Compliance)

```
frontend/src/components/
├── atoms/
│   └── Checkbox.tsx                    # Shared domain-agnostic checkbox (custom SVG/Radix style)
├── molecules/
│   └── FloatingActionBar.tsx           # Domain-agnostic floating pill action container
└── pages/library/
    ├── LibraryPage.tsx                 # Holds selectedTrackIds Set, handles batch triggers
    └── track/
        ├── TrackTable.tsx              # Renders master checkbox & passes selection props
        ├── TrackRow.tsx                # Renders row checkbox & selection styling
        ├── BatchActionBar.tsx          # Domain-specific batch actions (Download, Edit, Queue, Delete)
        └── BatchEditMetadataModal.tsx  # Modal with field-level overwrite toggles
```

### 3.2 Floating Action Bar Specifications
- **Styling**: `bg-[#0f1011]/95 border border-white/[0.12] backdrop-blur-xl shadow-2xl rounded-full px-4 py-2.5 flex items-center gap-3`
- **Actions layout**:
  - `[Badge: N개 선택됨]`
  - `Divider (w-px h-4 bg-white/10)`
  - `[정보 일괄 수정] (Pencil)`
  - `[다운로드] (Download)`
  - `[대기열 추가] (ListPlus)`
  - `[삭제] (Trash2, text-red-400)`
  - `[선택 해제] (X, text-neutral-400 hover:text-white)`

---

## 4. Verification & Testing Strategy

1. **Unit & Build Checks**:
   - `pnpm --prefix frontend build` (TypeScript typecheck & bundle build).
   - `pnpm --prefix frontend lint` (ESLint clean).
2. **Interactive Scenarios**:
   - Verify single click, shift+click range selection, and Ctrl+A select-all.
   - Verify batch download triggers all selected files without browser interruption.
   - Verify batch metadata edit only overrides selected fields and leaves unchecked fields untouched.
   - Verify responsive behavior on both desktop and mobile viewports with GlobalPlayer present.
