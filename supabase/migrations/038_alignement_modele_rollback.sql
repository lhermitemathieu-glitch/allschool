-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de 038_alignement_modele.sql
-- ⚠️ Les tables mortes supprimées ne sont PAS restaurées (elles étaient vides
--    d'usage). Recréation a minima de leur structure d'origine si nécessaire.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. offres.niveau : revenir au CHECK sans 'bac'
ALTER TABLE offres DROP CONSTRAINT IF EXISTS offres_niveau_check;
ALTER TABLE offres
  ADD CONSTRAINT offres_niveau_check
  CHECK (niveau IN ('cap', 'bts', 'bach', 'master'));

-- 2. formations.updated_at
DROP TRIGGER IF EXISTS formations_updated_at ON formations;
ALTER TABLE formations DROP COLUMN IF EXISTS updated_at;

-- 3. Recréation structurelle des tables mortes (si vraiment nécessaire)
CREATE TABLE IF NOT EXISTS candidatures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id    uuid NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  candidat_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut      text NOT NULL DEFAULT 'new' CHECK (statut IN ('new','vue','contact','refus')),
  message     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offre_id, candidat_id)
);
ALTER TABLE candidatures ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS contacts_ecoles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  ecole_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nom_ecole     text,
  message       text,
  statut        text NOT NULL DEFAULT 'envoye' CHECK (statut IN ('envoye','repondu','archive')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contacts_ecoles ENABLE ROW LEVEL SECURITY;
