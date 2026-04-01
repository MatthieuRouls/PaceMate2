-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : table strava_tokens (isolation des tokens OAuth)
--
-- POURQUOI :
--   Les tokens Strava (access_token, refresh_token) étaient stockés directement
--   dans la table `profiles`. Cela posait un risque de fuite via des SELECT *
--   ou des jointures trop larges. Cette migration :
--     1. Crée une table dédiée avec RLS stricte (user voit uniquement sa ligne)
--     2. Migre les données existantes
--     3. Supprime les colonnes sensibles de `profiles`
--
-- COMMENT APPLIQUER :
--   Supabase Dashboard → SQL Editor → coller et exécuter ce fichier.
--   OU via CLI : supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Créer la table
CREATE TABLE IF NOT EXISTS strava_tokens (
  user_id        uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token   text        NOT NULL,
  refresh_token  text        NOT NULL,
  expires_at     timestamptz NOT NULL,
  athlete_id     bigint,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Index pour les lookups par user_id (déjà PK, mais explicite pour la clarté)
COMMENT ON TABLE strava_tokens IS
  'Tokens OAuth Strava isolés de la table profiles pour éviter toute fuite accidentelle.';

-- 2. Row Level Security
ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut lire/écrire QUE sa propre ligne
CREATE POLICY "strava_tokens_owner_only"
  ON strava_tokens
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Le service role (backend) peut tout faire (nécessaire pour les server actions)
-- Pas besoin de policy explicite : service role bypass RLS par défaut.

-- 3. Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS strava_tokens_updated_at ON strava_tokens;
CREATE TRIGGER strava_tokens_updated_at
  BEFORE UPDATE ON strava_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Migrer les données existantes depuis profiles (si les colonnes existent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'strava_access_token'
  ) THEN
    INSERT INTO strava_tokens (user_id, access_token, refresh_token, expires_at, athlete_id)
    SELECT
      id,
      strava_access_token,
      strava_refresh_token,
      COALESCE(strava_token_expires_at, now() + interval '1 hour'),
      strava_athlete_id
    FROM profiles
    WHERE strava_access_token IS NOT NULL
      AND strava_refresh_token IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Migrated % rows from profiles to strava_tokens',
      (SELECT count(*) FROM strava_tokens);
  END IF;
END;
$$;

-- 5. Supprimer les colonnes sensibles de profiles
--    (À exécuter APRÈS avoir vérifié que la migration des données s'est bien passée)
ALTER TABLE profiles
  DROP COLUMN IF EXISTS strava_access_token,
  DROP COLUMN IF EXISTS strava_refresh_token,
  DROP COLUMN IF EXISTS strava_token_expires_at;

-- Note : strava_connected, strava_athlete_id, strava_last_sync restent dans
-- profiles car ce sont des métadonnées non-sensibles utiles pour l'UI.
