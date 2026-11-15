# Music Hub Frontend MVP Implementation Plan

- **Date:** 2026-11-15
- **Spec:** [docs/superpowers/specs/2026-11-15-frontend-mvp-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-15-frontend-mvp-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: Shared UI (`atoms`, `molecules`, `organisms`, `templates`) vs Screen Tree (`pages/<domain>/<screen>/`). Strict one-way dependency.
   - `docs/frontend-verification-guide.md`: Mandatory braces on control statements (`curly: ['error', 'all']`), Prettier rules (`printWidth: 100`, `singleQuote: true`, `semi: true`, `trailingComma: "all"`, `arrowParens: "always"`, `endOfLine: "lf"`).
   - Git: Work on branch `feat/frontend-mvp` cut from `dev`. Commit format: `type: subject`.
2. **Environment Handling**:
   - Node v26+ on Windows. Run npm / pnpm through shell executable paths or direct execution.
   - Vite dev server runs on port 5173 (which is already configured in backend `application.yml` CORS `musichub.cors.allowed-origins`).
   - Reverse proxy / API baseURL: `http://localhost:8080`.

---

## 2. Step-by-Step Milestones

### Milestone 1: Client Scaffold & Code Verification Config
- [x] Initialize `client/` directory with Vite (`react-ts` template).
- [x] Install dependencies:
  - Runtime: `react`, `react-dom`, `@tanstack/react-query`, `zustand`, `axios`, `lucide-react`, `@react-oauth/google`.
  - Styling: `tailwindcss`, `@tailwindcss/vite`.
  - Dev/Lint: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`.
- [x] Configure `client/eslint.config.js` with `curly: ['error', 'all']` and React rules.
- [x] Configure `client/.prettierrc` according to `docs/frontend-verification-guide.md`.
- [x] Configure `client/vite.config.ts` (API proxy to `http://localhost:8080`).
- [x] Verify `pnpm lint` and `pnpm format:check` pass cleanly.

### Milestone 2: Types, Utilities, & API Layer
- [x] Define types:
  - `src/types/auth.ts`: `UserDto`, `AuthResponse`, `GoogleLoginRequest`.
  - `src/types/music.ts`: `MusicFileDto`, `DirectUploadInitRequest`, `UploadInitResult`, `DirectUploadCompleteRequest`, `PlayUrlResult`, `Page<T>`.
- [x] Utilities:
  - `src/utils/formatTime.ts`: Convert milliseconds/seconds to `mm:ss` format.
  - `src/utils/formatBytes.ts`: Convert byte numbers to human-readable format (`B`, `KB`, `MB`, `GB`).
- [x] API Client & Interceptors:
  - `src/api/client.ts`: Axios instance with `baseURL: '/api'`, `withCredentials: true`.
  - Request interceptor: Attach `Authorization: Bearer <token>` from in-memory `authStore`.
  - Response interceptor: On 401 error, call `/api/auth/refresh` once, retry original requests on success; trigger logout on failure.
  - `src/api/authApi.ts`: `loginWithGoogle`, `refresh`, `logout`.
  - `src/api/musicApi.ts`: `initDirectUpload`, `completeDirectUpload`, `uploadViaProxy`, `listMusicFiles`, `getPlayUrl`, `getArtworkUrl`, `deleteMusicFile`.

### Milestone 3: Global Stores (Auth & Audio Player Engine)
- [x] `src/stores/authStore.ts`:
  - In-memory `accessToken`, `user` object, `isAuthenticated`, `isLoading`.
  - Actions: `setAuth`, `clearAuth`, `checkAuthSession` (initial silent refresh on mount).
- [x] `src/stores/playerStore.ts`:
  - State: `currentTrack` (MusicFileDto), `streamUrl`, `queue`, `queueIndex`, `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `repeatMode` ('OFF' | 'ALL' | 'ONE'), `isShuffle`.
  - Actions: `playTrack`, `togglePlay`, `seekTo`, `setVolume`, `toggleMute`, `toggleRepeat`, `toggleShuffle`, `playNext`, `playPrev`, `addToQueue`, `removeFromQueue`, `clearQueue`.
- [x] Audio Engine Synchronization:
  - Connect native HTML5 `Audio` element events (`timeupdate`, `loadedmetadata`, `ended`, `error`) with `playerStore`.

### Milestone 4: Shared UI Vocabulary (Atoms, Molecules, Organisms, Templates)
- [x] **Atoms**:
  - `Button.tsx`: Variants (`primary`, `secondary`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), disabled and loading spinner states.
  - `Input.tsx`: Styled text input with focus ring.
  - `Slider.tsx`: Interactive range slider for seek bar and volume control.
  - `Spinner.tsx`: Animated SVG spinner.
  - `Badge.tsx`: Visual tag for genres, audio formats, status.
  - `ProgressBar.tsx`: Determinate progress bar (0~100%) for uploads and quota.
- [x] **Molecules**:
  - `SearchInput.tsx`: Search box with clear button and magnifying glass icon.
  - `Dropzone.tsx`: Drag & drop target with hover state and file type filtering.
  - `VolumeSlider.tsx`: Volume icon (mute toggle) + Slider.
  - `EmptyState.tsx`: Friendly illustration and action button when library is empty.
- [x] **Organisms**:
  - `Modal.tsx`: Accessible backdrop and modal window with close button and Esc trigger.
  - `ConfirmDialog.tsx`: Confirmation pop-up for destructive operations (e.g. track delete).
  - `QuotaIndicator.tsx`: Storage usage gauge showing bytes used vs 2.0 GB quota with color-coded safety margins.
- [x] **Templates**:
  - `AppLayout.tsx`:
    - Header: Music Hub logo, quota indicator, user avatar & name, upload trigger, logout button.
    - Main container: Scrollable content area.
    - Sticky Footer: `GlobalPlayer` fixed at the bottom.

### Milestone 5: Domain Pages & Features
- [x] **Auth Domain (`pages/auth/`)**:
  - `LoginPage.tsx`: Welcome splash banner, Google Sign-in button (`@react-oauth/google`), and local development bypass switch.
- [x] **Library Domain (`pages/library/`)**:
  - `LibraryPage.tsx`: Header actions (search, upload button), track count, track list table.
  - `pages/library/track/TrackTable.tsx`: Table layout with column headers (Index, Title/Artist, Album, Duration, Size, Actions).
  - `pages/library/track/TrackRow.tsx`: Individual row with hover play button, artwork preview, double-click to play, action dropdown.
  - `pages/library/track/TrackArtwork.tsx`: Artwork thumbnail with fallback audio icon.
  - `pages/library/upload/UploadModal.tsx`: Multi-file drag-and-drop modal with individual file upload progress, R2 Presigned PUT direct transfer, and fallback proxy support.
- [x] **Player Domain (`pages/player/`)**:
  - `GlobalPlayer.tsx`: Bottom player dock.
  - `PlayerControls.tsx`: Shuffle, Prev, Play/Pause, Next, Repeat buttons.
  - `PlayerSeekBar.tsx`: Time display (`01:23 / 03:45`) and scrubbable slider.
  - `PlayerQueueDrawer.tsx`: Flyout drawer showing active queue with drag-free reordering or track removal.

### Milestone 6: Verification & Final Polish
- [x] Code style verification:
  - Run `pnpm lint` (ensure all control structures have `{}` braces and no body on condition line).
  - Run `pnpm format:check` (verify Prettier conformity).
- [x] TypeScript and bundle build:
  - Run `pnpm build` (verify zero TS/bundle errors).
- [x] End-to-end integration manual test review against local backend endpoints.

---

## 3. Verification Criteria & Deliverables

| Deliverable | Criteria | Status |
|---|---|---|
| Design Doc | `docs/superpowers/specs/2026-11-15-frontend-mvp-design.md` complete | Verified |
| Plan Doc | `docs/superpowers/plans/2026-11-15-frontend-mvp.md` complete | Verified |
| Source Tree | `client/` containing atomic design UI + domain pages | Verified |
| Verification | `pnpm lint`, `pnpm format:check`, `pnpm build` exit code 0 | Verified |
| Git Commits | Committed to `feat/frontend-mvp` with `type: subject` message | Verified |
