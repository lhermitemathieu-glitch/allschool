-- Suivi des formations par les candidats

-- 1. Ajouter formation_id à candidat_candidatures
ALTER TABLE candidat_candidatures
  ADD COLUMN IF NOT EXISTS formation_id uuid REFERENCES formations(id) ON DELETE SET NULL;

-- 2. Ajouter le type 'formation' et supprimer 'ecole' (non utilisé en prod)
ALTER TABLE candidat_candidatures DROP CONSTRAINT IF EXISTS candidat_candidatures_type_check;
ALTER TABLE candidat_candidatures
  ADD CONSTRAINT candidat_candidatures_type_check
  CHECK (type IN ('allschool', 'externe', 'spontanee', 'prospection', 'sourcee', 'ecole', 'formation'));

-- 3. Table des formations masquées ("ne plus voir")
CREATE TABLE IF NOT EXISTS candidat_formations_cachees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  formation_data jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidat_id, formation_id)
);

ALTER TABLE candidat_formations_cachees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidat voit ses formations cachées"
  ON candidat_formations_cachees FOR SELECT
  USING (auth.uid() = candidat_id);

CREATE POLICY "candidat insère ses formations cachées"
  ON candidat_formations_cachees FOR INSERT
  WITH CHECK (auth.uid() = candidat_id);

CREATE POLICY "candidat supprime ses formations cachées"
  ON candidat_formations_cachees FOR DELETE
  USING (auth.uid() = candidat_id);
