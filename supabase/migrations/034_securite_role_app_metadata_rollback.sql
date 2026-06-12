-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de 034_securite_role_app_metadata.sql
-- Restaure les policies admin basées sur user_metadata et retire le trigger.
-- ⚠️ Réintroduit la faille d'escalade de privilège — à n'utiliser qu'en secours.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_provision_role ON auth.users;
DROP FUNCTION IF EXISTS public.provision_user_role();

DROP POLICY IF EXISTS "candidats_import: lecture admin" ON candidats_import;
CREATE POLICY "candidats_import: lecture admin"
  ON candidats_import FOR SELECT
  USING ((select auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

DROP POLICY IF EXISTS "import_logs: lecture admin" ON import_logs;
CREATE POLICY "import_logs: lecture admin"
  ON import_logs FOR SELECT
  USING ((select auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.auth_role();

-- Note : on ne retire pas le rôle copié dans app_metadata (inoffensif et réutilisable).
