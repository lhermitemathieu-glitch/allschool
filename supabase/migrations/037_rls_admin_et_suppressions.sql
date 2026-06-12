-- ─────────────────────────────────────────────────────────────────────────────
-- 037_rls_admin_et_suppressions.sql
--
-- CORRECTIF I2 — Policies RLS incomplètes :
--   - l'admin (backoffice) ne pouvait pas UPDATE/DELETE les fiches ecoles /
--     entreprises (les updates admin échouaient silencieusement) ;
--   - pas de policy DELETE sur entreprises / ecoles.
--
-- On ajoute des policies admin (app_metadata.role='admin', cf. migration 034)
-- couvrant toutes les opérations sur les tables métier, et les DELETE manquants.
--
-- Dépend de : 034 (public.is_admin()).
-- Rollback : voir 037_rls_admin_et_suppressions_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── entreprises ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "entreprises_admin_all" ON entreprises;
CREATE POLICY "entreprises_admin_all"
  ON entreprises FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "entreprise: delete propriétaire" ON entreprises;
CREATE POLICY "entreprise: delete propriétaire"
  ON entreprises FOR DELETE
  USING (auth.uid() = user_id);

-- ── ecoles ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ecoles_admin_all" ON ecoles;
CREATE POLICY "ecoles_admin_all"
  ON ecoles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ecoles: delete propriétaire" ON ecoles;
CREATE POLICY "ecoles: delete propriétaire"
  ON ecoles FOR DELETE
  USING (auth.uid() = user_id);

-- ── offres ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "offres_admin_all" ON offres;
CREATE POLICY "offres_admin_all"
  ON offres FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── formations ────────────────────────────────────────────────────────────────
-- L'admin gère le catalogue ; les snapshots LBA sont écrits via service_role.
DROP POLICY IF EXISTS "formations_admin_all" ON formations;
CREATE POLICY "formations_admin_all"
  ON formations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── ecole_apprentis : l'admin consulte/gère pour le backoffice ────────────────
DROP POLICY IF EXISTS "ecole_apprentis_admin_all" ON ecole_apprentis;
CREATE POLICY "ecole_apprentis_admin_all"
  ON ecole_apprentis FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
