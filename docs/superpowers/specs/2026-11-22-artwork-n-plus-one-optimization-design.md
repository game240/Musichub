# Design: Artwork N+1 API Elimination and Image Lazy Loading

- **Date:** 2026-11-22
- **Status:** Approved
- **Target Components:** 
  - Backend: `MusicFileController.kt`, `MusicFileService.kt`, `PlaybackService.kt`
  - Frontend: `TrackArtwork.tsx`, `TrackRow.tsx`, `GlobalPlayer.tsx`, `types/music.ts`

---

## 1. Overview & Problem Statement

When a user visits the library page, the frontend fetches the track list (`GET /api/music-files?page=0&size=100`).
Currently, `MusicFileDto` only returns `hasArtwork: Boolean` without an artwork URL:
```kotlin
data class MusicFileDto(
    val id: Long,
    ...
    val hasArtwork: Boolean,
    ...
)
```
Consequently, for each track displayed in `TrackTable`, `TrackArtwork` mounts and initiates a separate HTTP request to fetch its presigned artwork URL:
```typescript
useEffect(() => {
  if (hasArtwork) {
    musicApi.getArtworkUrl(trackId).then(...)
  }
}, [trackId, hasArtwork]);
```

### The Bottleneck
1. **Browser Connection Starvation:**
   Browsers enforce a maximum of 6 concurrent HTTP/1.1 connections per host. If a user has 50 tracks with album covers, **50 separate `GET /api/music-files/{id}/artwork` requests** are fired at once.
2. **Audio Playback Blocked:**
   When the user attempts to play a song immediately after entering, the playback request (`GET /api/music-files/{id}/play`) is queued behind all 50 artwork requests in the browser's network waterfall (stalled for seconds).
3. **Database & Server Thread Pressure:**
   Spring Boot and HikariCP connection pool (default size 10) must handle 50 concurrent DB reads just to create signed URLs, creating database queue contention.

---

## 2. Requirements

### 2.1 Functional Requirements
- **FR-1**: The backend music file list API (`GET /api/music-files`) and playback state API (`GET /api/users/me/playback`) must return the presigned artwork URL directly in `MusicFileDto.artworkUrl` when artwork exists.
- **FR-2**: Generating presigned URLs in the backend is performed using AWS S3Presigner HMAC in-memory computation (zero network I/O, < 0.05ms per item).
- **FR-3**: In the frontend, `TrackArtwork` must prioritize `props.artworkUrl` if available, bypassing `musicApi.getArtworkUrl(trackId)` entirely.
- **FR-4**: `<img />` tags in `TrackArtwork` must include `loading="lazy"` to instruct modern browsers to only download image binaries for items close to the viewport.
- **FR-5**: Backward compatibility: `GET /api/music-files/{id}/artwork` endpoint is retained; if `artworkUrl` is not provided in props and `hasArtwork` is true, fallback to the existing individual fetch.

---

## 3. Technical Design

### 3.1 Backend Changes

#### 3.1.1 Update `MusicFileDto`
In `MusicFileController.kt`:
```kotlin
data class MusicFileDto(
    val id: Long,
    val fileName: String,
    val title: String?,
    val artist: String?,
    val album: String?,
    val year: Int?,
    val genre: String?,
    val trackNumber: Int?,
    val durationMs: Long?,
    val fileSize: Long,
    val hasArtwork: Boolean,
    val artworkUrl: String? = null,
    val lyrics: String?,
    val playCount: Int,
    val lastPlayedAt: Instant?,
    val tagSyncStatus: String,
    val createdAt: Instant
) {
    companion object {
        fun from(entity: MusicFile, artworkUrl: String? = null): MusicFileDto = MusicFileDto(
            id = entity.id,
            fileName = entity.fileName,
            title = entity.title,
            artist = entity.artist,
            album = entity.album,
            year = entity.year,
            genre = entity.genre,
            trackNumber = entity.trackNumber,
            durationMs = entity.durationMs,
            fileSize = entity.fileSize,
            hasArtwork = entity.artworkStorageKey != null,
            artworkUrl = artworkUrl,
            lyrics = entity.lyrics,
            playCount = entity.playCount,
            lastPlayedAt = entity.lastPlayedAt,
            tagSyncStatus = entity.tagSyncStatus.name,
            createdAt = entity.createdAt
        )
    }
}
```

#### 3.1.2 Helper Method in `MusicFileService.kt`
Add a conversion method:
```kotlin
fun toDto(musicFile: MusicFile): MusicFileDto {
    val artworkUrl = musicFile.artworkStorageKey?.let { storageService.generatePresignedGetUrl(it) }
    return MusicFileDto.from(musicFile, artworkUrl)
}
```
Update controller methods (`listMusicFiles`, `completeDirectUpload`, `uploadViaProxy`, `updateMetadata`) to use `musicFileService.toDto(entity)`.

#### 3.1.3 Update `PlaybackService.kt`
Inject `StorageService` into `PlaybackService`:
```kotlin
@Service
class PlaybackService(
    private val playbackStateRepository: PlaybackStateRepository,
    private val musicFileRepository: MusicFileRepository,
    private val storageService: StorageService,
)
```
Convert `MusicFile` to `MusicFileDto` using presigned artwork URL:
```kotlin
private fun toDto(entity: MusicFile): MusicFileDto {
    val artworkUrl = entity.artworkStorageKey?.let { storageService.generatePresignedGetUrl(it) }
    return MusicFileDto.from(entity, artworkUrl)
}
```

---

### 3.2 Frontend Changes

#### 3.2.1 Update `MusicFileDto` Type
In `frontend/src/types/music.ts`:
```typescript
export interface MusicFileDto {
  id: number;
  fileName: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
  trackNumber: number | null;
  durationMs: number | null;
  fileSize: number;
  hasArtwork: boolean;
  artworkUrl?: string | null;
  lyrics: string | null;
  playCount: number;
  lastPlayedAt: string | null;
  tagSyncStatus: TagSyncStatus;
  createdAt: string;
}
```

#### 3.2.2 Update `TrackArtwork.tsx`
Add `artworkUrl?: string | null` to `TrackArtworkProps`.
```typescript
export interface TrackArtworkProps {
  trackId: number;
  hasArtwork: boolean;
  artworkUrl?: string | null;
  title: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}
```
If `props.artworkUrl` is present:
- Use it immediately in state/render.
- Skip calling `musicApi.getArtworkUrl(trackId)`.
Add `loading="lazy"` on the `<img />` tag.

#### 3.2.3 Update Callers
- `TrackRow.tsx`: Pass `artworkUrl={track.artworkUrl}` to `<TrackArtwork>`.
- `GlobalPlayer.tsx`: Pass `artworkUrl={currentTrack.artworkUrl}` to `<TrackArtwork>`.

---

## 4. Performance Impact

1. **API Calls Reduced:** From $O(N)$ HTTP requests (where $N$ is count of tracks with artwork) to **0 extra HTTP requests**.
2. **Network Headroom:** The browser connection pool remains 100% idle and available for instant playback upon user click.
3. **Bandwidth Optimization:** Off-screen album images will not be requested until the user scrolls, preventing image downloads from competing with audio streaming.
