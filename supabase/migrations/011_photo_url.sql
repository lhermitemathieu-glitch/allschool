-- Add photo_url to candidats and entreprises
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for profile photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profiles', 'profiles', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profiles_insert'
  ) THEN
    CREATE POLICY profiles_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profiles');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profiles_select'
  ) THEN
    CREATE POLICY profiles_select ON storage.objects FOR SELECT TO public USING (bucket_id = 'profiles');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profiles_update'
  ) THEN
    CREATE POLICY profiles_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profiles');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profiles_delete'
  ) THEN
    CREATE POLICY profiles_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profiles');
  END IF;
END $$;
