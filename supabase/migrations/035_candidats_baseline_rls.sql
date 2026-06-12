-- ─────────────────────────────────────────────────────────────────────────────
-- 035_candidats_baseline_rls.sql
--
-- CORRECTIF C2 — La table `candidats` n'avait AUCUN CREATE TABLE versionné
-- (créée à la main dans le dashboard). Sa RLS n'était donc pas sous contrôle :
-- selon la policy réellement en place, email/téléphone de TOUS les candidats
-- (y compris profils privés) pouvaient être lus côté client (clé anon).
--
-- Cette migration est IDEMPOTENTE et NON DESTRUCTIVE : CREATE TABLE IF NOT EXISTS
-- + ADD COLUMN IF NOT EXISTS, sûre à exécuter sur la table existante. Elle pose
-- surtout une RLS stricte et versionnée.
--
-- Principe de la RLS :
--   - le candidat lit/écrit SA ligne ;
--   - l'admin (app_metadata.role='admin', cf. migration 034) accède à tout ;
--   - les autres ne voient QUE les profils publics (profil_public = true).
--     => les profils privés (email/téléphone inclus) deviennent invisibles ;
--        les profils publics restent visibles, ce qui est l'intention produit
--        (page CV publique /candidat/[id] générée par le candidat lui-même).
--   En complément, le code de recherche entreprise filtre profil_public
--   (défense en profondeur, cf. PanelEntreprise.jsx).
--
-- ⚠️ Vérifier le schéma réel avant exécution :
--    select column_name, data_type from information_schema.columns
--    where table_name = 'candidats';
--
-- Dépend de : 034 (fonction public.is_admin()).
-- Rollback : voir 035_candidats_baseline_rls_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Baseline de la table (no-op si elle existe déjà) ───────────────────────
CREATE TABLE IF NOT EXISTS candidats (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom        text,
  nom           text,
  ville         text,
  formation     text,
  disponibilite text,
  bio           text,
  passions      text[]  DEFAULT '{}',
  loisirs       text[]  DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Colonnes ajoutées au fil des migrations 011/013/014/015/024/025
-- (réaffirmées ici pour que la baseline reflète le schéma complet attendu).
ALTER TABLE candidats
  ADD COLUMN IF NOT EXISTS photo_url             text,
  ADD COLUMN IF NOT EXISTS profil_public         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS experiences           jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS competences_hard      text,
  ADD COLUMN IF NOT EXISTS competences_soft      text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niveau_etudes         text,
  ADD COLUMN IF NOT EXISTS langues               jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS linkedin_url          text,
  ADD COLUMN IF NOT EXISTS permis                boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispo_mois            smallint,
  ADD COLUMN IF NOT EXISTS dispo_annee           smallint,
  ADD COLUMN IF NOT EXISTS profil_en_pause       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profil_visible_ecoles boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS masquer_experiences   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pas_experience_pro    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email                 text,
  ADD COLUMN IF NOT EXISTS telephone             text,
  ADD COLUMN IF NOT EXISTS alternance_trouvee    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_apropos          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_competences_hard boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_soft_skills      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_langues          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_interets         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz NOT NULL DEFAULT now();

ALTER TABLE candidats ENABLE ROW LEVEL SECURITY;

-- updated_at automatique (réutilise set_updated_at() de la migration 009)
DROP TRIGGER IF EXISTS candidats_updated_at ON candidats;
CREATE TRIGGER candidats_updated_at
  BEFORE UPDATE ON candidats
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── 2. RLS stricte ────────────────────────────────────────────────────────────
-- Nettoyage des anciennes policies éventuelles (noms usuels).
DROP POLICY IF EXISTS "candidats: lecture publique"     ON candidats;
DROP POLICY IF EXISTS "candidats: select"               ON candidats;
DROP POLICY IF EXISTS "candidats: lecture proprietaire" ON candidats;
DROP POLICY IF EXISTS "candidats: insert"               ON candidats;
DROP POLICY IF EXISTS "candidats: update"               ON candidats;
DROP POLICY IF EXISTS "candidats_self_select"           ON candidats;
DROP POLICY IF EXISTS "candidats_self_insert"           ON candidats;
DROP POLICY IF EXISTS "candidats_self_update"           ON candidats;
DROP POLICY IF EXISTS "candidats_public_select"         ON candidats;
DROP POLICY IF EXISTS "candidats_admin_all"             ON candidats;

-- (a) Lecture : sa propre ligne, OU profil public, OU admin.
CREATE POLICY "candidats_public_select"
  ON candidats FOR SELECT
  USING (
    auth.uid() = id
    OR profil_public = true
    OR public.is_admin()
  );

-- (b) Le candidat crée / met à jour SA ligne.
CREATE POLICY "candidats_self_insert"
  ON candidats FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "candidats_self_update"
  ON candidats FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- (c) L'admin (backoffice) accède à tout, y compris update/delete.
CREATE POLICY "candidats_admin_all"
  ON candidats FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE CÔTÉ CODE :
--   - PanelEntreprise (recherche profils) doit filtrer profil_public=true et ne
--     plus afficher email/téléphone en liste (défense en profondeur).
--   - La page CV publique /candidat/[id] continue de fonctionner : elle ne lit
--     que des profils profil_public=true, désormais garanti par la RLS.
-- ─────────────────────────────────────────────────────────────────────────────
