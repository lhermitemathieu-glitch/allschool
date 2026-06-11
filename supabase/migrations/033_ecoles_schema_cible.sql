-- ─────────────────────────────────────────────────────────────────────────────
-- 033_ecoles_schema_cible.sql
--
-- Schéma cible table ecoles :
--   - LBA = source de vérité pour données factuelles (geo, qualiopi, modalites)
--   - Supabase = enrichissement (site_web, description, logo, contact) + partenaires
--   - Ajout source, siret, email_contact
--   - Suppression ecole_actus
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Nouveaux champs ───────────────────────────────────────────────────────────

-- source : origine de la fiche
--   'lba'        → école identifiée via l'API LBA (matching UAI)
--   'allschool'  → ajoutée manuellement par l'équipe Allschool
--   'partenaire' → école ayant un compte et une fiche enrichie active
ALTER TABLE ecoles
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'allschool'
    CHECK (source IN ('lba', 'allschool', 'partenaire'));

-- siret : identifiant légal, fallback si pas d'UAI
ALTER TABLE ecoles
  ADD COLUMN IF NOT EXISTS siret text;

CREATE UNIQUE INDEX IF NOT EXISTS ecoles_siret_idx ON ecoles(siret) WHERE siret IS NOT NULL;

-- email_contact : email commercial Allschool (différent de l'email académique LBA)
ALTER TABLE ecoles
  ADD COLUMN IF NOT EXISTS email_contact text;

-- region et academie : manquaient, utiles pour filtres même si LBA les fournit
ALTER TABLE ecoles
  ADD COLUMN IF NOT EXISTS region   text,
  ADD COLUMN IF NOT EXISTS academie text;

-- ── Suppression ecole_actus ───────────────────────────────────────────────────
DROP TABLE IF EXISTS ecole_actus CASCADE;

-- ── Index complémentaires ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ecoles_source_idx  ON ecoles(source);
CREATE INDEX IF NOT EXISTS ecoles_region_idx  ON ecoles(region) WHERE region IS NOT NULL;
