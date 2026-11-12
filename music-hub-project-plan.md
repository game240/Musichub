# Music Hub 프로젝트 기획서 (R2 기반 개정판)

> **문서 버전:** 0.2 (R2 Edition)\
> **작성일:** 2026-11-12\
> **상태:** Cloudflare R2 저장소 전면 채택 및 아키텍처 간소화 반영\
> **목적:** Google Drive를 완전히 제거하고 Cloudflare R2(무료 플랜: 10GB, 트래픽 0원)를 기본 저장소로 채택하여 불필요한 OAuth 심사 및 권한 복잡도를 제거하고 실용적인 MVP를 구축한다.

---

## 1. 프로젝트 개요

### 1.1 목표
Music Hub는 사용자의 개인 음악 파일을 안전하게 보관하고 웹/모바일에서 끊김 없이 감상할 수 있는 개인 맞춤형 음악 스트리밍 서비스다.

기존 Google Drive 연동 방식의 복잡한 권한 및 심사 문제를 해결하기 위해, S3와 100% 호환되면서 **트래픽(Egress) 비용이 0원**이고 **영구 10GB 무료 저장소**를 제공하는 **Cloudflare R2**를 전용 스토리지로 사용한다.

### 1.2 핵심 방향
- **스토리지**: Cloudflare R2 단독 사용 (AWS S3 SDK 호환).
- **비용 최적화 (0원 플랜)**: R2 무료 티어(10GB 스토리지, Egress 0원, 월 1000만 읽기 요청) 범위 내에서 완전 무료 운영.
- **아키텍처 단순화**: Google Drive OAuth, `drive.file` 권한, Google 앱 검수(Verification/CASA), 동기화(Sync) 복합 로직 전면 제거.
- **스트리밍 최적화**: 브라우저의 오디오 탐색(Seek) 및 스트리밍을 지원하기 위해 **Presigned URL 기반 Range Request** 지원.
- **메타데이터**: MP3 등 오디오 파일의 태그(ID3/Vorbis)를 Source of Truth로 하며, PostgreSQL은 검색/목록 조회를 위한 인덱스로 사용.
- **인증**: Google OIDC(순수 신원 확인용, 검수 불필요) + Music Hub 자체 Access JWT(메모리) / Refresh Token(httpOnly Cookie).

---

## 2. 주요 아키텍처 및 기술 스택

### 2.1 논리 아키텍처

```text
┌────────────────────────────────────────────────────────┐
│                   Client (React Web)                   │
│                                                        │
│  - Google OIDC 로그인                                  │
│  - 오디오 플레이어 (HTML5 Audio / Presigned URL 직접 재생)│
│  - 파일 직접 업로드 (Presigned PUT URL로 R2에 직접 전송)   │
│  - URL 추출 요청 및 진행 상태 모니터링                  │
└──────────────┬───────────────────────────▲─────────────┘
               │                           │
               │ API 요청 (Music Hub JWT)  │ 오디오 스트리밍 / 파일 업로드
               ▼                           │ (Presigned URL)
┌──────────────────────────────────────────┴─────────────┐
│              Spring Boot + Kotlin Backend              │
│                                                        │
│  - 사용자 인증 및 JWT 관리                              │
│  - Presigned URL 생성 (S3 SDK 기반)                    │
│  - 메타데이터 추출 및 관리 (jaudiotagger)              │
│  - 비동기 미디어 추출 (yt-dlp + DB Polling 스케줄러)     │
│  - 사용자별 R2 용량(할당량) 모니터링                     │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
       ┌────────────────┐         ┌────────────────────┐
       │   PostgreSQL   │         │   Cloudflare R2    │
       │                │         │   (S3 Compatible)  │
       │ User           │         │                    │
       │ RefreshToken   │         │ /users/{userId}/   │
       │ MusicFile      │         │   ├── audio/       │
       │ ExtractionJob  │         │   └── artwork/     │
       └────────────────┘         └────────────────────┘
```

### 2.2 기술 스택

| 영역 | 기술 | 채택 이유 / 세부 사항 |
|---|---|---|
| **Frontend** | React, TanStack Router | SPA 및 모던 라우팅 |
| **Backend** | Spring Boot 3.x, Kotlin | 안정성, 타입 안정성 |
| **Database** | PostgreSQL | 메타데이터 인덱싱, 트랜잭션 보장 |
| **Storage** | **Cloudflare R2** | **영구 무료 10GB, 다운로드 트래픽 $0, S3 호환** |
| **Media Tagging** | jaudiotagger (3.x) | MP3(ID3v2.3), FLAC, M4A 메타데이터 추출/편집 |
| **Media Extraction**| yt-dlp + FFmpeg | 백그라운드 오디오 추출 및 변환 |
| **Authentication** | Google OIDC + 자체 JWT | OIDC로 신원만 확인, Access(메모리)+Refresh(Cookie) |

