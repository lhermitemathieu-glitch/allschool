-- Rollback de la migration 041 — Nettoyage des tables mortes
--
-- ⚠️ Ce rollback recrée UNIQUEMENT la STRUCTURE des trois tables (colonnes,
--    contraintes, RLS, policies), telle qu'elle existait avant la 041.
--    Les DONNÉES ne sont PAS restaurées (un DROP TABLE est irréversible côté
--    contenu). Pour les statuts/actions de formation, les données utiles ont de
--    toute façon été migrées vers candidat_candidatures en migration 040.

-- ── formation_statuts (cf. migration 012) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS formation_statuts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  statut       text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (candidat_id, formation_id)
);
ALTER TABLE formation_statuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidat_own_statuts" ON formation_statuts
  FOR ALL TO authenticated
  USING (candidat_id = auth.uid())
  WITH CHECK (candidat_id = auth.uid());

-- ── formation_actions (cf. migration 012) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS formation_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  texte        text NOT NULL,
  echeance     date,
  fait         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (candidat_id, formation_id)
);
ALTER TABLE formation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidat_own_actions" ON formation_actions
  FOR ALL TO authenticated
  USING (candidat_id = auth.uid())
  WITH CHECK (candidat_id = auth.uid());

-- ── candidats_import (cf. migrations 003 + 034 pour la policy) ────────────────
CREATE TABLE IF NOT EXISTS candidats_import (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             text,
  prenom          text,
  email           text,
  diplome         text,
  ville           text,
  telephone       text,
  date_naissance  date,
  ecole_rattachee text,
  disponibilite   text,
  secteur         text,
  teletravail     boolean DEFAULT false,
  import_log_id   uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE candidats_import ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidats_import: lecture admin"
  ON candidats_import FOR SELECT
  USING (public.is_admin());
