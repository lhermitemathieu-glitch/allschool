-- Nouveaux champs sur la table offres
alter table offres add column if not exists type_contrat       text[]  default '{}';
alter table offres add column if not exists competences        text;
alter table offres add column if not exists missions           text;
alter table offres add column if not exists recherche          text;
alter table offres add column if not exists date_prise_poste   date;
alter table offres add column if not exists preference_ecole   boolean default false;