---

## 3. Cloudflare R2 저장소 설계

### 3.1 버킷 구조 (Single Bucket 전략)
서비스 전용 버킷 1개를 생성하고 사용자별 Prefix(경로)로 격리한다.

```text
r2-musichub-bucket/
└── users/
    └── {user_id}/
        ├── audio/
        │   ├── {music_file_id}.mp3
        │   └── {music_file_id}.flac
        └── artwork/
            ├── {music_file_id}.jpg
            └── {music_file_id}.png
```
- 파일명에 난수나 DB의 `music_file_id`를 사용하여 파일명 충돌 및 특수문자 인코딩 문제 원천 차단.
- 오디오 원본과 추출된 앨범 커버를 동일 디렉토리 계층에서 ID 기준으로 매핑.

### 3.2 0원 무료 플랜(10GB) 보호 정책
Cloudflare R2는 10GB 초과 시 $0.015/GB가 과금될 수 있으므로, **백엔드 차원에서 절대 10GB를 넘지 않도록 안전장치를 둔다.**

1. **전체 시스템 안전 마진**:
   - 버킷 전체 사용량이 **9.5 GB**에 도달하면 모든 신규 업로드/추출 차단.
2. **사용자별 할당량 (Quota)**:
   - 개인 프로젝트/소수 사용자 운영 기준: 1인당 최대 1~2GB (또는 1인 운영 시 9GB).
   - `music_file` 테이블의 `file_size` 총합으로 실시간 검증 (`SUM(file_size) >= Quota` 시 400 에러).
3. **단일 파일 업로드 크기 제한**:
   - 파일당 최대 **50 MB** 제한 (MP3 기준 약 50분 분량 충분).

---

## 4. 인증 및 보안 설계

Google Drive를 쓰지 않으므로 Google 계정의 추가 권한(Scope)이 전혀 필요 없다.

### 4.1 Google OIDC
- **요청 Scope**: `openid`, `profile`, `email` (가장 기본적인 공개 Scope).
- **Google OAuth 앱 검수**: **불필요** (공개 Scope만 쓰므로 구글 검수나 경고창 없이 즉시 상용 서비스 가능).
- **식별자**: Google의 고유 불변 ID인 `sub`(`google_subject`)를 기준으로 사용자 식별.

### 4.2 Music Hub JWT 체계 (확정)
- **Access JWT**: 
  - 수명: 15분
  - 보관: 프론트엔드 **JS 메모리** (XSS 공격으로부터 안전).
  - 전송: `Authorization: Bearer <token>` 헤더.
- **Refresh Token**:
  - 수명: 7일
  - 보관: **`httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/refresh` Cookie**.
  - 보안: DB에 SHA-256 해시값 저장, 재발급 시 Token Rotation 적용, 다중 기기 세션 지원.

---

## 5. 데이터베이스 모델 (PostgreSQL)

Google Drive 연동 정보(`DriveConnection`)가 완전히 제거되어 모델이 매우 심플해졌다.

### 5.1 ERD 요약

```text
       ┌──────────────┐
       │     User     │
       └──────┬───────┘
              │ 1
              ├─────────────────────────┐
              │ N                       │ N
       ┌──────▼───────┐          ┌──────▼───────┐
       │ RefreshToken │          │  MusicFile   │
       └──────────────┘          └──────┬───────┘
                                        │ 1 (선택)
                                        │ 1
                                 ┌──────▼───────┐
                                 │ ExtractionJob│
                                 └──────────────┘
```

### 5.2 DDL 스키마

