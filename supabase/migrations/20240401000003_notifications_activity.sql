-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 3 — Rétention : notifications in-app + feed d'activité
--
-- Supabase Dashboard → SQL Editor
-- Exécuter après les migrations précédentes
-- ─────────────────────────────────────────────────────────────────────────────

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  -- types: 'session_join', 'friend_request', 'friend_accepted', 'session_reminder', 'badge_earned'
  title      text        NOT NULL,
  body       text,
  data       jsonb,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx       ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx   ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx    ON notifications (created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- INSERT is blocked for normal users — only service role (backend) can create notifications
-- (via supabase service key — bypass RLS)

-- ── activity_events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type   text        NOT NULL,
  -- types: 'session_joined', 'session_created', 'friend_accepted', 'badge_earned', 'team_joined'
  target_type  text,       -- 'session' | 'user' | 'badge' | 'team'
  target_id    text,       -- UUID or slug of the target
  target_label text,       -- human-readable label (session title, badge name, etc.)
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_actor_id_idx    ON activity_events (actor_id);
CREATE INDEX IF NOT EXISTS activity_events_created_at_idx  ON activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_event_type_idx  ON activity_events (event_type);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_events_select_public" ON activity_events;

-- Everyone can read activity (it's a public feed)
CREATE POLICY "activity_events_select_public" ON activity_events
  FOR SELECT USING (true);

-- INSERT blocked for normal users — only backend via service role
