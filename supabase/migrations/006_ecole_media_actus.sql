-- Colonnes media + initiatives sur ecoles
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS cover_url  text;
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS initiatives text[] DEFAULT '{}';

-- Table actualités école
CREATE TABLE IF NOT EXISTS ecole_actus (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id   uuid NOT NULL REFERENCES ecoles(id) ON DELETE CASCADE,
  titre      text NOT NULL,
  contenu    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les requêtes par école
CREATE INDEX IF NOT EXISTS ecole_actus_ecole_id_idx ON ecole_actus(ecole_id);
