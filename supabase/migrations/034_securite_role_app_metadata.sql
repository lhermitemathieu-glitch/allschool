-- ─────────────────────────────────────────────────────────────────────────────
-- 034_securite_role_app_metadata.sql
--
-- CORRECTIF SÉCURITÉ C1 — Escalade de privilège via user_metadata
--
-- Le rôle (candidat/entreprise/ecole/admin) était lu depuis user_metadata, qui est
-- MODIFIABLE par l'utilisateur lui-même (supabase.auth.updateUser({ data: { role } })).
-- N'importe qui pouvait donc se promouvoir admin.
--
-- Correctif : le rôle fait désormais autorité dans app_metadata (écrit uniquement
-- via la service_role, non modifiable côté client). On fournit :
--   1. une fonction helper auth_role() qui lit app_metadata.role
--   2. la migration des rôles existants user_metadata -> app_metadata
--   3. la mise à jour des policies RLS qui s'appuyaient sur user_metadata
--
-- ⚠️ À exécuter via la service_role (éditeur SQL Supabase ou supabase db push).
-- ⚠️ Après cette migration, toute création de compte doit écrire le rôle dans
--    app_metadata (voir note "Inscription" en bas).
--
-- Rollback : voir 034_securite_role_app_metadata_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Migrer le rôle existant user_metadata -> app_metadata ──────────────────
-- (Conserve user_metadata pour ne rien casser ; app_metadata devient la référence.)
UPDATE auth.users
SET raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', raw_user_meta_data ->> 'role')
WHERE raw_user_meta_data ? 'role'
  AND coalesce(raw_app_meta_data ->> 'role', '') IS DISTINCT FROM (raw_user_meta_data ->> 'role');

-- ── 2. Fonction helper : rôle effectif de l'utilisateur courant ───────────────
-- Lit app_metadata.role depuis le JWT. SECURITY INVOKER, STABLE.
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() ->> 'role')   -- fallback éventuel
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.auth_role() = 'admin';
$$;

-- ── 3. Remplacer les policies admin basées sur user_metadata ──────────────────
-- candidats_import
DROP POLICY IF EXISTS "candidats_import: lecture admin" ON candidats_import;
CREATE POLICY "candidats_import: lecture admin"
  ON candidats_import FOR SELECT
  USING (public.is_admin());

-- import_logs
DROP POLICY IF EXISTS "import_logs: lecture admin" ON import_logs;
CREATE POLICY "import_logs: lecture admin"
  ON import_logs FOR SELECT
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE INSCRIPTION (à appliquer côté code, hors SQL) :
-- supabase.auth.signUp({ options: { data: { role } } }) écrit dans user_metadata.
-- Le rôle n'est PLUS la source de vérité. Deux options :
--   (a) Provisionner le rôle dans app_metadata via une Edge Function / trigger
--       after-insert sur auth.users qui recopie user_metadata.role -> app_metadata.
--   (b) Garder un endpoint admin qui assigne le rôle via service_role.
-- Un trigger de synchronisation est fourni ci-dessous (option a, recommandée).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 4. Trigger de provisioning : copie role user_metadata -> app_metadata ─────
-- À la création d'un compte, recopie le rôle déclaré dans app_metadata.
-- (Le rôle déclaré reste une "demande" ; pour les comptes sensibles comme admin,
--  préférer une attribution manuelle. Ce trigger gère candidat/entreprise/ecole.)
CREATE OR REPLACE FUNCTION public.provision_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demande text := NEW.raw_user_meta_data ->> 'role';
BEGIN
  -- N'auto-provisionne jamais le rôle 'admin' (attribution manuelle uniquement).
  IF demande IN ('candidat', 'entreprise', 'ecole') THEN
    NEW.raw_app_meta_data :=
      coalesce(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', demande);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_provision_role ON auth.users;
CREATE TRIGGER on_auth_user_provision_role
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.provision_user_role();
