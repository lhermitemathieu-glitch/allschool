-- Suivi des écoles par les candidats

-- 1. Ajouter ecole_id à candidat_candidatures (nullable, pour les candidatures liées à une école)
ALTER TABLE candidat_candidatures
  ADD COLUMN IF NOT EXISTS ecole_id uuid REFERENCES ecoles(id) ON DELETE SET NULL;

-- 2. Ajouter le type 'ecole' dans la contrainte CHECK
ALTER TABLE candidat_candidatures DROP CONSTRAINT IF EXISTS candidat_candidatures_type_check;
ALTER TABLE candidat_candidatures
  ADD CONSTRAINT candidat_candidatures_type_check
  CHECK (type IN ('allschool', 'externe', 'spontanee', 'prospection', 'sourcee', 'ecole'));

-- 3. Table des écoles masquées ("ne plus voir")
CREATE TABLE IF NOT EXISTS candidat_ecoles_cachees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ecole_id    uuid NOT NULL REFERENCES ecoles(id) ON DELETE CASCADE,
  ecole_data  jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidat_id, ecole_id)
);

ALTER TABLE candidat_ecoles_cachees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidat voit ses écoles cachées"
  ON candidat_ecoles_cachees FOR SELECT
  USING (auth.uid() = candidat_id);

CREATE POLICY "candidat insère ses écoles cachées"
  ON candidat_ecoles_cachees FOR INSERT
  WITH CHECK (auth.uid() = candidat_id);

CREATE POLICY "candidat supprime ses écoles cachées"
  ON candidat_ecoles_cachees FOR DELETE
  USING (auth.uid() = candidat_id);
