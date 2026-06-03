-- Migration 020: multilingual support
-- Adds _en, _hi, _es, _pt columns to questions and professions
-- Adds lang column to users table

-- ── users: сохраняем язык пользователя ───────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS lang VARCHAR(5) DEFAULT 'en';

-- ── questions: переводы текста вопроса ───────────────────────────────────────
ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS question_text_en TEXT,
    ADD COLUMN IF NOT EXISTS question_text_hi TEXT,
    ADD COLUMN IF NOT EXISTS question_text_es TEXT,
    ADD COLUMN IF NOT EXISTS question_text_pt TEXT;

-- ── professions: переводы названия и описания ────────────────────────────────
ALTER TABLE professions
    ADD COLUMN IF NOT EXISTS title_en       TEXT,
    ADD COLUMN IF NOT EXISTS title_hi       TEXT,
    ADD COLUMN IF NOT EXISTS title_es       TEXT,
    ADD COLUMN IF NOT EXISTS title_pt       TEXT,
    ADD COLUMN IF NOT EXISTS description_en TEXT,
    ADD COLUMN IF NOT EXISTS description_hi TEXT,
    ADD COLUMN IF NOT EXISTS description_es TEXT,
    ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- ── profession_details: переводы reality, pros, cons ─────────────────────────
ALTER TABLE profession_details
    ADD COLUMN IF NOT EXISTS reality_en TEXT,
    ADD COLUMN IF NOT EXISTS reality_hi TEXT,
    ADD COLUMN IF NOT EXISTS reality_es TEXT,
    ADD COLUMN IF NOT EXISTS reality_pt TEXT,
    ADD COLUMN IF NOT EXISTS pros_en    JSONB,
    ADD COLUMN IF NOT EXISTS pros_hi    JSONB,
    ADD COLUMN IF NOT EXISTS pros_es    JSONB,
    ADD COLUMN IF NOT EXISTS pros_pt    JSONB,
    ADD COLUMN IF NOT EXISTS cons_en    JSONB,
    ADD COLUMN IF NOT EXISTS cons_hi    JSONB,
    ADD COLUMN IF NOT EXISTS cons_es    JSONB,
    ADD COLUMN IF NOT EXISTS cons_pt    JSONB;

-- ── индекс для быстрого поиска по языку ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_lang ON users(lang);
