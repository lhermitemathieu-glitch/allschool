-- ─────────────────────────────────────────────────────────────────────────────
-- 001_entreprise.sql
-- Tables pour l'Espace Entreprise
-- À exécuter dans l'éditeur SQL de Supabase (ou via supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── entreprises ──────────────────────────────────────────────────────────────
create table if not exists entreprises (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  siret          text unique,
  raison_sociale text,
  secteur        text,
  adresse        text,
  ville          text,
  taille         text check (taille in ('tpe', 'pme', 'ge')),
  logo_url       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table entreprises enable row level security;

create policy "entreprise: lecture propriétaire"
  on entreprises for select
  using (auth.uid() = user_id);

create policy "entreprise: insert propriétaire"
  on entreprises for insert
  with check (auth.uid() = user_id);

create policy "entreprise: update propriétaire"
  on entreprises for update
  using (auth.uid() = user_id);

-- ── offres ────────────────────────────────────────────────────────────────────
create table if not exists offres (
  id             uuid primary key default gen_random_uuid(),
  entreprise_id  uuid not null references entreprises(id) on delete cascade,
  titre          text not null,
  niveau         text check (niveau in ('cap', 'bts', 'bach', 'master')),
  secteur        text,
  ville          text,
  description    text,
  statut         text not null default 'active' check (statut in ('active', 'inactive', 'pourvue')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table offres enable row level security;

-- Les candidats peuvent lire les offres actives
create policy "offres: lecture publique (actives)"
  on offres for select
  using (statut = 'active');

-- L'entreprise propriétaire lit toutes ses offres (y compris inactives)
create policy "offres: lecture propriétaire"
  on offres for select
  using (
    entreprise_id in (
      select id from entreprises where user_id = auth.uid()
    )
  );

create policy "offres: insert propriétaire"
  on offres for insert
  with check (
    entreprise_id in (
      select id from entreprises where user_id = auth.uid()
    )
  );

create policy "offres: update propriétaire"
  on offres for update
  using (
    entreprise_id in (
      select id from entreprises where user_id = auth.uid()
    )
  );

create policy "offres: delete propriétaire"
  on offres for delete
  using (
    entreprise_id in (
      select id from entreprises where user_id = auth.uid()
    )
  );

-- ── candidatures ─────────────────────────────────────────────────────────────
create table if not exists candidatures (
  id           uuid primary key default gen_random_uuid(),
  offre_id     uuid not null references offres(id) on delete cascade,
  candidat_id  uuid not null references auth.users(id) on delete cascade,
  statut       text not null default 'new' check (statut in ('new', 'vue', 'contact', 'refus')),
  message      text,
  created_at   timestamptz not null default now(),
  unique (offre_id, candidat_id)
);

alter table candidatures enable row level security;

-- Candidat voit ses propres candidatures
create policy "candidatures: lecture candidat"
  on candidatures for select
  using (auth.uid() = candidat_id);

create policy "candidatures: insert candidat"
  on candidatures for insert
  with check (auth.uid() = candidat_id);

-- Entreprise voit les candidatures sur ses offres
create policy "candidatures: lecture entreprise"
  on candidatures for select
  using (
    offre_id in (
      select o.id from offres o
      join entreprises e on e.id = o.entreprise_id
      where e.user_id = auth.uid()
    )
  );

create policy "candidatures: update entreprise"
  on candidatures for update
  using (
    offre_id in (
      select o.id from offres o
      join entreprises e on e.id = o.entreprise_id
      where e.user_id = auth.uid()
    )
  );

-- ── contacts_ecoles ──────────────────────────────────────────────────────────
create table if not exists contacts_ecoles (
  id             uuid primary key default gen_random_uuid(),
  entreprise_id  uuid not null references entreprises(id) on delete cascade,
  ecole_id       uuid references auth.users(id) on delete set null,
  nom_ecole      text,
  message        text,
  statut         text not null default 'envoye' check (statut in ('envoye', 'repondu', 'archive')),
  created_at     timestamptz not null default now()
);

alter table contacts_ecoles enable row level security;

create policy "contacts_ecoles: lecture propriétaire"
  on contacts_ecoles for select
  using (
    entreprise_id in (
      select id from entreprises where user_id = auth.uid()
    )
  );

create policy "contacts_ecoles: insert propriétaire"
  on contacts_ecoles for insert
  with check (
    entreprise_id in (
      select id from entreprises where user_id = auth.uid()
    )
  );
