# Design: Track Metadata Edit Feature (with R2 Binary Tag Rewriting)

## Overview
Allows authenticated users to view and edit metadata (title, artist, album, year, genre, track number, and lyrics) of their uploaded music files. 

Crucially, **changes are written BOTH to the PostgreSQL database AND directly back into the audio file binary in Cloudflare R2** (using Jaudiotagger to rewrite ID3v2.3 / Vorbis Comment tags). This ensures that if the user downloads the file in the future, the embedded audio tags match the updated metadata.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1**: Users can trigger an edit dialog from the library track row (via an edit icon button).
- **FR-2**: The modal provides form inputs pre-filled with existing metadata:
  - Title (`title`: String)
  - Artist (`artist`: String)
  - Album (`album`: String)
  - Release Year (`year`: Integer, optional)
  - Genre (`genre`: String, optional)
  - Track Number (`trackNumber`: Integer, optional)
  - Lyrics (`lyrics`: Multi-line text, optional)
- **FR-3**: Submitting the form calls `PATCH /api/music-files/{id}`.
- **FR-4**: Only the owner of the track (`userId == principal.id`) can update the metadata.
- **FR-5**: The backend pipeline updates:
  1. The audio file binary in Cloudflare R2 (download $\rightarrow$ rewrite tags via Jaudiotagger $\rightarrow$ re-upload overwrite).
  2. The `music_file` row in the database (columns: `title`, `artist`, `album`, `year`, `genre`, `track_number`, `lyrics`, `file_size`, `updated_at`).
- **FR-6**: On successful update:
  - The modal closes.
  - The library list cache is invalidated and updated.
  - If the edited track is currently playing or in the player queue, player store track information is synchronized.

### 1.2 Non-Functional Requirements
- **NFR-1**: Atomicity & Safety: Tag rewriting is performed on a local temp file first. R2 is only overwritten if tag writing succeeds. Temp files are deleted in a `finally` block.
- **NFR-2**: Supports major audio formats already supported by Jaudiotagger (MP3 ID3v2.3, FLAC Vorbis, M4A/AAC, OGG).
- **NFR-3**: Visual design matches the Linear-inspired dark palette with a clear loading state while file rewriting occurs.

---

## 2. Backend Design

### 2.1 Metadata Writer Component (`MetadataWriter.kt` & `JaudiotaggerMetadataWriter.kt`)
Define an interface under `com.musichub.backend.domain.metadata`:
```kotlin
interface MetadataWriter {
    fun updateTags(
        file: File,
        title: String?,
        artist: String?,
        album: String?,
        year: Int?,
        genre: String?,
        trackNumber: Int?,
        lyrics: String?
    )
}
```
Implementation using `org.jaudiotagger.audio.AudioFileIO`:
- `val audioFile = AudioFileIO.read(file)`
- `val tag = audioFile.tagOrCreateAndSetDefault`
- Use `setOrDeleteField(tag, FieldKey.TITLE, title)` etc.
- Call `AudioFileIO.write(audioFile)` to safely write the header/tags in place.

### 2.2 Endpoint: `PATCH /api/music-files/{id}`
- **Authentication**: Required (`Bearer <access_token>`)
- **Request Body**:
  ```kotlin
  data class UpdateMusicMetadataRequest(
      val title: String?,
      val artist: String?,
      val album: String?,
      val year: Int?,
      val genre: String?,
      val trackNumber: Int?,
      val lyrics: String?
  )
  ```
- **Service Logic (`MusicFileService.updateMetadata`)**:
  1. Verify ownership: `musicFile.userId == user.id`.
  2. Download original file from R2 to a temporary file:
     ```kotlin
     val tempFile = Files.createTempFile("musichub-update-", ".$ext").toFile()
     storageService.getObject(musicFile.storageKey).use { input ->
         tempFile.outputStream().use { out -> input.copyTo(out) }
     }
     ```
  3. Rewrite audio tags using `metadataWriter.updateTags(tempFile, ...)`.
  4. Re-upload modified file to R2 (overwriting existing `storageKey`):
     ```kotlin
     val newSize = tempFile.length()
     tempFile.inputStream().use { input ->
         storageService.upload(musicFile.storageKey, input, newSize, musicFile.mimeType)
     }
     ```
  5. Update `musicFile` entity in DB (`title`, `artist`, `album`, `year`, `genre`, `trackNumber`, `lyrics`, `fileSize = newSize`).
  6. Return `MusicFileDto.from(musicFile)`.
  7. Delete `tempFile` in `finally`.

---

## 3. Frontend Design

### 3.1 API Client (`frontend/src/api/musicApi.ts`)
```typescript
export interface UpdateMetadataDto {
  title?: string;
  artist?: string;
  album?: string;
  year?: number | null;
  genre?: string;
  trackNumber?: number | null;
  lyrics?: string;
}

updateMetadata(id: number, data: UpdateMetadataDto): Promise<MusicFileDto>
```

### 3.2 UI Components
- **`EditMetadataModal.tsx`** (`pages/library/track/EditMetadataModal.tsx`):
  - Form inputs: Title, Artist, Album, Year, Genre, Track Number, and multi-line expandable Lyrics textarea.
  - Loading spinner & disabled inputs during submission with status message: "파일 태그 및 메타데이터를 저장하는 중...".
- **`TrackRow.tsx`**:
  - Add an edit button (`Pencil` icon, "정보 수정" tooltip) next to "재생목록 추가" and "음원 삭제".
- **`LibraryPage.tsx`**:
  - Manages `editingTrack: MusicFileDto | null` state.
  - On update success, triggers toast message and updates React Query cache and player store if applicable.

---

## 4. Verification & Testing

1. **Backend Tests**:
   - `JaudiotaggerMetadataWriterTest`: Write tags to a test MP3 file and re-read via `JaudiotaggerMetadataReader` to ensure title/artist/lyrics round-trip cleanly.
   - `MusicFileServiceTest`: Verify that `updateMetadata` calls storage download, tag writer, storage re-upload, and DB update.
2. **Frontend Tests**:
   - Verify modal opens with current values pre-filled.
   - Verify submit sends request and closes modal on success.
   - Verify `tsc -b && vite build` and `eslint` pass without warnings.
