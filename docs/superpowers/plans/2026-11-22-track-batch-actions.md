# Track Batch Actions Implementation Plan (Multi-Select, Batch Download & Batch Edit)

- **Date:** 2026-11-22
- **Spec:** [docs/superpowers/specs/2026-11-22-track-batch-actions-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-22-track-batch-actions-design.md)
- **Status:** In Progress
- **Priority:** Batch Download (Phase 2) prioritized immediately after Selection Mode (Phase 1).

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Feature branch: `feat/track-batch-actions` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: implement track selection and batch download`).
   - One screen = one folder; shared UI in `atoms/` and `molecules/`.
   - Verification with `pnpm --prefix frontend build` and `pnpm --prefix frontend lint`.

2. **Phase Breakdown**:
   - **Phase 1: Multi-Select Mode & Shared UI Infrastructure**
     - Shared atom: `Checkbox.tsx` (indeterminate support, custom sleek dark theme).
     - Selection state in `LibraryPage.tsx` (`selectedTrackIds: Set<number>`, `isSelectionMode`).
     - Shift+Click range selection and Master Checkbox in `TrackTable.tsx` / `TrackRow.tsx`.
     - Floating Action Bar container: `BatchActionBar.tsx`.
   - **Phase 2: Batch Download & Quick Batch Actions (Top Priority)**
     - Sequential batch downloader utility `utils/downloadBatch.ts` (with stagger delay to bypass browser popup blockers).
     - Wire up "일괄 다운로드" button in `BatchActionBar` with real-time download progress feedback (`다운로드 중 (2/5)...`).
     - Wire up "대기열 일괄 추가" (`addTracksToQueue` in `playerStore.ts`).
     - Wire up "일괄 삭제" (`deleteMusicFiles` with `ConfirmDialog` and quota update).
   - **Phase 3: Common Metadata Batch Edit**
     - Create `BatchEditMetadataModal.tsx` in `pages/library/track/`.
     - Field-level overwrite toggle checkboxes for `Artist`, `Album`, `Year`, `Genre`.
     - Batch API integration with `Promise.allSettled` updating metadata + registering background tasks to `useTagSyncStore`.
     - Real-time React Query cache invalidation and player store synchronization.

---

## 2. Step-by-Step Milestones

### Phase 1: Multi-Select Mode & Shared UI Infrastructure

#### Milestone 1.1: Git Branch Preparation
- [ ] Create and checkout feature branch `feat/track-batch-actions` from `dev`.

#### Milestone 1.2: Shared UI Components (`atoms/` & `molecules/`)
- [ ] **Create `frontend/src/components/atoms/Checkbox.tsx`**:
  - Accessible hidden native `<input type="checkbox" />` with custom styled SVG checkmark / minus icon.
  - Supports `checked: boolean`, `indeterminate?: boolean`, `onChange`, `disabled?: boolean`, `size?: 'sm' | 'md'`.
  - Linear dark style: `#0f1011` background, `border-white/20`, checked state `bg-[#5e6ad2] border-[#5e6ad2]`.
- [ ] **Create `frontend/src/components/pages/library/track/BatchActionBar.tsx`**:
  - Floating pill container positioned at `bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-40`.
  - Displays selected count badge (`{count}개 선택됨`).
  - Action slots:
    - `[다운로드]` (Download icon + count/progress)
    - `[대기열 추가]` (ListPlus icon)
    - `[정보 일괄 수정]` (Pencil icon)
    - `[삭제]` (Trash2 icon)
    - `[닫기/선택 해제]` (X icon)
  - Smooth entrance/exit animations (`transition-all duration-200 transform`).

#### Milestone 1.3: Table Selection State & Range Selection Integration
- [ ] **Update `frontend/src/components/pages/library/LibraryPage.tsx`**:
  - Add `selectedTrackIds: Set<number>` and `isSelectionMode: boolean` states.
  - Add `[선택]` toggle button to top action toolbar alongside the search bar.
  - Implement selection helpers: `toggleSelectTrack(id, rangeSelectEvent)`, `toggleSelectAll()`, `clearSelection()`.
  - Add keyboard listener for `Escape` to clear selection and exit selection mode.
  - Add `Ctrl/Cmd + A` handler to select all visible/filtered tracks.
- [ ] **Update `frontend/src/components/pages/library/track/TrackTable.tsx`**:
  - Add master checkbox in table header `#` column.
  - Compute `isAllSelected` and `isIndeterminate` based on `selectedTrackIds` vs `tracks.length`.
  - Pass selection props down to `TrackRow`.
- [ ] **Update `frontend/src/components/pages/library/track/TrackRow.tsx`**:
  - Replace/overlay index number `#` with `Checkbox`:
    - In selection mode: always visible.
    - Outside selection mode: visible on hover.
  - Highlight selected rows (`bg-[#5e6ad2]/10 border-l-2 border-[#5e6ad2]`).
  - Support `Shift + Click` to select ranges between last clicked index and current index.

