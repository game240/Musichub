CREATE TABLE user_playback_state (
    user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_track_id    BIGINT REFERENCES music_file(id) ON DELETE SET NULL,
    queue_track_ids     BIGINT[] NOT NULL DEFAULT '{}',
    shuffled_track_ids  BIGINT[] NOT NULL DEFAULT '{}',
    queue_index         INT NOT NULL DEFAULT 0,
    is_shuffle          BOOLEAN NOT NULL DEFAULT FALSE,
    repeat_mode         VARCHAR(16) NOT NULL DEFAULT 'OFF',
    current_position_ms BIGINT NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_playback_state_updated ON user_playback_state(updated_at);
