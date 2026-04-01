-- ─────────────────────────────────────────────────────────────────────────────
-- Tables manquantes référencées par le code mais pas encore créées en base
--
-- Supabase Dashboard → SQL Editor
-- Exécuter AVANT 20240401000001_rls_policies.sql (ou re-exécuter les policies)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_badges ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type   text NOT NULL,
  awarded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON user_badges (user_id);

-- ── runner_connections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runner_connections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  other_user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  runs_together  integer NOT NULL DEFAULT 1,
  last_run_date  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, other_user_id)
);

CREATE INDEX IF NOT EXISTS runner_connections_user_id_idx       ON runner_connections (user_id);
CREATE INDEX IF NOT EXISTS runner_connections_other_user_id_idx ON runner_connections (other_user_id);

-- ── admin_activity_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action       text NOT NULL,
  entity_type  text,
  entity_id    text,
  details      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_log_admin_id_idx  ON admin_activity_log (admin_id);
CREATE INDEX IF NOT EXISTS admin_log_created_at_idx ON admin_activity_log (created_at DESC);

-- ── teams (si pas encore créée) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  description     text,
  total_distance  numeric NOT NULL DEFAULT 0,
  runs_completed  integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── team_memberships ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_memberships_team_id_idx ON team_memberships (team_id);
CREATE INDEX IF NOT EXISTS team_memberships_user_id_idx ON team_memberships (user_id);
