-- 1. 사용자 테이블 (다중 인증 제공자 지원: GOOGLE, GITHUB, LOCAL 등)
CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    auth_provider       VARCHAR(32) NOT NULL DEFAULT 'GOOGLE',
    provider_id         VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255),
    display_name        VARCHAR(255),
    profile_image_url   TEXT,
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_provider UNIQUE (auth_provider, provider_id)
);

CREATE INDEX idx_users_email ON users(email);

-- 2. 리프레시 토큰 테이블 (해시값 저장 및 Rotation 지원)
CREATE TABLE refresh_token (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    device_info     VARCHAR(255),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_token_user_id ON refresh_token(user_id);

-- 3. 음악 파일 테이블 (R2 Storage Key 기반)
CREATE TABLE music_file (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key             VARCHAR(500) NOT NULL UNIQUE,
    file_name               VARCHAR(500) NOT NULL,
    mime_type               VARCHAR(100) NOT NULL DEFAULT 'audio/mpeg',
    file_size               BIGINT NOT NULL,

    -- ID3/Vorbis 메타데이터 인덱스
    title                   VARCHAR(500),
    artist                  VARCHAR(500),
    album                   VARCHAR(500),
    year                    INT,
    genre                   VARCHAR(255),
    track_number            INT,
    duration_ms             BIGINT,

    -- 앨범 커버 이미지 정보
    artwork_storage_key     VARCHAR(500),
    artwork_mime_type       VARCHAR(64),

    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    extracted_by_platform   BOOLEAN NOT NULL DEFAULT FALSE,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_music_file_user_id ON music_file(user_id);
CREATE INDEX idx_music_file_status ON music_file(status);

-- 4. 미디어 추출 작업 테이블 (비동기 스케줄러 처리용)
CREATE TABLE extraction_job (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_url      TEXT NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
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
