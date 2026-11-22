# Design: Media Session API Integration for Background Playback Control

- **Date:** 2026-11-22
- **Status:** Approved
- **Target Components:**
  - Frontend: `frontend/src/stores/playerStore.ts`

---

## 1. Overview & Problem Statement

Currently, when users play music in Musichub, playback control is limited to interacting directly with the on-screen UI buttons in `GlobalPlayer.tsx`.
When the browser tab is minimized, running in the background, or when the user uses physical hardware media controls (keyboard multimedia keys, Bluetooth headphones/earbuds gestures, or OS system overlays such as Windows Media Overlay / macOS Control Center / mobile lockscreen), previous track, next track, and playback control do not respond.

To enable full background and hardware media controls across all supported modern browsers, we integrate the standard **Media Session API (`navigator.mediaSession`)**.

---

## 2. Requirements

### 2.1 Functional Requirements
- **FR-1 (Action Handlers)**: Register action handlers on `navigator.mediaSession`:
  - `'play'`: Resume audio playback via `usePlayerStore.resume()`.
  - `'pause'`: Pause audio playback via `usePlayerStore.pause()`.
  - `'previoustrack'`: Navigate to previous track via `usePlayerStore.playPrev()`.
  - `'nexttrack'`: Navigate to next track via `usePlayerStore.playNext()`.
  - `'seekto'`: Seek audio position to `details.seekTime` via `usePlayerStore.seekTo()`.
  - `'seekbackward'`: Seek backward by `details.seekOffset || 10` seconds.
  - `'seekforward'`: Seek forward by `details.seekOffset || 10` seconds.
  - `'stop'`: Stop/pause playback.
- **FR-2 (Metadata Synchronization)**:
  - When `currentTrack` changes or track metadata is updated, set `navigator.mediaSession.metadata` using `MediaMetadata` with `title`, `artist`, `album`, and `artwork`.
  - Provide fallback artwork (`/logo.png`) when track has no artwork.
  - If `track.hasArtwork` is true but `track.artworkUrl` is not present, asynchronously fetch artwork URL and update metadata.
  - When queue is cleared or current track is removed, reset `navigator.mediaSession.metadata = null` and `playbackState = 'none'`.
- **FR-3 (Playback & Position State Synchronization)**:
  - Synchronize `navigator.mediaSession.playbackState` (`'playing'` vs `'paused'`).
  - Call `navigator.mediaSession.setPositionState()` on `loadedmetadata`, `play`, `pause`, `seeked`, and `seekTo` to synchronize duration, position, and playbackRate with the OS controller.

### 2.2 Non-Functional Requirements
- **NFR-1 (Browser Compatibility & Safety)**: Guard all calls with `'mediaSession' in navigator` to prevent runtime errors in unsupported or SSR environments.
- **NFR-2 (Error Resilience)**: Wrap `setPositionState` and optional action handler registrations in try-catch blocks to prevent uncaught DOM exceptions during rapid track switching or seek bounds edge cases.

---

## 3. Technical Design

### 3.1 Media Session Helper Functions in `playerStore.ts`

```typescript
const syncMediaSessionMetadata = (
  track: MusicFileDto | null,
  getCurrentTrackId?: () => number | undefined,
) => {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  if (!track) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    return;
  }

  const buildArtwork = (url?: string | null): MediaImage[] => {
    if (url) {
      return [
        { src: url, sizes: '96x96' },
        { src: url, sizes: '128x128' },
        { src: url, sizes: '192x192' },
        { src: url, sizes: '256x256' },
        { src: url, sizes: '384x384' },
        { src: url, sizes: '512x512' },
      ];
    }
    return [{ src: '/logo.png', sizes: '512x512', type: 'image/png' }];
  };

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || track.fileName,
    artist: track.artist || '알 수 없는 아티스트',
    album: track.album || '',
    artwork: buildArtwork(track.artworkUrl),
  });

  if (!track.artworkUrl && track.hasArtwork) {
    musicApi
      .getArtworkUrl(track.id)
      .then((url) => {
        if (url && (!getCurrentTrackId || getCurrentTrackId() === track.id)) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || track.fileName,
            artist: track.artist || '알 수 없는 아티스트',
            album: track.album || '',
            artwork: buildArtwork(url),
          });
        }
      })
      .catch(() => {});
  }
};

const syncMediaSessionPlaybackState = (isPlaying: boolean) => {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
};

const syncMediaSessionPosition = () => {
  if (
    typeof window === 'undefined' ||
    !('mediaSession' in navigator) ||
    !('setPositionState' in navigator.mediaSession)
  ) {
    return;
  }

  const dur = audioElement.duration;
  if (!isNaN(dur) && dur > 0 && isFinite(dur)) {
    try {
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: audioElement.playbackRate || 1,
        position: Math.min(Math.max(0, audioElement.currentTime), dur),
      });
    } catch {
      // Ignore rapid state transition race conditions
    }
  }
};
```

### 3.2 Action Handlers Registration
Inside store creation `create<PlayerState>((set, get) => { ... })`:
Register action handlers using `get()`.
Add audio event listeners for `play`, `pause`, `loadedmetadata`, `seeked` to synchronize playback state and position state.

---

## 4. Verification Plan
- `pnpm --filter frontend exec tsc --noEmit`
- `pnpm --filter frontend run lint`
- `pnpm --filter frontend run build`