```sql
-- 1. 사용자 테이블
CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    google_subject      VARCHAR(255) NOT NULL UNIQUE, -- Google sub claim
    email               VARCHAR(255) NOT NULL,
    display_name        VARCHAR(255),
    profile_image_url   TEXT,
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,    -- 현재 사용 용량 캐싱
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 리프레시 토큰 테이블 (보안용 해시 저장)
CREATE TABLE refresh_token (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,      -- SHA-256 해시
    device_info     VARCHAR(255),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 음악 파일 테이블
CREATE TABLE music_file (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key             VARCHAR(500) NOT NULL UNIQUE, -- R2 오브젝트 Key
    file_name               VARCHAR(500) NOT NULL,        -- 사용자가 올린 원본 파일명
    mime_type               VARCHAR(100) NOT NULL DEFAULT 'audio/mpeg',
    file_size               BIGINT NOT NULL,              -- 바이트 크기

    -- 메타데이터 인덱스 (원본은 오디오 파일 태그)
    title                   VARCHAR(500),
    artist                  VARCHAR(500),
    album                   VARCHAR(500),
    year                    INT,
    genre                   VARCHAR(255),
    track_number            INT,
    duration_ms             BIGINT,

    -- 앨범 아트워크 정보
    artwork_storage_key     VARCHAR(500),                 -- R2 썸네일 이미지 Key
    artwork_mime_type       VARCHAR(64),

    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ERROR, PROCESSING
    extracted_by_platform   BOOLEAN NOT NULL DEFAULT FALSE,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_music_file_user_id ON music_file(user_id);
CREATE INDEX idx_music_file_status ON music_file(status);

-- 4. 미디어 추출 작업 테이블
CREATE TABLE extraction_job (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_url      TEXT NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    -- PENDING, DOWNLOADING, CONVERTING, UPLOADING, COMPLETED, FAILED
    attempts        INT NOT NULL DEFAULT 0,
    max_attempts    INT NOT NULL DEFAULT 3,
    error_message   TEXT,
    music_file_id   BIGINT REFERENCES music_file(id) ON DELETE SET NULL,
    scheduled_at    TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extraction_job_status ON extraction_job(status, scheduled_at)
    WHERE status IN ('PENDING', 'FAILED');
```

---

## 6. 핵심 기능 흐름 (Workflows)

### 6.1 직접 파일 업로드 (Direct-to-R2 via Presigned URL)
백엔드 서버가 대용량 파일을 직접 중계하지 않고, **클라이언트가 Cloudflare R2로 직접 업로드**하므로 서버 메모리와 네트워크 부하가 0에 수렴한다.

```text
Client (Web)               Backend                      Cloudflare R2
     │                        │                               │
     │── 1. POST /upload/init ▶│                               │
     │   (파일명, 크기, MIME)  │ (용량 한도 검증: 9.5GB/유저쿼터)│
     │                        │── 2. Presigned PUT URL 생성 ──▶│
     │◀── 3. uploadUrl 반환 ──│                               │
     │                                                        │
     │── 4. PUT {uploadUrl} (파일 바이너리 직접 전송)───────────▶│
     │◀── 5. 200 OK ──────────────────────────────────────────│
     │                                                        │
     │── 6. POST /upload/complete ───────────────────────────▶│
     │   (업로드 완료 알림)    │                               │
     │                        │── 7. R2에서 파일 헤더/태그 읽기 ─▶│ (jaudiotagger)
     │                        │   (Artwork 추출 후 R2에 업로드)──▶│
     │                        │── 8. DB에 MusicFile 레코드 등록 │
     │◀── 9. 등록 완료 응답 ──│                               │
```

### 6.2 오디오 스트리밍 재생 (Presigned GET URL)
Cloudflare R2는 HTTP Range Request를 완벽하게 지원한다.

```text
Client (Web Audio Player)            Backend                 Cloudflare R2
          │                             │                          │
          │── 1. GET /music-files/{id}/play ──────────────────────▶│
          │◀── 2. 302 Redirect (또는 Presigned GET URL JSON 반환)──│
          │                                                        │
          │── 3. GET {presignedGetUrl} (Range: bytes=0-1048575)───▶│
          │◀── 4. 206 Partial Content (오디오 첫 버퍼 전송)────────│
          │                                                        │
          │ (재생 위치 Seek 발생 시)                                │
          │── 5. GET {presignedGetUrl} (Range: bytes=5242880-...)─▶│
          │◀── 6. 206 Partial Content (해당 구간 즉시 반환)────────│
```
- 백엔드는 R2에 대해 1시간짜리 임시 다운로드 URL(Presigned URL)만 발급.
- 브라우저의 기본 `<audio>` 플레이어가 해당 URL로 Range Request를 직접 날려 버퍼링 및 구간 탐색 수행.
- **R2의 Egress 요금이 0원**이므로 백엔드 대역폭 낭비 없이 완벽한 무료 스트리밍 실현.

### 6.3 비동기 URL 추출 (yt-dlp)
기존에 확정했던 **DB Polling + `@Scheduled`** 방식을 그대로 유지한다.

