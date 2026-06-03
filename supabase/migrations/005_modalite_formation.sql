-- Ajout de la modalité d'enseignement sur les formations
ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS modalite text
  CHECK (modalite IN ('presentiel', 'distanciel', 'hybride'));

-- Auto-détection pour les données existantes à partir de localite_formation
UPDATE formations
SET modalite = 'distanciel'
WHERE modalite IS NULL
  AND (
    localite_formation ILIKE '%en ligne%'
    OR localite_formation ILIKE '%distance%'
    OR localite_formation ILIKE '%distanciel%'
    OR localite_formation ILIKE '%e-learning%'
    OR localite_formation ILIKE '%elearning%'
  );
