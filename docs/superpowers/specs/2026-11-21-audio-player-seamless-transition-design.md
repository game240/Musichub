# Design: Audio Player Seamless Transition & Concurrency Safety

- **Date:** 2026-11-21
- **Status:** Approved
- **Target Components:** Frontend (`playerStore.ts`, `PlayerQueueDrawer.tsx`, `GlobalPlayer.tsx`)

---

## 1. Background & Problem Statement

Users occasionally experience issues during track transitions:
1. **Previous track continues playing while UI moves to the next track**:
   When moving to the next track, the store UI (`currentTrack`, title, artwork, zeroed seek bar) updates immediately. However, the existing audio element continues playing because `audioElement.pause()` is not called before awaiting `musicApi.getPlayUrl(track.id)`. Furthermore, if multiple skip actions occur in rapid succession, a slower previous `getPlayUrl` response can resolve after a faster newer one, overwriting `audioElement.src` with the previous track's URL (Race Condition).
2. **Playback stops unexpectedly on transition**:
   - Rapid track changes interrupt ongoing `audioElement.play()` calls, throwing a `DOMException: AbortError`. The existing unhandled catch block treats all rejections as fatal errors, setting `isPlaying: false, isLoading: false` and stopping playback.
   - During natural track completion (`ended` event), the delay from asynchronous network fetching (`getPlayUrl`) can break the browser's User Activation Context, causing browser autoplay policies to reject `play()` with `NotAllowedError`.
3. **Queue reshuffling bug in `playNext` under shuffle mode**:
   When `isShuffle` is enabled and `playNext()` triggers `playTrack(nextTrack)`, `playTrack` recalculates `fisherYatesShuffle(others)` and resets `queueIndex` to 0, resetting the user's shuffle queue progress prematurely.

---

## 2. Requirements

### 2.1 Functional Requirements
- **FR-1 (Instant Audio Stop on Track Change)**: When a new track is selected or `playNext`/`playPrev` is called, the current audio playback must pause immediately so the previous audio is never heard while loading the new track.
- **FR-2 (Race Condition / Stale Request Cancellation)**: If a track change is triggered while another track request is in flight, any earlier pending request must be invalidated. Only the latest requested track may modify `audioElement.src` and start playback.
- **FR-3 (Graceful Error & Abort Handling)**:
  - `AbortError` resulting from normal track interruption must not stop playback or trigger error state.
  - Failures in network loading (`getPlayUrl`) or non-abort playback errors must log cleanly, reset loading state, and optionally advance or alert without hanging the player.
- **FR-4 (Preserve Queue Progression in Shuffle)**:
  - Calling `playNext` or `playPrev` under shuffle mode must navigate sequentially through `shuffledQueue` without reshuffling the active queue or resetting `queueIndex` to 0.
  - Explicit track selection from UI (e.g. clicking a song from track list or queue) must only reshuffle the remaining songs if a brand new playlist/context is initiated.

### 2.2 Non-Functional Requirements
- **NFR-1 (Transition Latency)**: Minimal delay between tracks; previous audio ceases in 0ms.
- **NFR-2 (Memory & Lifecycle Safety)**: Event listeners and singleton audio references must not leak or emit redundant events across re-renders.

---

## 3. Architecture & Technical Specification

### 3.1 Play Sequence Counter
A monotonically increasing module-level counter `playSequenceCounter: number`:
```typescript
let playSequenceCounter = 0;
```
When `playTrack(track, options)` is invoked:
1. `const currentSeq = ++playSequenceCounter;`
2. Immediately pause audio and cancel any previous playback:
   ```typescript
   audioElement.pause();
   audioElement.currentTime = 0;
   ```
3. Await `musicApi.getPlayUrl(track.id)`.
4. If `currentSeq !== playSequenceCounter`, discard the response immediately (do not touch `audioElement.src` or state).

### 3.2 Enhanced `playTrack` Signature & Target Index Support
```typescript
interface PlayTrackOptions {
  playlist?: MusicFileDto[];
  targetIndex?: number;
  preserveShuffle?: boolean;
}

playTrack: (track: MusicFileDto, options?: PlayTrackOptions | MusicFileDto[]) => Promise<void>;
```
- When called from `playNext` or `playPrev`:
  - Pass `{ targetIndex: nextIndex, preserveShuffle: true }`.
  - Avoid re-invoking `fisherYatesShuffle` or re-searching via `findIndex`.
- When called from `LibraryPage` (new playlist click):
  - Pass `playlist`, re-generate shuffle queue if `isShuffle` is active.

### 3.3 Safe Play Execution
```typescript
try {
  audioElement.src = playUrl;
  audioElement.currentTime = 0;
  await audioElement.play();
  
  if (currentSeq !== playSequenceCounter) return;
  set({
    streamUrl: playUrl,
    duration: durationMs ? durationMs / 1000 : 0,
    isPlaying: true,
    isLoading: false,
  });
} catch (err: unknown) {
  if (currentSeq !== playSequenceCounter) return;
  if (err instanceof DOMException && err.name === 'AbortError') {
    // Normal interruption by subsequent track change; do not stop player
    return;
  }
  console.error('Playback error:', err);
  set({ isPlaying: false, isLoading: false });
}
```

### 3.4 Pre-caching Stream URLs
Maintain an in-memory short-lived map `urlCache: Map<number, { url: string; durationMs?: number; expiresAt: number }>` with 10-minute TTL to make repeated plays and instant `playNext` transitions fast and bypass redundant API calls.

---

## 4. Verification & Testing

1. **Previous Audio Stopping**: Trigger next track; confirm previous audio cuts off immediately during loading.
2. **Race Condition Prevention**: Rapidly click next track 3-4 times; verify UI matches the final playing audio.
3. **Shuffle Progress**: Enable shuffle, press Next multiple times; verify each track plays without reshuffling queue to 0.
4. **TypeScript Build & Lint**: Validate `pnpm run build` succeeds without type errors.
