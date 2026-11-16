-- 1. 복합 인덱스 추가 및 기존 단일 컬럼 인덱스 정리
DROP INDEX IF EXISTS idx_music_file_user_id;
DROP INDEX IF EXISTS idx_music_file_status;

-- 목록 조회 (user_id, status 조건 및 created_at DESC 정렬 가속)
CREATE INDEX idx_music_file_user_status_created
    ON music_file(user_id, status, created_at DESC);

-- 사용자별 용량 합산(Index-Only Scan 지원)
CREATE INDEX idx_music_file_user_size
    ON music_file(user_id, file_size);

-- 2. 가사 및 재생 통계 메타데이터 컬럼 추가
ALTER TABLE music_file
    ADD COLUMN lyrics TEXT,
    ADD COLUMN play_count INT NOT NULL DEFAULT 0,
    ADD COLUMN last_played_at TIMESTAMPTZ;
