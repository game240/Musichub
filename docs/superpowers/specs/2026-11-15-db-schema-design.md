# Music Hub Database Schema Optimization & V2 Specification

- **Date:** 2026-11-15
- **Status:** Proposed (Awaiting Review)
- **Target:** Music Hub Personal Cloud Locker (PostgreSQL & Cloudflare R2)

---

## 1. Executive Summary & Design Decisions

This document outlines the database schema optimization and V2 evolution for Music Hub, incorporating core architectural decisions regarding metadata management, index optimization, and domain boundaries.

### 1.1 Explicit Architectural Decisions

1. **Exclusion of Track-level Likes / Favorites (`is_favorite` / `favorite_track`)**:
   - **Decision:** As agreed, track-level "favorites" / "likes" are explicitly excluded from the domain model and schema.
   - **Rationale:** Keeps the domain boundary focused on a pure personal cloud music locker (upload, stream, browse, metadata indexing) without adding unnecessary social or curation tables in the MVP.

2. **Persistence of Metadata in PostgreSQL alongside Audio Files**:
   - **Decision:** Audio metadata (title, artist, album, year, genre, duration, lyrics, artwork key) is extracted upon upload and stored in PostgreSQL, while the original audio file in Cloudflare R2 retains its embedded ID3/Vorbis tags intact.
   - **Rationale & Architectural Foundation:**
     - **Source of Truth vs. Read Index:** The uploaded audio file in R2 remains the permanent Source of Truth. PostgreSQL serves as the high-speed **Read Index & Search Cache**.
     - **Latency & Cloud Egress/API Minimization:** If metadata were read exclusively on-the-fly from R2, loading a 100-track library would require 100 individual Range/GetObject requests over HTTP to Cloudflare R2, introducing multi-second round-trip latency and excessive Class B API calls. A single SQL index scan returns the full library page in < 3ms.
     - **Immutability of Cloud Object Storage:** Cloudflare R2 (S3-compatible) objects are immutable. Modifying an ID3 tag in an audio file requires downloading the entire multi-megabyte binary, re-tagging it, and re-uploading it. Storing metadata in PostgreSQL allows instant tag corrections (`UPDATE music_file SET title = ...`) in 1ms without touching R2 binaries.
     - **Sorting, Filtering, & Pagination:** PostgreSQL B-Tree indexes enable instant `ORDER BY created_at DESC`, text search (`WHERE artist ILIKE ...`), and pagination (`LIMIT 20 OFFSET 40`), which is impossible with direct object storage without full in-memory scans.
     - **Decoupled Artwork Delivery:** Extracting the embedded APIC/JPEG cover image to a separate R2 key (`artwork_storage_key`) allows the web client to load lightweight thumbnails (50-100KB) through browser/CDN caching without downloading multi-megabyte audio tracks.

---

## 2. Schema Delta & Technical Specification

### 2.1 Composite Indexes for Query Acceleration

Currently, `music_file` has two independent single-column indexes:
- `idx_music_file_user_id (user_id)`
- `idx_music_file_status (status)`

The primary operational query in `MusicFileRepository.kt` is:
```kotlin
findAllByUserIdAndStatus(userId: Long, status: MusicFileStatus, pageable: Pageable): Page<MusicFile>
```
Which executes with `ORDER BY created_at DESC`.

#### Index Enhancements:
1. **Primary Track Query Index**:
   ```sql
   CREATE INDEX idx_music_file_user_status_created 
       ON music_file(user_id, status, created_at DESC);
   ```
   Eliminates bitmap index scans and in-memory heap sorting, enabling a single B-Tree range scan for paginated library views.

2. **Index-Only Storage Quota Scan**:
   ```sql
   CREATE INDEX idx_music_file_user_size 
       ON music_file(user_id, file_size);
   ```
   Enables Postgres to execute `SELECT COALESCE(SUM(file_size), 0) FROM music_file WHERE user_id = :userId` purely within the index tree (Index-Only Scan), without touching table heap pages.

---

### 2.2 Domain Column Additions (`music_file`)

To enrich playback capabilities without bloating the domain:

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `lyrics` | `TEXT` | YES | `NULL` | Unsynchronized lyrics (ID3v2 `USLT` tag) parsed via jaudiotagger |
| `play_count` | `INT` | NO | `0` | Cumulative playback counter (incremented on stream complete/progress) |
| `last_played_at` | `TIMESTAMPTZ` | YES | `NULL` | Timestamp of most recent playback |

---

### 2.3 Soft-Delete & Storage Cleanup Lifecycle

To prevent orphan objects in Cloudflare R2 when network or transactional failures occur during deletion:
1. Extend `MusicFileStatus` enum: `ACTIVE`, `PROCESSING`, `ERROR`, `DELETED`.
2. When a user deletes a file:
   - Mark `status = 'DELETED'` within the database transaction.
   - Asynchronously or via transactional listener trigger R2 object deletion (`storageService.delete(storageKey)` and `artworkStorageKey`).
   - If R2 deletion succeeds, the record is safely hard-deleted or purged by a background cleanup job.

---

### 2.4 (Optional / Phase 2) Playlist Entities

For user-curated playlists (deferred to Phase 2, but schema-ready):

```sql
CREATE TABLE playlist (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE playlist_track (
    id              BIGSERIAL PRIMARY KEY,
    playlist_id     BIGINT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
    music_file_id   BIGINT NOT NULL REFERENCES music_file(id) ON DELETE CASCADE,
    track_order     INT NOT NULL,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_playlist_track_order UNIQUE (playlist_id, track_order)
);

CREATE INDEX idx_playlist_user_id ON playlist(user_id);
CREATE INDEX idx_playlist_track_playlist ON playlist_track(playlist_id, track_order);
```

---

## 3. Flyway Migration Plan (V2)

File: `backend/src/main/resources/db/migration/V2__optimize_indexes_and_metadata.sql`

```sql
-- 1. Optimize query indexes on music_file
DROP INDEX IF EXISTS idx_music_file_user_id;
DROP INDEX IF EXISTS idx_music_file_status;

CREATE INDEX idx_music_file_user_status_created 
    ON music_file(user_id, status, created_at DESC);

CREATE INDEX idx_music_file_user_size 
    ON music_file(user_id, file_size);

-- 2. Add domain columns for lyrics and playback stats
ALTER TABLE music_file 
    ADD COLUMN lyrics TEXT,
    ADD COLUMN play_count INT NOT NULL DEFAULT 0,
    ADD COLUMN last_played_at TIMESTAMPTZ;
```

---

## 4. Backend Code Impact Summary

1. **`MusicFile.kt`**:
   - Add `lyrics: String? = null`
   - Add `playCount: Int = 0`
   - Add `lastPlayedAt: Instant? = null`
   - Add `DELETED` to `MusicFileStatus` enum.
2. **`JaudiotaggerMetadataReader.kt`**:
   - Parse `FieldKey.LYRICS` (USLT frame) from ID3/Vorbis tags and map into `AudioMetadata`.
3. **`MusicFileService.kt`**:
   - Save parsed lyrics during `completeDirectUpload` and `uploadViaProxy`.
   - Update `MusicFileDto` to expose `lyrics`, `playCount`, `lastPlayedAt`.