---

### Phase 2: Batch Download & Quick Batch Actions (Top Priority)

#### Milestone 2.1: Sequential Batch Downloader Utility
- [ ] **Create `frontend/src/utils/downloadBatch.ts`**:
  - Function `downloadTracksBatch(tracks: MusicFileDto[], onProgress: (done: number, total: number) => void)`:
    - Iterates through selected tracks sequentially.
    - Invokes `musicApi.getDownloadUrl(track.id)` to obtain the presigned URL.
    - Triggers `triggerBrowserDownload(downloadUrl, resolvedFileName)`.
    - Inserts a 400ms delay (`new Promise(r => setTimeout(r, 400))`) between files to prevent browser download suppression/popup blocks.
    - Handles errors gracefully without terminating the entire queue.

#### Milestone 2.2: Connect Batch Download in `LibraryPage.tsx`
- [ ] Implement `handleBatchDownload`:
  - Set `isBatchDownloading` loading state and progress counter (`doneCount / totalCount`).
  - Pass state to `BatchActionBar` to render spinner and progress text (`다운로드 중... 2/5`).
  - Clear selection or retain state upon completion based on user preference.

#### Milestone 2.3: Connect Batch Add to Queue & Batch Delete
- [ ] **Player Store Update (`frontend/src/stores/playerStore.ts`)**:
  - Add `addTracksToQueue(tracks: MusicFileDto[])` to append multiple tracks in order to `queue` and sync playback session.
- [ ] **Batch Add to Queue in `LibraryPage.tsx`**:
  - Filter `selectedTrackIds` from current tracks and invoke `addTracksToQueue`.
  - Provide feedback and optionally exit selection mode.
- [ ] **Batch Delete in `LibraryPage.tsx`**:
  - Open `ConfirmDialog` stating `"선택한 {N}개 음원을 보관함에서 영구 삭제하시겠습니까?"`.
  - On confirm, sequentially or concurrently call `musicApi.deleteMusicFile(id)` for all selected IDs.
  - Update user storage quota with the sum of deleted file sizes.
  - Invalidate `music-files` React Query cache and clear selection.

---

### Phase 3: Common Metadata Batch Edit

#### Milestone 3.1: Create `BatchEditMetadataModal.tsx`
- [ ] **Create `frontend/src/components/pages/library/track/BatchEditMetadataModal.tsx`**:
  - Props: `isOpen: boolean`, `onClose: () => void`, `tracks: MusicFileDto[]`, `onSuccess: () => void`.
  - Header: `"선택한 {N}개 음원 정보 일괄 수정"`.
  - Info notice: `"곡 제목 및 트랙 번호는 각 곡의 고유 값이므로 일괄 수정에서 제외됩니다."`
  - Field structure:
    - **Artist**: `applyArtist` checkbox + `Input` (placeholder: "아티스트 일괄 지정")
    - **Album**: `applyAlbum` checkbox + `Input` (placeholder: "앨범명 일괄 지정")
    - **Year**: `applyYear` checkbox + `Input` (placeholder: "발매년도 일괄 지정")
    - **Genre**: `applyGenre` checkbox + `Input` (placeholder: "장르 일괄 지정")
  - Checking the checkbox enables the corresponding input; unchecking disables it and ensures the field is not sent.
  - Validate year as integer or empty.

#### Milestone 3.2: Execution & Tag Sync Dispatch
- [ ] Implement `handleSubmit` in `BatchEditMetadataModal`:
  - Construct payload containing only fields marked with `apply* == true`.
  - Execute parallel updates using `Promise.allSettled(tracks.map(t => musicApi.updateMetadata(t.id, payload)))`.
  - Dispatch background sync tasks to `useTagSyncStore.getState().startSync(t.id, t.title || t.fileName)` for each updated track.
  - Report any partial failures via toast/alert if applicable.
  - Call `onSuccess` to invalidate queries, update current track in `playerStore` if currently playing, and close modal.

---

### Phase 4: Mobile Responsive Optimization & Verification

#### Milestone 4.1: Mobile UI & Viewport Polish
- [ ] Ensure `BatchActionBar` does not overflow narrow screens (360px) by using compact icons and truncated text on mobile.
- [ ] Ensure `Checkbox` has a minimum touch target of 44x44px on touch devices.
- [ ] Test z-index stacking: `AppLayout` (header z-40, main), `GlobalPlayer` (z-50), `BatchActionBar` (z-45), `FloatingTagSyncWidget` (z-45/z-50).

#### Milestone 4.2: Build & Lint Verification
- [ ] Run `pnpm --prefix frontend build` and verify 0 TypeScript errors.
- [ ] Run `pnpm --prefix frontend lint` and verify clean code formatting.
- [ ] Run existing tests if available.
