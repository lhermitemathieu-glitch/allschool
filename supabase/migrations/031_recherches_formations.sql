CREATE TABLE IF NOT EXISTS candidat_recherches_formations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         text NOT NULL,
  filtres     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE candidat_recherches_formations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidat voit ses recherches"
  ON candidat_recherches_formations FOR SELECT
  USING (auth.uid() = candidat_id);

CREATE POLICY "candidat crée ses recherches"
  ON candidat_recherches_formations FOR INSERT
  WITH CHECK (auth.uid() = candidat_id);

CREATE POLICY "candidat supprime ses recherches"
  ON candidat_recherches_formations FOR DELETE
  USING (auth.uid() = candidat_id);
