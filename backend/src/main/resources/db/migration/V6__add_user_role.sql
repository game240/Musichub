-- 사용자 테이블에 역할(role) 컬럼 추가
-- ADMIN: 최고 관리자
-- DOWNLOADER: 향후 분기를 위해 허용 (현재는 DOWNLOADER = NULL로 상정)
-- NULL: 일반 사용자 (현재 음원 다운로드 등 기본 기능 이용)
ALTER TABLE users ADD COLUMN role VARCHAR(32);
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'DOWNLOADER') OR role IS NULL);

CREATE INDEX idx_users_role ON users(role);
