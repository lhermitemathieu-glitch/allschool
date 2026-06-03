-- ── candidat_candidatures ─────────────────────────────────────────────────────
-- Tracker de candidatures alternance toutes sources confondues
create table if not exists candidat_candidatures (
  id              uuid primary key default gen_random_uuid(),
  candidat_id     uuid not null references auth.users(id) on delete cascade,
  type            text not null default 'externe' check (type in ('allschool', 'externe', 'spontanee', 'physique')),
  nom_entreprise  text not null,
  poste           text,
  url             text,
  statut          text not null default 'enregistre' check (statut in ('enregistre', 'envoyee', 'entretien', 'archive')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table candidat_candidatures enable row level security;

create policy "candidat_candidatures: lecture"
  on candidat_candidatures for select
  using (auth.uid() = candidat_id);

create policy "candidat_candidatures: insert"
  on candidat_candidatures for insert
  with check (auth.uid() = candidat_id);

create policy "candidat_candidatures: update"
  on candidat_candidatures for update
  using (auth.uid() = candidat_id);

create policy "candidat_candidatures: delete"
  on candidat_candidatures for delete
  using (auth.uid() = candidat_id);

-- Mise à jour automatique de updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger candidat_candidatures_updated_at
  before update on candidat_candidatures
  for each row execute procedure set_updated_at();
