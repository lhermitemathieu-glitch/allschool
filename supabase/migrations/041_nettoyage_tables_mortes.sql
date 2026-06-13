-- Migration 041 — Nettoyage des tables mortes
--
-- Trois tables ne sont plus utilisées par l'application :
--
--   - formation_statuts / formation_actions : remplacées par le pipeline unifié
--     candidat_candidatures (migration 040). Les données ont été migrées et
--     validées en production ; plus aucune lecture/écriture côté code.
--
--   - candidats_import : cul-de-sac d'import admin (les profils importés
--     n'étaient jamais relus ni transformés en comptes). La fonctionnalité
--     d'import « candidats » est retirée du code dans le même chantier.
--
-- ⚠️ Après cette migration, le rollback de la 040 devient inopérant : il lisait
--    formation_statuts / formation_actions, désormais supprimées. La 040 étant
--    validée en production, ce rollback n'a plus lieu d'être.
--
-- Le DROP d'une table supprime aussi automatiquement ses index et ses policies
-- RLS. Aucune autre table ne référence ces trois tables (pas de clé étrangère
-- entrante), donc un DROP simple suffit — pas de CASCADE.

DROP TABLE IF EXISTS formation_actions;
DROP TABLE IF EXISTS formation_statuts;
DROP TABLE IF EXISTS candidats_import;
