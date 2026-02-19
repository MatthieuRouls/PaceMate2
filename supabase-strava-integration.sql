-- ================================================
-- MIGRATION: Integration Strava pour calcul de niveau
-- ================================================
-- Ajoute les champs necessaires pour l'integration Strava
-- et securise le calcul du niveau de course
-- ================================================

-- 1. Ajouter les colonnes Strava au profil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_athlete_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_last_sync TIMESTAMP WITH TIME ZONE;

-- 2. Statistiques calculees depuis Strava
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calculated_avg_pace INTERVAL; -- Allure moyenne (ex: 5:30/km)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calculated_weekly_km FLOAT DEFAULT 0; -- Km hebdo moyen
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calculated_longest_run FLOAT DEFAULT 0; -- Plus longue sortie
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calculated_total_runs INTEGER DEFAULT 0; -- Nombre total de courses

-- 3. Index pour les requetes Strava
CREATE INDEX IF NOT EXISTS idx_profiles_strava_athlete ON profiles (strava_athlete_id) WHERE strava_athlete_id IS NOT NULL;

-- 4. Commentaires
COMMENT ON COLUMN profiles.strava_athlete_id IS 'ID athlete Strava';
COMMENT ON COLUMN profiles.strava_access_token IS 'Token acces Strava (chiffre)';
COMMENT ON COLUMN profiles.strava_refresh_token IS 'Token refresh Strava (chiffre)';
COMMENT ON COLUMN profiles.strava_connected IS 'True si le compte Strava est connecte';
COMMENT ON COLUMN profiles.running_level IS 'Niveau calcule automatiquement depuis Strava (1-5)';
