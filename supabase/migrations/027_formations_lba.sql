-- Ajoute la source (allschool | lba) et l'identifiant LBA sur les formations
ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'allschool',
  ADD COLUMN IF NOT EXISTS lba_id text,
  ALTER COLUMN ecole_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS formations_lba_id_idx
  ON formations(lba_id) WHERE lba_id IS NOT NULL;
