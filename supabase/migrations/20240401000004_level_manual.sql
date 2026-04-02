-- Sprint 6 : système de niveau manuel (questionnaire d'étalonnage)
-- Colonnes ajoutées à la table profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS level_source TEXT DEFAULT 'default'
    CHECK (level_source IN ('strava', 'manual', 'default')),
  ADD COLUMN IF NOT EXISTS level_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_level_data JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Les utilisateurs existants sont considérés comme ayant terminé l'onboarding
-- (pour ne pas les interrompre avec le wizard)
UPDATE profiles SET onboarding_completed = true WHERE onboarding_completed = false;
