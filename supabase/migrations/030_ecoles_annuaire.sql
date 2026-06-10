-- Transforme la table ecoles en référentiel annuaire :
--   - user_id devient nullable (écoles sans compte Allschool)
--   - Ajout adresse, code_postal, uai

ALTER TABLE ecoles
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS adresse    text,
  ADD COLUMN IF NOT EXISTS code_postal text,
  ADD COLUMN IF NOT EXISTS uai        text UNIQUE;

CREATE INDEX IF NOT EXISTS ecoles_uai_idx ON ecoles(uai) WHERE uai IS NOT NULL;
