-- ================================================
-- MIGRATION: Ajout de la geolocalisation aux sessions et profiles
-- ================================================
-- Ajoute les coordonnees GPS (latitude/longitude) aux sessions
-- et une localisation "domicile" sur les profils utilisateurs
-- pour permettre le filtrage par proximite
-- ================================================

-- 1. Ajouter les colonnes de geolocalisation aux sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Ajouter les colonnes de localisation au profil utilisateur
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_latitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_longitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_city TEXT;

-- 3. Fonction utilitaire pour calculer la distance (formule Haversine)
-- Retourne la distance en kilometres entre deux points GPS
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371; -- Rayon de la Terre en km
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon / 2) * sin(dlon / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN R * c;
END;
$$;

-- 4. Index pour accelerer les requetes geographiques
CREATE INDEX IF NOT EXISTS idx_sessions_lat_lng ON sessions (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_home_lat_lng ON profiles (home_latitude, home_longitude) WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;
