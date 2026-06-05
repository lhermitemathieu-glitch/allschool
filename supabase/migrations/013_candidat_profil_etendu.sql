-- Migration 013 : Extension du profil candidat
-- Ajoute : expériences, compétences hard/soft, niveau d'études, langues, LinkedIn, permis

ALTER TABLE candidats
  ADD COLUMN IF NOT EXISTS experiences      JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS competences_hard TEXT,
  ADD COLUMN IF NOT EXISTS competences_soft TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niveau_etudes    TEXT,
  ADD COLUMN IF NOT EXISTS langues          JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS linkedin_url     TEXT,
  ADD COLUMN IF NOT EXISTS permis           BOOLEAN  NOT NULL DEFAULT false;

-- experiences : [{ entreprise, poste, mois_debut, annee_debut, mois_fin, annee_fin, en_cours }]
-- langues     : [{ langue, niveau }]
