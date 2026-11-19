-- 사용자 음량 설정 컬럼 추가 (0~100 퍼센트, 기본값 100)
ALTER TABLE users ADD COLUMN volume INT NOT NULL DEFAULT 100;
ALTER TABLE users ADD CONSTRAINT chk_users_volume CHECK (volume >= 0 AND volume <= 100);
