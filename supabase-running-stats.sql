-- ============================================================
-- Running Statistics System
-- ============================================================
-- Run once in Supabase SQL editor.
-- Adds stats columns, runner_connections, user_badges tables.
-- ============================================================

-- ============================================================
-- 1. PROFILE STATS COLUMNS
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS runs_completed         INT           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS runs_hosted            INT           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_run_time_minutes INT           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS people_met             INT           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reliability_score      DECIMAL(5,2)  DEFAULT 100,
  ADD COLUMN IF NOT EXISTS active_weeks           INT           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_runs_contributed  INT           DEFAULT 0;

-- ============================================================
-- 2. TEAM STATS COLUMNS
-- ============================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS runs_completed   INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_members   INT  DEFAULT 0;

-- ============================================================
-- 3. RUNNER CONNECTIONS
-- Who ran together, how many times, last date
-- ============================================================

CREATE TABLE IF NOT EXISTS public.runner_connections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  other_user_id  UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  runs_together  INT         NOT NULL DEFAULT 1,
  last_run_date  TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, other_user_id),
  CHECK  (user_id <> other_user_id)
);

ALTER TABLE public.runner_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own connections
CREATE POLICY "Users can read own connections"
  ON public.runner_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own connections
CREATE POLICY "Users can manage own connections"
  ON public.runner_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. USER BADGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_badges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  badge_type TEXT        NOT NULL,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, badge_type)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can read their own badges; anyone can see them (public profiles)
CREATE POLICY "Badges are public"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "System inserts badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_runner_connections_user
  ON public.runner_connections (user_id);

CREATE INDEX IF NOT EXISTS idx_runner_connections_other
  ON public.runner_connections (other_user_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_user
  ON public.user_badges (user_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_type
  ON public.user_badges (user_id, badge_type);
