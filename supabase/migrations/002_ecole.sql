-- ─────────────────────────────────────────────────────────────────────────────
-- 002_ecole.sql
-- Tables pour l'Espace École
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ecoles ───────────────────────────────────────────────────────────────────
create table if not exists ecoles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nom           text,
  ville         text,
  type_ecole    text,                        -- ex: "CFA public", "École privée"
  nb_etudiants  int,
  description   text,
  site_web      text,
  linkedin      text,
  qualiopi      boolean default false,
  logo_url      text,
  cover_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table ecoles enable row level security;

-- Toutes les fiches écoles sont lisibles publiquement (candidats, entreprises)
create policy "ecoles: lecture publique"
  on ecoles for select using (true);

create policy "ecoles: insert propriétaire"
  on ecoles for insert
  with check (auth.uid() = user_id);

create policy "ecoles: update propriétaire"
  on ecoles for update
  using (auth.uid() = user_id);

-- ── formations ───────────────────────────────────────────────────────────────
create table if not exists formations (
  id                uuid primary key default gen_random_uuid(),
  ecole_id          uuid not null references ecoles(id) on delete cascade,
  nom               text not null,
  niveau            text check (niveau in ('cap', 'bts', 'bach', 'master', 'autre')),
  nb_apprentis      int default 0,
  taux_presentation int,                    -- pourcentage ex: 95
  taux_reussite     int,                    -- pourcentage ex: 91
  created_at        timestamptz not null default now()
);

alter table formations enable row level security;

create policy "formations: lecture publique"
  on formations for select using (true);

create policy "formations: insert propriétaire"
  on formations for insert
  with check (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

create policy "formations: update propriétaire"
  on formations for update
  using (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

create policy "formations: delete propriétaire"
  on formations for delete
  using (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

-- ── evenements ───────────────────────────────────────────────────────────────
create table if not exists evenements (
  id         uuid primary key default gen_random_uuid(),
  ecole_id   uuid not null references ecoles(id) on delete cascade,
  titre      text not null,
  date_event date not null,
  lieu       text,
  meta       text,
  created_at timestamptz not null default now()
);

alter table evenements enable row level security;

create policy "evenements: lecture publique"
  on evenements for select using (true);

create policy "evenements: insert propriétaire"
  on evenements for insert
  with check (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

create policy "evenements: delete propriétaire"
  on evenements for delete
  using (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

-- ── ecole_apprentis ──────────────────────────────────────────────────────────
-- Lien entre une école et les candidats qu'elle rattache à son espace
create table if not exists ecole_apprentis (
  id           uuid primary key default gen_random_uuid(),
  ecole_id     uuid not null references ecoles(id) on delete cascade,
  candidat_id  uuid not null references auth.users(id) on delete cascade,
  statut       text not null default 'cherche' check (statut in ('cherche', 'signe')),
  top_profil   boolean default false,
  created_at   timestamptz not null default now(),
  unique (ecole_id, candidat_id)
);

alter table ecole_apprentis enable row level security;

-- L'école lit tous ses apprentis
create policy "ecole_apprentis: lecture propriétaire"
  on ecole_apprentis for select
  using (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

create policy "ecole_apprentis: insert propriétaire"
  on ecole_apprentis for insert
  with check (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

create policy "ecole_apprentis: update propriétaire"
  on ecole_apprentis for update
  using (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

create policy "ecole_apprentis: delete propriétaire"
  on ecole_apprentis for delete
  using (
    ecole_id in (select id from ecoles where user_id = auth.uid())
  );

-- Le candidat voit ses propres rattachements
create policy "ecole_apprentis: lecture candidat"
  on ecole_apprentis for select
  using (auth.uid() = candidat_id);
