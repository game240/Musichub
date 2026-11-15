# Music Hub Frontend MVP Design Specification

- **Date:** 2026-11-15
- **Status:** Proposed (Awaiting Review)
- **Target:** Music Hub Personal Cloud Music Locker (Phase 1 MVP)

---

## 1. Overview & Objectives

Music Hub is a personal cloud music locker service that allows users to upload their personal audio files directly to Cloudflare R2 and stream them seamlessly with 0 egress cost.

This document specifies the architecture, user experience, screen layout, and technical implementation of the **Frontend Web Client** (`client/`).

### Key Objectives
1. **Google OIDC Authentication**: Lightweight identity verification with JWT stored in memory and automated Refresh Token rotation.
2. **Direct-to-R2 Upload**: Drag-and-drop audio file upload using Presigned PUT URLs directly to Cloudflare R2, with automatic metadata indexing fallback to backend proxy upload.
3. **Seamless Streaming Audio Player**: Persistent global player supporting HTTP Range Request seeking, volume control, queue management, and playlist navigation.
4. **Library Management**: Responsive track listing with search, sorting, artwork thumbnails, metadata display, and file deletion.
5. **Storage Quota Visibility**: Real-time display of user quota usage (out of 2.0 GB allocation) to ensure safety within free tier boundaries.
6. **Strict Architecture & Code Standards**: Full adherence to `AGENTS.md` (Atomic Design separated from domain pages, one screen = one folder) and `docs/frontend-verification-guide.md` (mandatory braces, ESLint/Prettier discipline).

---

## 2. Technical Stack & Dependencies

| Layer | Technology | Purpose |
|---|---|---|
| **Build & Tooling** | Vite, TypeScript (ES2022+), pnpm / npm | Fast development, strict type checking |
| **Framework & Routing** | React 18 / 19, TanStack Router (or React Router v6) | Modern declarative component model and SPA routing |
| **Server State & Cache**| TanStack Query v5 | Data fetching, optimistic updates, and cache invalidation |
| **Client State** | Zustand | Lightweight store for auth and audio player engine |
| **Styling & Design** | Tailwind CSS + CSS Design Tokens (StyleSeed compatible) | Scalable, responsive utility styling with domain-agnostic UI tokens |
| **Icons** | Lucide React | Clean, consistent SVG icons |
| **HTTP Client** | Axios | Custom interceptors for JWT injection and 401 refresh token rotation |
| **Audio Playback** | Native HTML5 `Audio` API / Custom Audio Controller | Native support for HTTP 206 Partial Content range requests via Presigned URLs |
| **Lint & Formatting** | ESLint (`curly: ['error', 'all']`), Prettier | Guaranteed code consistency per `docs/frontend-verification-guide.md` |

---

## 3. Architecture & Directory Structure

In compliance with `AGENTS.md`, the frontend components are strictly split into **Shared UI Vocabulary** and **Domain Screen Tree**:

