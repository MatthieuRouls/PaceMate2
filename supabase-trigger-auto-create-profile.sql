-- ================================================
-- TRIGGER: Création automatique du profil lors de l'inscription
-- ================================================
-- Ce trigger crée automatiquement un profil dans la table 'profiles'
-- lorsqu'un nouvel utilisateur s'inscrit via Supabase Auth
-- ================================================

-- Supprime le trigger et la fonction s'ils existent déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Fonction qui crée le profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    running_level,
    xp_points,
    total_distance_km,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Récupère le username depuis les metadata, sinon génère un username par défaut
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'Runner_' || substring(NEW.id::text, 1, 8)
    ),
    1,    -- running_level par défaut
    0,    -- xp_points initial
    0,    -- total_distance_km initial
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Trigger qui s'exécute APRÈS l'insertion d'un nouvel utilisateur dans auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- VÉRIFICATION (Optionnel)
-- ================================================
-- Pour tester, vous pouvez exécuter:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
