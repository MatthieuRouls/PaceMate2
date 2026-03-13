-- ============================================================
-- Post-Run Flow : Safety Feedbacks & Session Stats
-- ============================================================
-- Run this in the Supabase SQL editor ONCE to enable the
-- full post-run wizard (peer ratings, safety moderation, stats).
-- ============================================================

-- 1. Add comment column to session_participants (stores session review text)
ALTER TABLE public.session_participants
  ADD COLUMN IF NOT EXISTS comment TEXT;

-- 2. Safety feedbacks table (peer-to-peer, confidential)
CREATE TABLE IF NOT EXISTS public.safety_feedbacks (
  id                   TEXT PRIMARY KEY,
  session_id           UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  reviewer_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating               TEXT NOT NULL CHECK (rating IN ('positive', 'neutral', 'negative')),
  flags                TEXT[] NOT NULL DEFAULT '{}',
  comment              TEXT,
  anonymous            BOOLEAN NOT NULL DEFAULT false,
  processed            BOOLEAN NOT NULL DEFAULT false,
  processed_at         TIMESTAMPTZ,
  moderation_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One feedback per reviewer per reviewed user per session
  UNIQUE (session_id, reviewer_id, reviewed_user_id),

  -- Cannot review yourself
  CHECK (reviewer_id <> reviewed_user_id)
);

-- Row Level Security
ALTER TABLE public.safety_feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own safety feedback"
  ON public.safety_feedbacks FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Users can read only feedback they submitted (reviewer identity stays hidden from subject)
CREATE POLICY "Users can read own given safety feedback"
  ON public.safety_feedbacks FOR SELECT
  USING (auth.uid() = reviewer_id);

-- Admins (service role) bypass RLS — no additional policy needed

-- 3. Ensure profiles has total_distance_km and xp_points columns
--    (they should already exist; this is a safety net)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0;

-- 4. Ensure teams has total_distance column
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS total_distance NUMERIC(10, 2) DEFAULT 0;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_safety_feedbacks_reviewed_user
  ON public.safety_feedbacks (reviewed_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_safety_feedbacks_session
  ON public.safety_feedbacks (session_id);

CREATE INDEX IF NOT EXISTS idx_safety_feedbacks_moderation
  ON public.safety_feedbacks (moderation_triggered, processed)
  WHERE moderation_triggered = true AND processed = false;
