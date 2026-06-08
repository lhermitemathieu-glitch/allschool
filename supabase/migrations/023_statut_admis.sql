-- Ajout du statut 'admis' dans le pipeline candidatures
ALTER TABLE candidat_candidatures DROP CONSTRAINT IF EXISTS candidat_candidatures_statut_check;
ALTER TABLE candidat_candidatures
  ADD CONSTRAINT candidat_candidatures_statut_check
  CHECK (statut IN ('a_faire', 'envoyee', 'entretien', 'admis', 'archive'));
