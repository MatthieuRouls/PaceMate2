-- ============================================================
-- Migration: Add gender to profiles + index for level filtering
-- ============================================================

-- 1. Add gender column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IN ('male', 'female', 'other'));

-- 2. Index to speed up level-based session discovery queries
CREATE INDEX IF NOT EXISTS idx_sessions_level_required
  ON sessions (level_required);
