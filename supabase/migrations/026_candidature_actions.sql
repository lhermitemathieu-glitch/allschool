CREATE TABLE IF NOT EXISTS candidature_actions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidature_id   uuid NOT NULL REFERENCES candidat_candidatures(id) ON DELETE CASCADE,
  texte            text NOT NULL,
  echeance         date,
  fait             boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (candidat_id, candidature_id)
);

ALTER TABLE candidature_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidat_own_candidature_actions" ON candidature_actions
  FOR ALL TO authenticated
  USING (candidat_id = auth.uid())
  WITH CHECK (candidat_id = auth.uid());
