-- Refonte des statuts de candidatures
-- Remplacement de 'enregistre' par 'a_faire' comme premier statut du pipeline

-- 1. Migrer les existants
UPDATE candidat_candidatures SET statut = 'a_faire' WHERE statut = 'enregistre';

-- 2. Mettre à jour la contrainte
ALTER TABLE candidat_candidatures DROP CONSTRAINT IF EXISTS candidat_candidatures_statut_check;

ALTER TABLE candidat_candidatures
  ADD CONSTRAINT candidat_candidatures_statut_check
  CHECK (statut IN ('a_faire', 'envoyee', 'entretien', 'archive'));
