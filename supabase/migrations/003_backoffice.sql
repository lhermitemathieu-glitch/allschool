-- ─────────────────────────────────────────────────────────────────────────────
-- 003_backoffice.sql
-- Ajustements pour l'import CSV admin et le journal des opérations
-- ─────────────────────────────────────────────────────────────────────────────

-- Rend user_id nullable dans ecoles et entreprises (pour imports CSV sans compte)
alter table ecoles      alter column user_id drop not null;
alter table entreprises alter column user_id drop not null;

-- Colonne source sur les tables principales
alter table ecoles      add column if not exists source text not null default 'signup';
alter table entreprises add column if not exists source text not null default 'signup';

-- ── candidats_import ──────────────────────────────────────────────────────────
-- Profils importés via CSV (pas de compte Supabase Auth associé)
create table if not exists candidats_import (
  id              uuid primary key default gen_random_uuid(),
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
  teletravail     boolean default false,
  import_log_id   uuid,
  created_at      timestamptz not null default now()
);

alter table candidats_import enable row level security;

-- Seul le service role (admin API) peut écrire — les admins connectés peuvent lire
create policy "candidats_import: lecture admin"
  on candidats_import for select
  using (
    (select auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- ── import_logs ───────────────────────────────────────────────────────────────
create table if not exists import_logs (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('apprentis', 'ecoles', 'entreprises')),
  filename     text,
  total        int  not null default 0,
  ok           int  not null default 0,
  warn         int  not null default 0,
  errors_count int  not null default 0,
  admin_id     uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table import_logs enable row level security;

create policy "import_logs: lecture admin"
  on import_logs for select
  using (
    (select auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Le service role insère via l'API route (pas de policy needed pour service role)
