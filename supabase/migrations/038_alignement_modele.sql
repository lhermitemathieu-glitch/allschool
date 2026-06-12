-- ─────────────────────────────────────────────────────────────────────────────
-- 038_alignement_modele.sql
--
-- ALIGNEMENT DU MODÈLE (AUDIT §Modèle / §Cohérence) :
--   1. offres.niveau : ajouter 'bac' (le formulaire entreprise le propose, mais
--      le CHECK le rejetait -> dépôt d'offre niveau Bac Pro impossible).
--   2. formations.updated_at : colonne manquante alors que l'upsert sur lba_id
--      rafraîchit le snapshot sans horodatage.
--   3. Suppression des tables mortes `candidatures` et `contacts_ecoles`
--      (aucune référence dans le code ; contacts_ecoles avait en plus une FK
--      erronée ecole_id -> auth.users).
--
-- Rollback : voir 038_alignement_modele_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. offres.niveau : aligner sur lib/niveaux.js (ajout 'bac') ───────────────
ALTER TABLE offres DROP CONSTRAINT IF EXISTS offres_niveau_check;
ALTER TABLE offres
  ADD CONSTRAINT offres_niveau_check
  CHECK (niveau IN ('cap', 'bac', 'bts', 'bach', 'master'));

-- ── 2. formations.updated_at ──────────────────────────────────────────────────
ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS formations_updated_at ON formations;
CREATE TRIGGER formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── 3. Suppression des tables mortes ──────────────────────────────────────────
-- `candidatures` (offres Allschool) : remplacée par candidat_candidatures.
DROP TABLE IF EXISTS candidatures CASCADE;
-- `contacts_ecoles` : jamais utilisée, FK ecole_id -> auth.users erronée.
DROP TABLE IF EXISTS contacts_ecoles CASCADE;
