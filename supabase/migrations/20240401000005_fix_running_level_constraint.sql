-- Sprint 6 fix : contrainte running_level étendue à 1-9
-- et mise à jour du callback Strava pour renseigner level_source + level_score

-- 1. Supprimer l'ancienne contrainte (limitée à 1-5 dans le schéma original)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_running_level_check;

-- 2. Recréer avec la plage correcte 1-9
ALTER TABLE profiles
  ADD CONSTRAINT profiles_running_level_check
  CHECK (running_level BETWEEN 1 AND 9);
