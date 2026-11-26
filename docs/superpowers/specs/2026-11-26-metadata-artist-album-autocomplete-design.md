# Design: Metadata Artist and Album Autocomplete / Combobox (가수 및 앨범 자동완성 및 직접 입력)

- **Date:** 2026-11-26
- **Status:** Proposed
- **Target Components:**
  - Backend:
    - Repository: `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileRepository.kt`
    - Service: `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileService.kt`
    - Controller: `backend/src/main/kotlin/com/musichub/backend/domain/music/MusicFileController.kt`
  - Frontend:
    - Shared UI (Molecule): `frontend/src/components/molecules/Combobox.tsx`
    - Modals (Organisms): `frontend/src/components/organisms/EditMetadataModal.tsx`, `frontend/src/components/organisms/BatchEditMetadataModal.tsx`
    - API & Query: `frontend/src/api/musicApi.ts`

---

## 1. Overview & Problem Statement

Currently, when users edit metadata for a single track (`EditMetadataModal`) or multiple tracks (`BatchEditMetadataModal`), the **Artist** (아티스트/가수) and **Album** (앨범) fields are standard free-form text input fields (`<Input>`).

Users must manually retype the exact artist and album names repeatedly, which can lead to:
1. Inconsistent capitalization or spelling across tracks (e.g. "IU" vs "iu", "NewJeans" vs "New Jeans").
2. Inconvenience when tagging multiple tracks or single tracks from the same artist/album.
3. Lack of discovery of existing artists and albums in their personal music library.

### Goal
Provide a seamless **Combobox (Select + Direct Input)** experience where users can:
1. **Choose from their library ("내 목록에 있는 것 중 선택")**: View a dropdown list of distinct existing artists and albums from their library, with search filtering and keyboard navigation.
2. **Type directly ("직접 입력")**: Type any custom name freely, without being restricted to existing values.
3. **Smart Correlation**: When an artist is selected or typed, suggest albums associated with that artist first, followed by all other existing albums.

---

## 2. Requirements

### 2.1 Functional Requirements

- **FR-1 (Direct Input & Autocomplete Combobox)**:
  - Users can type any free-form text directly into the Artist and Album inputs.
  - While typing or upon focusing/clicking the dropdown chevron, a floating suggestion dropdown displays distinct matching values from the user's library.
  - Selecting an option updates the input value and closes the dropdown.
  - Free-form text is preserved if no dropdown option is selected.
  - Supports keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).
  - Closes on outside click.

- **FR-2 (Artist-Album Association)**:
  - When an artist is present in the form, the album combobox prioritizes albums by that artist.
  - If no artist is specified or no specific albums match, all unique albums in the user's library are available.

- **FR-3 (Modals Scope)**:
  - Enabled in both `EditMetadataModal` (single track) and `BatchEditMetadataModal` (batch edit).

- **FR-4 (Backend Metadata Suggestions API)**:
  - `GET /api/music-files/metadata-suggestions?artist={artist}`
  - Returns:
    ```json
    {
      "artists": ["IU", "Taeyeon", "NewJeans"],
      "albums": ["Palette", "LILAC", "Modern Times"]
    }
    ```
  - Queries only `ACTIVE` tracks owned by the authenticated user (`user_id = :userId`).
  - Ignores null or blank strings, trims whitespace, deduplicates, and sorts in natural Korean/English alphabetical order.

### 2.2 Non-Functional Requirements
- **Performance**: Suggestions endpoint query runs efficiently on indexed `user_id` and `status` (< 5ms response time).
- **Design System Consistency**: Matches MusicHub's Linear dark UI (`#0f1011`, `border-white/[0.08]`, `focus:border-[#5e6ad2]`, backdrop blur, smooth popover).
- **Component Architecture**: Follows `AGENTS.md` - generic `Combobox` in `molecules/` with zero domain coupling (props in, events out).

---

## 3. Backend Architecture & Changes

### 3.1 Repository (`MusicFileRepository.kt`)
Add distinct query methods:
```kotlin
@Query("""
    SELECT DISTINCT TRIM(m.artist)
    FROM MusicFile m
    WHERE m.user.id = :userId
      AND m.status = :status
      AND m.artist IS NOT NULL
      AND TRIM(m.artist) != ''
    ORDER BY TRIM(m.artist) ASC
""")
fun findDistinctArtistsByUserIdAndStatus(
    userId: Long,
    status: MusicFileStatus = MusicFileStatus.ACTIVE
): List<String>

@Query("""
    SELECT DISTINCT TRIM(m.album)
    FROM MusicFile m
    WHERE m.user.id = :userId
      AND m.status = :status
      AND m.album IS NOT NULL
      AND TRIM(m.album) != ''
    ORDER BY TRIM(m.album) ASC
""")
fun findDistinctAlbumsByUserIdAndStatus(
    userId: Long,
    status: MusicFileStatus = MusicFileStatus.ACTIVE
): List<String>

@Query("""
    SELECT DISTINCT TRIM(m.album)
    FROM MusicFile m
    WHERE m.user.id = :userId
      AND m.status = :status
      AND m.album IS NOT NULL
      AND TRIM(m.album) != ''
      AND LOWER(TRIM(m.artist)) = LOWER(TRIM(:artist))
    ORDER BY TRIM(m.album) ASC
""")
fun findDistinctAlbumsByUserIdAndArtistAndStatus(
    userId: Long,
    artist: String,
    status: MusicFileStatus = MusicFileStatus.ACTIVE
): List<String>
```