```text
1. 사용자가 URL 제출 → POST /api/extractions → ExtractionJob(PENDING) 생성
2. 백엔드 스케줄러가 SELECT FOR UPDATE SKIP LOCKED 로 PENDING 작업 선점
3. yt-dlp로 /tmp 임시 디렉토리에 오디오 다운로드 및 MP3 변환
4. jaudiotagger로 기본 메타데이터(제목, 썸네일 등) 확인 및 보정
5. Cloudflare R2 버킷(/users/{id}/audio/)으로 변환 완료된 파일 업로드
6. 썸네일 이미지를 (/users/{id}/artwork/)으로 업로드
7. MusicFile DB 저장 (status = ACTIVE, extracted_by_platform = true)
8. 임시 파일 삭제 후 ExtractionJob 상태 COMPLETED 변경
9. 클라이언트는 3초 주기 Polling으로 완료 감지 후 라이브러리 자동 갱신
```

---

## 7. StorageService 추상화 (AWS S3 SDK 기반)

Spring Boot에서 `software.amazon.awssdk:s3` 라이브러리를 사용하여 Cloudflare R2를 표준 S3 인터페이스로 다룬다.

```kotlin
interface StorageService {
    /** 스트리밍 재생용 임시 URL 생성 (1시간 유효) */
    fun generatePresignedGetUrl(key: String, duration: Duration = Duration.ofHours(1)): String

    /** 클라이언트 직접 업로드용 임시 PUT URL 생성 */
    fun generatePresignedPutUrl(key: String, mimeType: String, duration: Duration = Duration.ofMinutes(15)): String

    /** 서버에서 직접 파일 업로드 (추출 파일, 아트워크 등) */
    fun upload(key: String, inputStream: InputStream, contentLength: Long, mimeType: String)

    /** 파일 다운로드 (메타데이터 분석용 스트림) */
    fun getObject(key: String): InputStream

    /** 파일 삭제 */
    fun delete(key: String)
}
```

---

## 8. 기존 Google Drive 대비 변경점 비교

| 비교 항목 | 기존: Google Drive 연동 | 개정: Cloudflare R2 연동 |
|---|---|---|
| **저장소 위치** | 사용자 개인 Google Drive | Music Hub 전용 Cloudflare R2 버킷 |
| **파일 권한 모델**| `drive.file` 권한, Picker 동의 | S3 Access Key 기반 서비스 단독 제어 |
| **Google 검수** | **필수 (Restricted Scope, 2~6개월)** | **불필요 (OIDC 기본 정보만 사용)** |
| **스트리밍 (Seek)**| Drive API 청크 스트리밍 구현 복잡 | **Presigned URL 기반 HTTP Range 표준 완벽 지원** |
| **비용 (Egress)** | 무료 (단, 쿼터 제한 및 대량 호출 위험) | **완전 0원 무제한 트래픽** |
| **저장 용량** | 사용자 Drive 용량 공유 | **버킷당 영구 무료 10 GB** (곡당 1,500곡 안팎) |
| **동기화/상태 머신**| `REVOKED`, `MISSING`, 재연결 플로우 필요 | **외부 영향 없음 (`ACTIVE`/`ERROR`만 단순 유지)** |

---

## 9. 즉시 구현 로드맵 (Action Plan)

1. **Cloudflare R2 버킷 생성 및 API Key 발급**
   - Cloudflare 대시보드에서 R2 버킷 1개 생성 (예: `musichub-storage`).
   - S3 호환 API 토큰(Access Key ID, Secret Access Key, Account ID Endpoint) 발급.
2. **Spring Boot 프로젝트 기본 뼈대 설정**
   - AWS S3 SDK v2 (`software.amazon.awssdk:s3`) 의존성 추가.
   - `application.yml`에 R2 Endpoint 및 자격 증명 설정.
3. **Database DDL 실행 (V1__init.sql)**
   - 5.2절의 단순화된 스키마(Users, RefreshToken, MusicFile, ExtractionJob) 반영.
4. **JWT 인증 & Google OIDC 구현**
   - 프론트 구글 로그인 연동 및 백엔드 JWT 발급/쿠키 설정.
5. **업로드 및 스트리밍 API 구현**
   - Presigned URL 기반 음원 업로드/재생 엔드포인트 개설.
   - jaudiotagger 연동 메타데이터 자동 추출.
6. **yt-dlp 비동기 추출 모듈 구현**
   - 스케줄러 기반 백그라운드 다운로드 및 R2 적재.
