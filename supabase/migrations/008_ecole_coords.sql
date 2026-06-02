-- Coordonnées GPS sur les écoles
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS latitude  float;
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS longitude float;

-- Index pour accélérer les requêtes géographiques
CREATE INDEX IF NOT EXISTS ecoles_coords_idx ON ecoles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Fonction Haversine : retourne les écoles dans un rayon donné
CREATE OR REPLACE FUNCTION ecoles_dans_rayon(
  lat      float,
  lng      float,
  rayon_km float
)
RETURNS TABLE(id uuid, distance_km float)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    (6371 * acos(
      LEAST(1.0,
        cos(radians(lat))  * cos(radians(latitude)) *
        cos(radians(longitude) - radians(lng)) +
        sin(radians(lat))  * sin(radians(latitude))
      )
    ))::float AS distance_km
  FROM ecoles
  WHERE latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND (6371 * acos(
      LEAST(1.0,
        cos(radians(lat))  * cos(radians(latitude)) *
        cos(radians(longitude) - radians(lng)) +
        sin(radians(lat))  * sin(radians(latitude))
      )
    )) <= rayon_km
  ORDER BY distance_km;
$$;
