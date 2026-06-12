-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de 035_candidats_baseline_rls.sql
-- Retire les policies posées. NE SUPPRIME PAS la table ni les colonnes
-- (non destructif : la table préexistait et contient des données).
-- ⚠️ Après rollback, redéfinir une RLS adaptée — sinon la table peut se
--    retrouver sans policy (donc inaccessible) ou avec l'ancienne policy
--    permissive selon votre configuration antérieure.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "candidats_public_select" ON candidats;
DROP POLICY IF EXISTS "candidats_self_insert"   ON candidats;
DROP POLICY IF EXISTS "candidats_self_update"   ON candidats;
DROP POLICY IF EXISTS "candidats_admin_all"     ON candidats;

DROP TRIGGER IF EXISTS candidats_updated_at ON candidats;
