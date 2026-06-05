-- Migration 014 : Profil candidat v2
-- Ajoute : dispo mois/année, pause, visibilité écoles, flags expériences

ALTER TABLE candidats
  ADD COLUMN IF NOT EXISTS dispo_mois            SMALLINT,
  ADD COLUMN IF NOT EXISTS dispo_annee           SMALLINT,
  ADD COLUMN IF NOT EXISTS profil_en_pause       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profil_visible_ecoles BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS masquer_experiences   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pas_experience_pro    BOOLEAN NOT NULL DEFAULT false;