### 3.2 Service & DTO (`MusicFileService.kt`)
```kotlin
data class MetadataSuggestionsDto(
    val artists: List<String>,
    val albums: List<String>
)

@Transactional(readOnly = true)
fun getMetadataSuggestions(userId: Long, artist: String?): MetadataSuggestionsDto {
    val artists = musicFileRepository.findDistinctArtistsByUserIdAndStatus(userId)
    val albums = if (!artist.isNullOrBlank()) {
        val artistAlbums = musicFileRepository.findDistinctAlbumsByUserIdAndArtistAndStatus(userId, artist.trim())
        val allAlbums = musicFileRepository.findDistinctAlbumsByUserIdAndStatus(userId)
        // Artist's albums first, then other albums not in artist's list
        val remaining = allAlbums.filter { it !in artistAlbums }
        artistAlbums + remaining
    } else {
        musicFileRepository.findDistinctAlbumsByUserIdAndStatus(userId)
    }
    return MetadataSuggestionsDto(artists = artists, albums = albums)
}
```

### 3.3 Controller (`MusicFileController.kt`)
```kotlin
@GetMapping("/metadata-suggestions")
fun getMetadataSuggestions(
    @AuthenticationPrincipal user: UserPrincipal,
    @RequestParam(required = false) artist: String?
): ResponseEntity<MetadataSuggestionsDto> {
    val suggestions = musicFileService.getMetadataSuggestions(user.id, artist)
    return ResponseEntity.ok(suggestions)
}
```

---

## 4. Frontend Architecture & Changes

### 4.1 Shared UI Component: `components/molecules/Combobox.tsx`
Domain-agnostic component with:
- Props:
  - `value: string`
  - `onChange: (value: string) => void`
  - `options: string[]`
  - `placeholder?: string`
  - `disabled?: boolean`
  - `className?: string`
- Features:
  - Editable input with direct two-way binding.
  - Dropdown button (chevron icon) to toggle full list visibility.
  - Filtered list based on current input text (substring match, case-insensitive).
  - Floating scrollable popover (`z-50`, dark linear theme, `max-h-48`).
  - Active item keyboard highlight and selection (`ArrowUp`, `ArrowDown`, `Enter`).
  - Outside click listener to dismiss.
  - Displays empty state (`"일치하는 항목 없음"`) when no match is found, with option to keep typed text.

### 4.2 API Client & React Query (`api/musicApi.ts`)
```typescript
export interface MetadataSuggestionsDto {
  artists: string[];
  albums: string[];
}

// In musicApi:
async getMetadataSuggestions(artist?: string): Promise<MetadataSuggestionsDto> {
  const response = await apiClient.get<MetadataSuggestionsDto>('/music-files/metadata-suggestions', {
    params: { artist: artist?.trim() || undefined },
  });
  return response.data;
}
```
Query hook:
```typescript
const { data: suggestions } = useQuery({
  queryKey: ['metadata-suggestions', artist],
  queryFn: () => musicApi.getMetadataSuggestions(artist),
  staleTime: 60 * 1000,
});
```

### 4.3 Integration in `EditMetadataModal.tsx` & `BatchEditMetadataModal.tsx`
- Replace plain `<Input>` for artist with `<Combobox value={artist} onChange={setArtist} options={suggestions?.artists || []} ... />`.
- Replace plain `<Input>` for album with `<Combobox value={album} onChange={setAlbum} options={suggestions?.albums || []} ... />`.
- When artist changes, album suggestions automatically adjust to prioritize the artist's albums.

---

## 5. Verification Plan

1. **Backend Tests**:
   - Unit tests in `MusicFileServiceUpdateTest.kt` or new `MusicFileServiceSuggestionsTest.kt`:
     - Test suggestions return distinct artists and albums.
     - Test suggestions with `artist` query parameter prioritizes artist's albums.
     - Test blank/null artist handled safely.
   - Run `./gradlew test`.
2. **Frontend Build & Tests**:
   - Run `npm run build` (`tsc -b && vite build`) and `npm run lint`.
3. **Manual / End-to-End Verification**:
   - Open single track edit modal:
     - Verify existing library artists appear in dropdown.
     - Verify selecting an artist updates input and prioritizes their albums in album dropdown.
     - Verify custom text can be typed and saved directly.
   - Open batch edit modal:
     - Verify combobox works with the checkbox enable/disable toggles.
     - Verify selected artist/album can be batch-applied.
