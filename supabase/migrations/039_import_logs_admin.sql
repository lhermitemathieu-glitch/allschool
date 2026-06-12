-- ─────────────────────────────────────────────────────────────────────────────
-- 039_import_logs_admin.sql
--
-- Le bouton "Vider les logs" du backoffice échouait en silence : la table
-- import_logs n'avait qu'une policy SELECT admin, aucune policy DELETE.
-- On donne à l'admin (app_metadata.role, cf. migration 034) tous les droits.
--
-- Dépend de : 034 (public.is_admin()).
-- Rollback : voir 039_import_logs_admin_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "import_logs_admin_all" ON import_logs;
CREATE POLICY "import_logs_admin_all"
  ON import_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