```text
client/
├── public/
├── src/
│   ├── assets/
│   ├── api/                     # API client, endpoints, and Axios interceptors
│   │   ├── client.ts            # Base Axios instance with auth & refresh logic
│   │   ├── authApi.ts           # /api/auth endpoints
│   │   └── musicApi.ts          # /api/music-files endpoints
│   ├── components/
│   │   ├── atoms/               # Domain-agnostic primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── molecules/           # Domain-agnostic simple compositions
│   │   │   ├── SearchInput.tsx
│   │   │   ├── Dropzone.tsx
│   │   │   ├── VolumeSlider.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── organisms/           # Domain-agnostic composite structures
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Toast.tsx
│   │   ├── templates/           # Layout scaffolds
│   │   │   └── AppLayout.tsx    # Header, main content area, sticky bottom player
│   │   └── pages/               # Domain screen tree
│   │       ├── auth/
│   │       │   └── LoginPage.tsx
│   │       ├── library/
│   │       │   ├── LibraryPage.tsx
│   │       │   ├── upload/
│   │       │   │   ├── UploadModal.tsx
│   │       │   │   └── UploadQueueItem.tsx
│   │       │   └── track/
│   │       │       ├── TrackTable.tsx
│   │       │       ├── TrackRow.tsx
│   │       │       └── TrackArtwork.tsx
│   │       └── player/
│   │           ├── GlobalPlayer.tsx
│   │           ├── PlayerControls.tsx
│   │           ├── PlayerSeekBar.tsx
│   │           └── queue/
│   │               └── PlayerQueueDrawer.tsx
│   ├── hooks/                   # Custom hooks
│   │   ├── useAudioPlayer.ts
│   │   └── useDebounce.ts
│   ├── stores/                  # Zustand global stores
│   │   ├── authStore.ts         # User, token, isAuthenticated
│   │   └── playerStore.ts       # Track queue, playback state, volume, seek
│   ├── types/                   # TypeScript interfaces and API DTOs
│   │   ├── auth.ts
│   │   └── music.ts
│   ├── utils/                   # Shared pure utilities (time formatting, byte formatting)
│   │   ├── formatTime.ts
│   │   └── formatBytes.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── eslint.config.js
├── .prettierrc
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### Dependency Rules:
- `pages/<domain>/*` -> `organisms` -> `molecules` -> `atoms` (strictly one-way).
- Shared components in `atoms/`, `molecules/`, `organisms/`, `templates/` NEVER import anything from `pages/`.
- Screen-private subcomponents stay inside their screen folder (e.g. `pages/library/upload/`).

---

## 4. Key Workflows & Features

### 4.1 Authentication & Token Lifecycle
1. **Google OIDC Login**:
   - The user clicks "Sign in with Google" (Google Identity Services / OAuth credential response).
   - Client sends `idToken` to `POST /api/auth/google`.
   - Backend sets `refresh_token` httpOnly cookie and returns `{ accessToken, expiresIn, user }`.
   - Client stores `accessToken` and `user` strictly in JavaScript memory (`authStore`).
2. **Silent Refresh & Interceptor**:
   - On app bootstrap or 401 response, Axios interceptor calls `POST /api/auth/refresh` with credentials.
   - If refresh succeeds, the pending request is retried with the new token.
   - If refresh fails or token is revoked, user is transitioned to `LoginPage`.
3. **Logout**:
   - Client calls `POST /api/auth/logout`, backend clears cookie, client resets local state.

### 4.2 Local Audio Upload Workflow
1. User clicks "Upload" or drags audio files (`.mp3`, `.flac`, `.m4a`, `.wav`) onto the dropzone.
2. For each file in the queue:
   - Call `POST /api/music-files/upload/init` with `{ fileName, mimeType, fileSize }`.
   - Backend checks user quota (max 2.0 GB, system 9.5 GB) and returns `{ uploadUrl, storageKey }`.
   - Client initiates direct `PUT` to `{uploadUrl}` with file binary and tracks upload progress (`onUploadProgress`).
   - Upon 200 OK from R2, client calls `POST /api/music-files/upload/complete` with `{ storageKey, fileName }`.
   - Backend extracts ID3/Vorbis tags and artwork, saves `MusicFile`, and returns `MusicFileDto`.
   - If direct upload fails due to network or CORS, client offers automatic fallback to `POST /api/music-files/upload` (backend multipart proxy).
3. TanStack Query cache `['music-files']` and `['user-quota']` automatically invalidate and refresh.

### 4.3 Streaming Audio Playback
1. User clicks Play on a track in the library or queue.
2. Player store sets `currentTrack` and requests `GET /api/music-files/{id}/play` to receive `{ streamUrl, mimeType, durationMs }`.
3. HTML5 Audio element loads `streamUrl` (Cloudflare R2 Presigned GET URL with 1-hour expiration).
4. Range Request streaming:
   - Audio begins playing immediately as initial chunks are received (HTTP 206 Partial Content).
   - User scrubbing / seeking issues Range requests to the exact byte offset without re-downloading the entire file.
5. Controls & Features:
   - Play/Pause, Seek (with buffered indicator), Volume with mute toggle.
   - Repeat modes: None (`OFF`), All (`ALL`), Single track (`ONE`).
   - Shuffle toggle: Randomizes next track selection.
   - Queue drawer: Reorderable list of upcoming tracks.

### 4.4 Library View & Management
- Search filter: Real-time debounced filtering by title, artist, or album.
- Track columns:
  - Play button / Track index
  - Artwork thumbnail (falls back to default musical note icon)
  - Title and Artist
  - Album name
  - Duration (formatted `mm:ss`)
  - File Size (formatted in MB)
  - Action menu: Play next, Add to queue, Delete.
- Delete track:
  - Displays confirmation dialog.
  - Calls `DELETE /api/music-files/{id}`.
  - Automatically updates list and quota indicator.

---

## 5. UI / UX Design & Styling Specification (StyleSeed Aligned)

- **Theme Palette**:
  - Background: Dark slate/neutral `#0f172a` (zinc/slate-900) for a modern, music-focused immersive aesthetic.
  - Surface / Cards: `#1e293b` (slate-800) with subtle borders `#334155` (slate-700).
  - Primary Accent: Modern Indigo / Violet `#6366f1` / `#8b5cf6` for active states, play button, and progress bars.
  - Secondary Accent: Emerald `#10b981` for storage quota safe range, Amber `#f59e0b` for warnings (>80%), Rose `#f43f5e` for deletion and quota critical (>95%).
  - Text: High contrast `#f8fafc` (primary), `#94a3b8` (secondary/muted).
- **Responsiveness**:
  - Desktop (>1024px): Full sidebar/header, wide table with all columns, expanded bottom player.
  - Tablet/Mobile (<768px): Compact track row, sticky bottom player with compact controls and bottom navigation.

---

## 6. Code Quality & Verification Rules

Strict conformance to `docs/frontend-verification-guide.md`:
1. **Mandatory Braces**: Every `if`, `else`, `for`, `while`, `try`, `catch` must have braces `{ }` and the body on its own line.
2. **ESLint**: `curly: ['error', 'all']` configured in `eslint.config.js`.
3. **Prettier**:
   - `printWidth: 100`
   - `singleQuote: true`
   - `semi: true`
   - `trailingComma: "all"`
   - `arrowParens: "always"`
   - `endOfLine: "lf"`
4. **Verification Commands**:
   - `pnpm lint` (or `npm run lint`) -> Must exit 0.
   - `pnpm format:check` (or `npm run format:check`) -> Must exit 0.
   - `pnpm build` (or `npm run build`) -> Must build without TypeScript or bundling errors.
