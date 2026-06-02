-- ─────────────────────────────────────────────────────────────────────────────
-- 004_catalogue.sql
-- Étend ecoles et formations pour le catalogue national d'apprentissage
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ecoles : nouvelles colonnes ───────────────────────────────────────────────
alter table ecoles
  alter column user_id drop not null;

alter table ecoles
  add column if not exists uai            text unique,
  add column if not exists adresse        text,
  add column if not exists code_postal    text,
  add column if not exists telephone      text,
  add column if not exists email          text,
  add column if not exists academie       text,
  add column if not exists region         text,
  add column if not exists raison_sociale text,
  add column if not exists source         text default 'manuel';

-- ── formations : nouvelles colonnes ──────────────────────────────────────────
alter table formations
  add column if not exists diplome            text,
  add column if not exists url_onisep         text,
  add column if not exists localite_formation text;

-- Index pour la recherche
create index if not exists idx_ecoles_uai      on ecoles(uai);
create index if not exists idx_ecoles_region   on ecoles(region);
create index if not exists idx_ecoles_ville    on ecoles(ville);
create index if not exists idx_formations_diplome on formations(diplome);
