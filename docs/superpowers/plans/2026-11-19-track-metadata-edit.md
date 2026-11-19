# Track Metadata Edit with R2 Tag Rewriting Implementation Plan

- **Date:** 2026-11-19
- **Spec:** [docs/superpowers/specs/2026-11-19-track-metadata-edit-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-19-track-metadata-edit-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/track-metadata-edit` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: add track metadata edit with r2 tag rewriting`).
2. **Architecture**:
   - Jaudiotagger `MetadataWriter` component in `com.musichub.backend.domain.metadata`.
   - `MusicFileService.updateMetadata`: downloads from R2, rewrites tags, re-uploads to R2, updates PostgreSQL DB.
   - Endpoint: `PATCH /api/music-files/{id}`.
   - Frontend: `EditMetadataModal.tsx` in `pages/library/track/`, edit button in `TrackRow.tsx`, integration in `LibraryPage.tsx`.

---

## 2. Step-by-Step Milestones

### Milestone 1: Backend Audio Tag Writer (`MetadataWriter`)
- [x] Create `MetadataWriter.kt` interface and `JaudiotaggerMetadataWriter.kt` implementation in `com.musichub.backend.domain.metadata`:
  - Support setting/clearing `TITLE`, `ARTIST`, `ALBUM`, `YEAR`, `GENRE`, `TRACK`, `LYRICS`.
  - Fix ID3v2.3 settings for broad compatibility.

### Milestone 2: Backend Service & Controller
- [x] Update `MusicFileService.kt`:
  - Add `updateMetadata(userId: Long, musicFileId: Long, request: UpdateMusicMetadataRequest): MusicFile`.
  - Download from R2, rewrite with `metadataWriter`, re-upload to R2, update `MusicFile` entity.
- [x] Update `MusicFileController.kt`:
  - Add `data class UpdateMusicMetadataRequest(...)`.
  - Add `PATCH /api/music-files/{id}` endpoint.
- [x] Add unit test for service/controller verifying ownership check and R2 interaction.

### Milestone 3: Frontend API & Types
- [x] Update `frontend/src/api/musicApi.ts`:
  - Add `UpdateMusicMetadataDto` interface.
  - Add `updateMetadata(id: number, data: UpdateMusicMetadataDto): Promise<MusicFileDto>`.

### Milestone 4: Frontend UI Components
- [x] Create `frontend/src/components/pages/library/track/EditMetadataModal.tsx`:
  - Linear Dark design with backdrop blur.
  - Pre-filled inputs for Title, Artist, Album, Year, Genre, TrackNumber, and expandable Lyrics.
  - Loading state with spinner during file tag writing.
- [x] Update `frontend/src/components/pages/library/track/TrackRow.tsx`:
  - Add `Pencil` icon button with "정보 수정" tooltip.
  - Prop `onEdit: (track: MusicFileDto) => void`.
- [x] Update `frontend/src/components/pages/library/track/TrackTable.tsx` & `LibraryPage.tsx`:
  - Pass `onEdit` handler to `TrackTable` and `TrackRow`.
  - Manage `editingTrack: MusicFileDto | null` state.
  - On save success, invalidate React Query cache and sync with `playerStore` if current track was edited.

### Milestone 5: Verification & Compilation
- [x] Run backend tests: `./gradlew test`.
- [x] Run frontend build & lint: `npm run build` and `npm run lint`.
- [x] Verify git commit & merge to `dev` using `--no-ff`.
- [ ] Verify git commit & merge to `dev` using `--no-ff`.
