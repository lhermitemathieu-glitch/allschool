-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de 037_rls_admin_et_suppressions.sql
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "entreprises_admin_all"          ON entreprises;
DROP POLICY IF EXISTS "entreprise: delete propriétaire" ON entreprises;
DROP POLICY IF EXISTS "ecoles_admin_all"               ON ecoles;
DROP POLICY IF EXISTS "ecoles: delete propriétaire"    ON ecoles;
DROP POLICY IF EXISTS "offres_admin_all"               ON offres;
DROP POLICY IF EXISTS "formations_admin_all"           ON formations;
DROP POLICY IF EXISTS "ecole_apprentis_admin_all"      ON ecole_apprentis;
