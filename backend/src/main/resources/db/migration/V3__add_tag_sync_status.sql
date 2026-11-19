-- 음악 파일 오디오 태그 백그라운드 동기화 상태 컬럼 추가 (SYNCED, SYNCING, FAILED)
ALTER TABLE music_file ADD COLUMN tag_sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED';
