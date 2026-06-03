-- 1. Élargir la contrainte pour accepter 'bac'
ALTER TABLE formations
  DROP CONSTRAINT IF EXISTS formations_niveau_check;

ALTER TABLE formations
  ADD CONSTRAINT formations_niveau_check
  CHECK (niveau IN ('cap', 'bac', 'bts', 'bach', 'master', 'autre'));

-- 2. Reclasser les formations Bac Pro qui sont actuellement en 'cap'
--    On se base sur le champ diplome (insensible à la casse)
UPDATE formations
SET niveau = 'bac'
WHERE niveau = 'cap'
  AND (
    diplome ILIKE '%bac pro%'
    OR diplome ILIKE '%baccalauréat professionnel%'
    OR diplome ILIKE '%baccalaureat professionnel%'
    OR diplome ILIKE '%bp %'
    OR diplome ILIKE 'bp'
  );
