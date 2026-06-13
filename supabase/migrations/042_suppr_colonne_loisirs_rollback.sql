-- Rollback de la migration 042 — recrée la colonne candidats.loisirs
--
-- ⚠️ Recrée UNIQUEMENT la colonne (vide). Les loisirs qui existaient avant la
--    042 ont été fusionnés dans `passions` et ne sont pas « dé-fusionnables » :
--    ce rollback ne restaure donc pas leur ancienne séparation.

ALTER TABLE candidats ADD COLUMN IF NOT EXISTS loisirs text[] DEFAULT '{}';
