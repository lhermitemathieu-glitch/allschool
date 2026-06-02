-- Ajoute le champ publiee sur la table ecoles
-- false par defaut : toutes les pages sont hors ligne au depart
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS publiee boolean NOT NULL DEFAULT false;
