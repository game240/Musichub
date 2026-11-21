# Implementation Plan: Audio Player Seamless Transition & Concurrency Safety

- **Date:** 2026-11-21
- **Spec:** [docs/superpowers/specs/2026-11-21-audio-player-seamless-transition-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-21-audio-player-seamless-transition-design.md)
- **Status:** In Progress
- **Branch:** `feat/playback-queue-sync`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Keep commit messages in `type: subject` format.
   - Verify before claiming completion (build checks and tests).
2. **Scope**:
   - Refactor `frontend/src/stores/playerStore.ts` to implement:
     - Immediate audio pause and state resetting on track selection.
     - Sequence counter to cancel out-of-order stale API responses.
     - Target index and `preserveShuffle` options in `playTrack` to prevent queue resets on `playNext`.
     - `AbortError` filter to prevent erroneous player halts during rapid track navigation.
     - In-memory URL cache for seamless, responsive track playback.
   - Update call sites (`PlayerQueueDrawer.tsx`, `GlobalPlayer.tsx`, etc.) if needed to ensure backwards compatibility.

---

## 2. Step-by-Step Milestones

### Milestone 1: URL Cache & Play Sequence Infrastructure
- [ ] In `frontend/src/stores/playerStore.ts`:
  - Define `playSequenceCounter: number`.
  - Define simple URL cache `streamUrlCache: Map<number, { playUrl: string; durationMs?: number; timestamp: number }>`.
  - Define `PlayTrackOptions` interface supporting `playlist`, `targetIndex`, and `preserveShuffle`.

### Milestone 2: Immediate Audio Stop & Concurrency Safety in `playTrack`
- [ ] Update `playTrack` in `playerStore.ts`:
  - Increment sequence counter `const currentSeq = ++playSequenceCounter;`.
  - Pause `audioElement` and set `currentTime = 0` immediately.
  - Check options: if `preserveShuffle` is true, do NOT re-run Fisher-Yates shuffle or override `newIndex` to 0.
  - If `options.targetIndex` is provided, use it directly instead of `findIndex`.
  - Before modifying `audioElement.src` or state after `musicApi.getPlayUrl`, check `if (currentSeq !== playSequenceCounter) return;`.
  - Guard `audioElement.play()`: catch `AbortError` cleanly without changing state to stopped.

### Milestone 3: Enhance `playNext` and `playPrev`
- [ ] In `playNext`:
  - Pass `{ targetIndex: nextIndex, preserveShuffle: true }` to `playTrack`.
- [ ] In `playPrev`:
  - Pass `{ targetIndex: prevIndex, preserveShuffle: true }` to `playTrack`.
- [ ] In `removeFromQueue` & `clearQueue`:
  - If current track is removed or queue cleared, stop audio cleanly and advance sequence counter.

### Milestone 4: Verification & Build Check
- [ ] Run `pnpm run build` in `frontend` to verify TypeScript compile and bundling.
- [ ] Verify test suite: `./gradlew test` (backend) and frontend build.
