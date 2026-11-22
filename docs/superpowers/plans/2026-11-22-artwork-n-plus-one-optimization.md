# Implementation Plan: Artwork N+1 API Elimination and Image Lazy Loading

- **Date:** 2026-11-22
- **Spec:** [docs/superpowers/specs/2026-11-22-artwork-n-plus-one-optimization-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-22-artwork-n-plus-one-optimization-design.md)
- **Status:** In Progress
- **Target Components:**
  - Backend: `MusicFileController.kt`, `MusicFileService.kt`, `PlaybackService.kt`, `PlaybackServiceTest.kt`
  - Frontend: `types/music.ts`, `TrackArtwork.tsx`, `TrackRow.tsx`, `GlobalPlayer.tsx`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Commit format: `type: subject` (e.g. `perf: eliminate artwork n plus one api calls and add image lazy loading`).
2. **Verification**:
   - Backend unit tests (`./gradlew test`).
   - Frontend TypeScript check (`pnpm exec tsc --noEmit` & `pnpm build`).
   - Network call verification: Ensure no `/api/music-files/*/artwork` calls occur when rendering the library table.

---

## 2. Step-by-Step Milestones

### Milestone 1: Backend Optimization
- [ ] In `MusicFileController.kt`:
  - Add `val artworkUrl: String? = null` to `MusicFileDto`.
  - Update `MusicFileDto.from(entity, artworkUrl = null)`.
- [ ] In `MusicFileService.kt`:
  - Add `toDto(musicFile: MusicFile): MusicFileDto` method that calculates `artworkUrl` if `artworkStorageKey != null`.
  - Update `MusicFileController` to map entities using `toDto`.
- [ ] In `PlaybackService.kt`:
  - Inject `StorageService`.
  - Use `artworkUrl` when mapping `MusicFile` to `MusicFileDto` in `getPlaybackState`.
- [ ] Update `PlaybackServiceTest.kt`:
  - Mock `StorageService` and verify unit tests pass.

### Milestone 2: Frontend Optimization
- [ ] In `frontend/src/types/music.ts`:
  - Add `artworkUrl?: string | null` to `MusicFileDto`.
- [ ] In `frontend/src/components/pages/library/track/TrackArtwork.tsx`:
  - Add `artworkUrl?: string | null` to `TrackArtworkProps`.
  - If `props.artworkUrl` is provided, use it directly and skip `musicApi.getArtworkUrl(trackId)`.
  - Add `loading="lazy"` attribute to `<img />`.
- [ ] In `frontend/src/components/pages/library/track/TrackRow.tsx`:
  - Pass `artworkUrl={track.artworkUrl}` to `<TrackArtwork>`.
- [ ] In `frontend/src/components/pages/player/GlobalPlayer.tsx`:
  - Pass `artworkUrl={currentTrack.artworkUrl}` to `<TrackArtwork>`.

### Milestone 3: Verification
- [ ] Run backend tests: `./gradlew test`
- [ ] Run frontend build / typecheck: `pnpm exec tsc --noEmit` & `pnpm build`
- [ ] Verify git diff.
