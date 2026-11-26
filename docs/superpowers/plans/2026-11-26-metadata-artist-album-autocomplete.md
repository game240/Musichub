# Implementation Plan: Metadata Artist and Album Autocomplete / Combobox

- [x] 1. Git branch setup
  - [x] Cut feature branch `feat/metadata-artist-album-autocomplete` from `dev`
- [x] 2. Backend implementation
  - [x] Add distinct query methods to `MusicFileRepository.kt` (`findDistinctArtistsByUserIdAndStatus`, `findDistinctAlbumsByUserIdAndStatus`, `findDistinctAlbumsByUserIdAndArtistAndStatus`)
  - [x] Add `MetadataSuggestionsDto` and `getMetadataSuggestions` method in `MusicFileService.kt`
  - [x] Add `GET /api/music-files/metadata-suggestions` endpoint in `MusicFileController.kt`
  - [x] Add unit tests in backend (`MusicFileServiceUpdateTest.kt`)
  - [x] Run backend tests (`./gradlew test`)
- [x] 3. Frontend implementation
  - [x] Add `getMetadataSuggestions` API method in `frontend/src/api/musicApi.ts`
  - [x] Create domain-agnostic `Combobox` component in `frontend/src/components/molecules/Combobox.tsx`
  - [x] Integrate `Combobox` and suggestion queries into `EditMetadataModal.tsx`
  - [x] Integrate `Combobox` and suggestion queries into `BatchEditMetadataModal.tsx`
  - [x] Run frontend typecheck, build, and linter (`npm run build`, `npm run lint`)
- [x] 4. Verification & Git completion
  - [x] Verify both modals support direct typing and selecting from user's library
  - [ ] Merge `feat/metadata-artist-album-autocomplete` into `dev` with `--no-ff` (on hold per user instruction)
