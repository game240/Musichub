# Design: Korean Priority Track Sorting (Default Title ASC)

## Overview
Currently, the track listing API (`GET /api/music-files`) defaults to sorting by creation time descending (`createdAt DESC`).
To match standard Korean music streaming services (e.g., Melon, Bugs) and provide a predictable alphabetical library experience, this feature changes the default ordering to **Title Ascending with Korean Priority** (`한국어 우선 title ASC`).

Tracks will be grouped and ordered as follows:
1. **Korean (Hangul)**: Syllables (`가` - `힣`) and Jamo (`ㄱ` - `ㅎ`)
2. **English (Latin)**: `A` - `Z`, `a` - `z` (case-insensitive)
3. **Numbers**: `0` - `9`
4. **Others**: Japanese (Hiragana/Katakana), Hanja/Kanji, symbols, emojis
Within each group, tracks are sorted in ascending order. Secondary sort by `id ASC` ensures deterministic pagination.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1**: Default track list request (`GET /api/music-files`) returns tracks ordered by Title Ascending with Korean Priority.
- **FR-2**: Title fallback: if a track's `title` is `NULL` or empty, use its `fileName`. Leading whitespace is trimmed before evaluating sorting priority.
- **FR-3**: Ordering hierarchy:
  1. Korean (Hangul): `^[가-힣ㄱ-ㅎ]` $\rightarrow$ Priority 1
  2. English (Latin): `^[A-Za-z]` $\rightarrow$ Priority 2
  3. Numbers: `^[0-9]` $\rightarrow$ Priority 3
  4. Others: Priority 4
- **FR-4**: Within the same priority group, tracks are sorted case-insensitively by title ascending (`LOWER(title) ASC`), with `id ASC` as tie-breaker.
- **FR-5**: If a client explicitly requests a different sort property (e.g., `sort=createdAt,desc`), the API respects the requested sort.
- **FR-6**: Frontend API client default sort parameter changes from `createdAt,desc` to `title,asc`.

### 1.2 Non-Functional Requirements
- **NFR-1**: Sub-50ms query execution for typical user libraries.
- **NFR-2**: Deterministic pagination: stable ordering across page boundaries.
- **NFR-3**: Full backward compatibility: does not break existing clients or tests.

---

## 2. Architecture & Database Design

### 2.1 SQL Query (PostgreSQL)
In PostgreSQL, sorting with regex character classification is expressed cleanly via `CASE`:

```sql
SELECT m.*
FROM music_file m
WHERE m.user_id = :userId AND m.status = 'ACTIVE'
ORDER BY
    CASE
        WHEN TRIM(COALESCE(m.title, m.file_name)) ~ '^[가-힣ㄱ-ㅎ]' THEN 1
        WHEN TRIM(COALESCE(m.title, m.file_name)) ~* '^[a-z]' THEN 2
        WHEN TRIM(COALESCE(m.title, m.file_name)) ~ '^[0-9]' THEN 3
        ELSE 4
    END ASC,
    LOWER(TRIM(COALESCE(m.title, m.file_name))) ASC,
    m.id ASC
```

### 2.2 Backend Repository (`MusicFileRepository.kt`)
Add a native query method with pagination support:
```kotlin
@Query(
    value = """
        SELECT * FROM music_file
        WHERE user_id = :userId AND status = 'ACTIVE'
        ORDER BY
            CASE
                WHEN TRIM(COALESCE(title, file_name)) ~ '^[가-힣ㄱ-ㅎ]' THEN 1
                WHEN TRIM(COALESCE(title, file_name)) ~* '^[a-z]' THEN 2
                WHEN TRIM(COALESCE(title, file_name)) ~ '^[0-9]' THEN 3
                ELSE 4
            END ASC,
            LOWER(TRIM(COALESCE(title, file_name))) ASC,
            id ASC
    """,
    countQuery = "SELECT COUNT(*) FROM music_file WHERE user_id = :userId AND status = 'ACTIVE'",
    nativeQuery = true
)
fun findAllByUserIdAndStatusOrderByKoreanPriority(
    userId: Long,
    pageable: Pageable
): Page<MusicFile>
```

### 2.3 Backend Service (`MusicFileService.kt`)
In `listMusicFiles(userId: Long, pageable: Pageable)`:
- Check if sort is unsorted or targets `title`:
  - If so, call `findAllByUserIdAndStatusOrderByKoreanPriority(userId, pageable)`.
  - Otherwise, delegate to standard `findAllByUserIdAndStatus(userId, MusicFileStatus.ACTIVE, pageable)`.

### 2.4 Backend Controller (`MusicFileController.kt`)
Update `@PageableDefault`:
```kotlin
@GetMapping
fun listMusicFiles(
    @AuthenticationPrincipal user: UserPrincipal,
    @PageableDefault(size = 30, sort = ["title"], direction = Sort.Direction.ASC) pageable: Pageable
): ResponseEntity<Page<MusicFileDto>>
```

---

## 3. Frontend Changes

### 3.1 API Client (`frontend/src/api/musicApi.ts`)
Update default `sort` parameter:
```typescript
async listMusicFiles(
  page: number = 0,
  size: number = 50,
  sort: string = 'title,asc',
): Promise<Page<MusicFileDto>>
```

### 3.2 Library Page (`frontend/src/components/pages/library/LibraryPage.tsx`)
Ensure `musicApi.listMusicFiles(0, 100)` uses the updated default or passes `'title,asc'`.

---

## 4. Verification & Testing

1. **Unit / Integration Tests**:
   - Test `MusicFileService`: when listing with default or `title,asc`, verify repository method is called.
   - Verify ordering with mock dataset containing:
     - Korean titles (`가나다`, `사랑`)
     - English titles (`Apple`, `banana`)
     - Numeric titles (`1234`, `007`)
     - Japanese / Other titles (`さくら`, `カタカナ`, `⭐ Star`)
   - Verify expected sequence: Korean $\rightarrow$ English $\rightarrow$ Numbers $\rightarrow$ Japanese/Others.
2. **Frontend Build & Verification**:
   - Verify TypeScript compilation passes without errors (`pnpm run build`).
