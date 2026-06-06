-- Migration 016 : enrichissement table offres
ALTER TABLE offres
  ADD COLUMN IF NOT EXISTS type_offre        TEXT CHECK (type_offre IN ('poste', 'ecole_entreprise', 'campagne')),
  ADD COLUMN IF NOT EXISTS email_contact     TEXT,
  ADD COLUMN IF NOT EXISTS telephone_contact TEXT,
  ADD COLUMN IF NOT EXISTS url_candidature   TEXT,
  ADD COLUMN IF NOT EXISTS soft_skills       TEXT[] DEFAULT '{}';

-- Fix : ajout 'archive' manquant dans le check constraint statut
ALTER TABLE offres DROP CONSTRAINT IF EXISTS offres_statut_check;
ALTER TABLE offres ADD CONSTRAINT offres_statut_check
  CHECK (statut IN ('active', 'inactive', 'pourvue', 'archive'));
