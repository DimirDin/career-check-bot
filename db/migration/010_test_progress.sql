-- Таблица для сохранения прогресса теста
CREATE TABLE IF NOT EXISTS test_progress (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '[]',
    current_question INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_progress_updated ON test_progress(updated_at);
