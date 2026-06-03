-- Ajout du tableau de modalités sur les écoles
ALTER TABLE ecoles
  ADD COLUMN IF NOT EXISTS modalites text[] DEFAULT '{}';

-- Peupler depuis les formations existantes
UPDATE ecoles e
SET modalites = (
  SELECT array_agg(DISTINCT f.modalite ORDER BY f.modalite)
  FROM formations f
  WHERE f.ecole_id = e.id
    AND f.modalite IS NOT NULL
)
WHERE EXISTS (
  SELECT 1 FROM formations f
  WHERE f.ecole_id = e.id AND f.modalite IS NOT NULL
);
