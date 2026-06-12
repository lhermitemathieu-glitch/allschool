-- ─────────────────────────────────────────────────────────────────────────────
-- 036_storage_scoping.sql
--
-- CORRECTIF C3 — Le bucket storage `profiles` autorisait tout utilisateur
-- authentifié à INSERT/UPDATE/DELETE n'importe quel objet (with check sur le seul
-- bucket_id). Un candidat pouvait écraser/supprimer la photo d'un autre.
--
-- Convention de chemin utilisée par le code :
--   profiles : "candidats/<uid>/photo.ext"  et  "entreprises/<entreprise_id>/photo.ext"
--   ecoles-media : "<ecole_id>/cover.ext" | "<ecole_id>/avatar.ext"
--
-- On restreint l'écriture au dossier correspondant à l'utilisateur. Pour
-- `candidats/<uid>/...` on vérifie que le 2e segment = auth.uid(). Pour les
-- entreprises/écoles, l'id du dossier n'est pas l'uid : on borne l'écriture aux
-- propriétaires via sous-requête.
--
-- Rollback : voir 036_storage_scoping_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Bucket profiles : (re)création des policies scoping ───────────────────────
DROP POLICY IF EXISTS profiles_insert ON storage.objects;
DROP POLICY IF EXISTS profiles_update ON storage.objects;
DROP POLICY IF EXISTS profiles_delete ON storage.objects;
-- La lecture publique reste (bucket public) :
DROP POLICY IF EXISTS profiles_select ON storage.objects;
CREATE POLICY profiles_select ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'profiles');

-- Écriture candidat : profiles/candidats/<uid>/...
-- Écriture entreprise : profiles/entreprises/<entreprise_id>/... (id appartenant à l'user)
CREATE POLICY profiles_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profiles' AND (
      ((storage.foldername(name))[1] = 'candidats'
        AND (storage.foldername(name))[2] = auth.uid()::text)
      OR
      ((storage.foldername(name))[1] = 'entreprises'
        AND (storage.foldername(name))[2] IN (
          SELECT id::text FROM entreprises WHERE user_id = auth.uid()
        ))
      OR public.is_admin()
    )
  );

CREATE POLICY profiles_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profiles' AND (
      ((storage.foldername(name))[1] = 'candidats'
        AND (storage.foldername(name))[2] = auth.uid()::text)
      OR
      ((storage.foldername(name))[1] = 'entreprises'
        AND (storage.foldername(name))[2] IN (
          SELECT id::text FROM entreprises WHERE user_id = auth.uid()
        ))
      OR public.is_admin()
    )
  );

CREATE POLICY profiles_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profiles' AND (
      ((storage.foldername(name))[1] = 'candidats'
        AND (storage.foldername(name))[2] = auth.uid()::text)
      OR
      ((storage.foldername(name))[1] = 'entreprises'
        AND (storage.foldername(name))[2] IN (
          SELECT id::text FROM entreprises WHERE user_id = auth.uid()
        ))
      OR public.is_admin()
    )
  );

-- ── Bucket ecoles-media : versionné ici (créé à la main jusqu'ici) ────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ecoles-media', 'ecoles-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ecoles_media_select ON storage.objects;
DROP POLICY IF EXISTS ecoles_media_insert ON storage.objects;
DROP POLICY IF EXISTS ecoles_media_update ON storage.objects;
DROP POLICY IF EXISTS ecoles_media_delete ON storage.objects;

CREATE POLICY ecoles_media_select ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'ecoles-media');

-- Écriture : ecoles-media/<ecole_id>/...  où l'école appartient à l'user (ou admin)
CREATE POLICY ecoles_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ecoles-media' AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM ecoles WHERE user_id = auth.uid()
      )
      OR public.is_admin()
    )
  );

CREATE POLICY ecoles_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ecoles-media' AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM ecoles WHERE user_id = auth.uid()
      )
      OR public.is_admin()
    )
  );

CREATE POLICY ecoles_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ecoles-media' AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM ecoles WHERE user_id = auth.uid()
      )
      OR public.is_admin()
    )
  );
