-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de 036_storage_scoping.sql
-- Restaure les policies permissives d'origine pour `profiles` et retire celles
-- de `ecoles-media`. ⚠️ Réintroduit la possibilité d'écraser les fichiers d'autrui.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_insert ON storage.objects;
DROP POLICY IF EXISTS profiles_update ON storage.objects;
DROP POLICY IF EXISTS profiles_delete ON storage.objects;

CREATE POLICY profiles_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profiles');
CREATE POLICY profiles_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'profiles');
CREATE POLICY profiles_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS ecoles_media_select ON storage.objects;
DROP POLICY IF EXISTS ecoles_media_insert ON storage.objects;
DROP POLICY IF EXISTS ecoles_media_update ON storage.objects;
DROP POLICY IF EXISTS ecoles_media_delete ON storage.objects;
