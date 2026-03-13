-- ================================================
-- MIGRATION: Admin Feature Flags & App Settings
-- ================================================

-- ------------------------------------------------
-- 1. Table app_settings (feature flags)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- RLS : lecture publique (l'app en a besoin), écriture admin seulement
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Les écritures se font via service role (depuis les server actions admin)

-- ------------------------------------------------
-- 2. Valeurs par défaut des feature flags
-- ------------------------------------------------
INSERT INTO public.app_settings (key, value, description, category) VALUES
  -- SMS / Téléphone
  ('sms_verification_enabled',       'false',  'Active la vérification SMS via Twilio (nécessite configuration Supabase Phone Auth)', 'phone'),
  ('phone_step_required',            'false',  'Rend l''étape téléphone obligatoire à l''onboarding (sinon optionnelle)', 'phone'),

  -- Vérification d''identité
  ('identity_verification_enabled',  'true',   'Active le module de vérification d''identité (ID + selfie)', 'identity'),
  ('identity_verification_required', 'false',  'Rend la vérification d''identité obligatoire pour accéder aux sessions mixtes', 'identity'),
  ('identity_bypass_for_testing',    'false',  'TESTS SEULEMENT — bypass la vérification d''identité (simule niveau 2 auto)', 'identity'),

  -- Mode sécurité
  ('safety_mode_enabled',            'true',   'Active le mode sécurité renforcée (partage de position)', 'safety'),
  ('safety_mode_requires_id',        'true',   'Requiert vérification d''identité pour activer le mode sécurité', 'safety'),

  -- Sessions
  ('session_creation_enabled',       'true',   'Permet aux utilisateurs de créer de nouvelles sessions', 'sessions'),
  ('max_session_participants',       '20',     'Nombre maximum de participants par session', 'sessions'),
  ('allow_solo_mixed_sessions',      'true',   'Autorise les sessions de type solo/mixte', 'sessions'),

  -- Maintenance / Dev
  ('maintenance_mode',               'false',  'Active le mode maintenance (bloque l''accès à l''app)', 'system'),
  ('new_registrations_enabled',      'true',   'Autorise les nouvelles inscriptions', 'system'),
  ('debug_mode',                     'false',  'Active les logs de debug supplémentaires', 'system')

ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------
-- 3. Table admin_activity_log (historique actions admin)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_log_created ON public.admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin ON public.admin_activity_log(admin_id);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
-- Seuls les admins (via service role) peuvent lire/écrire

-- ------------------------------------------------
-- 4. Colonne is_admin dans profiles
-- ------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ⚠️ IMPORTANT : Pour te donner accès admin, exécute cette requête
-- avec ton user_id (visible dans la table profiles) :
--
-- UPDATE profiles SET is_admin = TRUE WHERE id = 'TON_USER_ID';
-- OU par email dans auth.users :
-- UPDATE profiles SET is_admin = TRUE
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'ton@email.com');
