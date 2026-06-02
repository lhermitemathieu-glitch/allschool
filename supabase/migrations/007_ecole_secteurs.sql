-- Ajout des secteurs d'activité sur la table ecoles
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS secteurs text[] DEFAULT '{}';
