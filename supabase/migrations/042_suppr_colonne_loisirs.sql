-- Migration 042 — Suppression de la colonne morte candidats.loisirs
--
-- Contexte : les « centres d'intérêt » ont été fusionnés dans la colonne
-- `passions` côté formulaire candidat. La colonne `loisirs` n'était plus
-- alimentée par le profil candidat (toujours vidée à l'enregistrement) mais
-- restait comptée dans le score de complétion → profil bloqué à 92 %.
-- Le code a été corrigé (un seul critère « centres d'intérêt » = passions) et
-- toutes les références à `loisirs` sont retirées.
--
-- Avant de supprimer la colonne, on PRÉSERVE les éventuels loisirs déjà saisis
-- (via l'ancien éditeur admin) en les fusionnant dans `passions`, dédoublonnés.

UPDATE candidats
SET passions = ARRAY(
  SELECT DISTINCT unnest(COALESCE(passions, '{}') || COALESCE(loisirs, '{}'))
)
WHERE COALESCE(array_length(loisirs, 1), 0) > 0;

ALTER TABLE candidats DROP COLUMN IF EXISTS loisirs;
