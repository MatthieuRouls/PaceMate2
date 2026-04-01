-- ─────────────────────────────────────────────────────────────────────────────
-- Audit & renforcement des policies RLS
--
-- Ce fichier documente et applique les politiques RLS essentielles.
-- Supabase Dashboard → SQL Editor → exécuter après 20240401000000_strava_tokens.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Chaque utilisateur peut lire tous les profils (nécessaire pour discovery)
-- mais ne peut modifier QUE le sien.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"      ON profiles;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- IMPORTANT : bloquer les champs sensibles via une vue ou column-level security
-- si jamais des tokens résiduels existaient encore dans profiles.
-- Après la migration strava_tokens, aucun token ne doit rester dans cette table.

-- ── sessions ─────────────────────────────────────────────────────────────────
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_public"   ON sessions;
DROP POLICY IF EXISTS "sessions_insert_auth"     ON sessions;
DROP POLICY IF EXISTS "sessions_update_creator"  ON sessions;
DROP POLICY IF EXISTS "sessions_delete_creator"  ON sessions;

-- Tout le monde peut lire les sessions (app publique)
CREATE POLICY "sessions_select_public" ON sessions
  FOR SELECT USING (true);

-- Seul un utilisateur authentifié peut créer une session
CREATE POLICY "sessions_insert_auth" ON sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

-- Seul le créateur peut modifier/supprimer sa session
CREATE POLICY "sessions_update_creator" ON sessions
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "sessions_delete_creator" ON sessions
  FOR DELETE USING (creator_id = auth.uid());

-- ── session_participants ─────────────────────────────────────────────────────
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_select_public"    ON session_participants;
DROP POLICY IF EXISTS "participants_insert_own"       ON session_participants;
DROP POLICY IF EXISTS "participants_update_own"       ON session_participants;
DROP POLICY IF EXISTS "participants_delete_own"       ON session_participants;

CREATE POLICY "participants_select_public" ON session_participants
  FOR SELECT USING (true);

CREATE POLICY "participants_insert_own" ON session_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_update_own" ON session_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "participants_delete_own" ON session_participants
  FOR DELETE USING (user_id = auth.uid());

-- ── strava_tokens ────────────────────────────────────────────────────────────
-- (déjà créée dans la migration précédente, on s'assure de la cohérence)
ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strava_tokens_owner_only" ON strava_tokens;

CREATE POLICY "strava_tokens_owner_only" ON strava_tokens
  FOR ALL
  USING   (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── identity_verifications ───────────────────────────────────────────────────
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "identity_select_own"  ON identity_verifications;
DROP POLICY IF EXISTS "identity_insert_own"  ON identity_verifications;
DROP POLICY IF EXISTS "identity_update_own"  ON identity_verifications;

-- Un utilisateur ne voit QUE sa propre vérification
CREATE POLICY "identity_select_own" ON identity_verifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "identity_insert_own" ON identity_verifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "identity_update_own" ON identity_verifications
  FOR UPDATE USING (user_id = auth.uid());

-- ── user_badges ──────────────────────────────────────────────────────────────
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges_select_public" ON user_badges;
DROP POLICY IF EXISTS "badges_insert_system" ON user_badges;

-- Les badges sont publics (profil visible par tous)
CREATE POLICY "badges_select_public" ON user_badges
  FOR SELECT USING (true);

-- Seul le service role (backend) peut attribuer des badges
-- (via supabase service key — bypass RLS)
-- Un utilisateur normal ne peut PAS s'auto-attribuer un badge
CREATE POLICY "badges_insert_system" ON user_badges
  FOR INSERT WITH CHECK (false); -- bloqué pour les utilisateurs normaux

-- ── runner_connections ───────────────────────────────────────────────────────
ALTER TABLE runner_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connections_select_own"  ON runner_connections;
DROP POLICY IF EXISTS "connections_insert_own"  ON runner_connections;
DROP POLICY IF EXISTS "connections_update_own"  ON runner_connections;

CREATE POLICY "connections_select_own" ON runner_connections
  FOR SELECT USING (user_id = auth.uid() OR other_user_id = auth.uid());

CREATE POLICY "connections_insert_own" ON runner_connections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "connections_update_own" ON runner_connections
  FOR UPDATE USING (user_id = auth.uid());

-- ── teams ────────────────────────────────────────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_public"  ON teams;
DROP POLICY IF EXISTS "teams_insert_auth"    ON teams;
DROP POLICY IF EXISTS "teams_update_creator" ON teams;
DROP POLICY IF EXISTS "teams_delete_creator" ON teams;

CREATE POLICY "teams_select_public" ON teams
  FOR SELECT USING (true);

CREATE POLICY "teams_insert_auth" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

CREATE POLICY "teams_update_creator" ON teams
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "teams_delete_creator" ON teams
  FOR DELETE USING (creator_id = auth.uid());

-- ── admin_activity_log ───────────────────────────────────────────────────────
-- Accessible uniquement via service role (backend admin actions)
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_log_no_direct_access" ON admin_activity_log;

-- Personne ne peut lire/écrire directement (service role uniquement)
CREATE POLICY "admin_log_no_direct_access" ON admin_activity_log
  FOR ALL USING (false);
