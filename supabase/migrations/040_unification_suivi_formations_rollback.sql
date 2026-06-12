-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de 040_unification_suivi_formations.sql
--
-- Les tables d'origine (formation_statuts, formation_actions) n'ont PAS été
-- modifiées par la 040 : les données historiques y sont intactes, l'ancien
-- code refonctionne donc immédiatement après ce rollback.
--
-- Ce rollback retire uniquement ce que la 040 a ajouté. Les candidatures
-- créées par la migration sont supprimées (reconnaissables : type='formation'
-- avec une ligne correspondante dans formation_statuts ou formation_actions
-- et des notes vides). ⚠️ Les modifications faites par les candidats APRÈS la
-- migration sur ces lignes seront perdues — n'utiliser qu'en secours immédiat.
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS candidat_candidatures_formation_unique;

-- Supprime les rappels copiés depuis formation_actions
DELETE FROM candidature_actions ca
USING candidat_candidatures cc, formation_actions fa
WHERE ca.candidature_id = cc.id
  AND cc.formation_id = fa.formation_id
  AND cc.candidat_id = fa.candidat_id
  AND ca.texte = fa.texte;

-- Supprime les candidatures créées par la migration (issues d'un statut ou
-- d'un rappel de formation, jamais retouchées : notes vides)
DELETE FROM candidat_candidatures cc
WHERE cc.type = 'formation'
  AND coalesce(cc.notes, '') = ''
  AND (
    EXISTS (SELECT 1 FROM formation_statuts fs
            WHERE fs.candidat_id = cc.candidat_id AND fs.formation_id = cc.formation_id)
    OR EXISTS (SELECT 1 FROM formation_actions fa
            WHERE fa.candidat_id = cc.candidat_id AND fa.formation_id = cc.formation_id)
  );

ALTER TABLE candidat_candidatures DROP COLUMN IF EXISTS favori;
