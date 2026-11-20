-- 5. 사용자 다중 인증 식별자 테이블 (LOCAL, GOOGLE 등 1:N 인증 수단 지원)
CREATE TABLE user_identities (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(32) NOT NULL,
    provider_id     VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_identities_provider_id UNIQUE (provider, provider_id)
);

CREATE INDEX idx_identities_user_id ON user_identities(user_id);

-- 기존 users 테이블에 존재하는 기존 가입 계정 데이터 마이그레이션 (Backfill)
INSERT INTO user_identities (user_id, provider, provider_id, password_hash, created_at)
SELECT id, auth_provider, provider_id, password_hash, created_at FROM users;
