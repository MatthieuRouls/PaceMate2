-- ================================================
-- MIGRATION: Phone, Safety Mode, Trusted Contact & Identity Verification
-- ================================================
-- Ajoute les colonnes manquantes dans profiles et crée la table identity_verifications
-- ================================================

-- ------------------------------------------------
-- 1. Colonnes manquantes dans la table profiles
-- ------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS safety_enhanced_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trusted_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS trusted_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS trusted_contact_relation TEXT;

-- ------------------------------------------------
-- 2. Table identity_verifications
-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Niveau de vérification : 0=basic, 1=phone_verified, 2=id_verified, 3=trusted
  level INTEGER NOT NULL DEFAULT 0,
  level_name TEXT NOT NULL DEFAULT 'basic',

  -- Vérification téléphone
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,

  -- Vérification identité
  id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  id_verified_at TIMESTAMPTZ,
  id_document_type TEXT,        -- passport, national_id, drivers_license, residence_permit
  id_document_country TEXT,
  id_document_path TEXT,        -- Chemin dans Supabase Storage (bucket privé)

  -- Selfie & comparaison faciale
  selfie_match_score NUMERIC(5,2),     -- 0-100, JAMAIS exposé publiquement
  selfie_match_passed BOOLEAN NOT NULL DEFAULT FALSE,
  selfie_verified_at TIMESTAMPTZ,
  selfie_path TEXT,             -- Chemin dans Supabase Storage (bucket privé)

  -- Révision admin (si score ambigu)
  admin_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  admin_review_reason TEXT,
  admin_reviewed_at TIMESTAMPTZ,
  admin_reviewer_id UUID,

  -- Anti-fraude
  verification_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  flagged_for_fraud BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_identity_verifications_user_id ON public.identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_level ON public.identity_verifications(level);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_admin_review ON public.identity_verifications(admin_review_required) WHERE admin_review_required = TRUE;

-- RLS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut voir et modifier uniquement sa propre vérification
CREATE POLICY "Users can view own identity verification"
  ON public.identity_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identity verification"
  ON public.identity_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own identity verification"
  ON public.identity_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_identity_verification_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER identity_verifications_updated_at
  BEFORE UPDATE ON public.identity_verifications
  FOR EACH ROW EXECUTE FUNCTION update_identity_verification_updated_at();

-- ------------------------------------------------
-- 3. Bucket Supabase Storage pour les documents d'identité
-- ------------------------------------------------
-- ATTENTION: À exécuter depuis le dashboard Supabase ou via l'API Storage.
-- Le bucket doit être PRIVÉ (public = false).
-- Commande à exécuter séparément si besoin:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('identity-docs', 'identity-docs', false)
-- ON CONFLICT (id) DO NOTHING;
--
-- Politique RLS Storage : chaque user peut uploader dans son propre dossier
-- CREATE POLICY "Users can upload own identity docs"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'identity-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can read own identity docs"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'identity-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
