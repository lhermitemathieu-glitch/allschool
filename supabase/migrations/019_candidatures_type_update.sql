-- Alignement de la table candidat_candidatures avec le schéma attendu
-- La table en prod était une version ancienne sans type/statut/notes/url

ALTER TABLE candidat_candidatures
  ADD COLUMN IF NOT EXISTS type       text NOT NULL DEFAULT 'externe',
  ADD COLUMN IF NOT EXISTS statut     text NOT NULL DEFAULT 'enregistre',
  ADD COLUMN IF NOT EXISTS notes      text,
  ADD COLUMN IF NOT EXISTS url        text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Renommer nom → nom_entreprise
ALTER TABLE candidat_candidatures RENAME COLUMN nom TO nom_entreprise;

-- Migrer lien → url puis supprimer lien
UPDATE candidat_candidatures SET url = lien WHERE lien IS NOT NULL;
ALTER TABLE candidat_candidatures DROP COLUMN IF EXISTS lien;

-- Contraintes CHECK
ALTER TABLE candidat_candidatures
  ADD CONSTRAINT candidat_candidatures_type_check
  CHECK (type IN ('allschool', 'externe', 'spontanee', 'prospection', 'sourcee'));

ALTER TABLE candidat_candidatures
  ADD CONSTRAINT candidat_candidatures_statut_check
  CHECK (statut IN ('enregistre', 'envoyee', 'entretien', 'archive'));
