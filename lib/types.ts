/**
 * Types des entités principales Allschool — source unique de vérité.
 *
 * Le code applicatif est historiquement en JS/JSX : ces types servent de
 * documentation contractuelle et peuvent être consommés via JSDoc
 * (`/** @type {import('@/lib/types').Candidat} *​/`) ou lors de la migration
 * progressive des fichiers vers TypeScript.
 *
 * Référence : MODELE_DONNEES.md. À terme, remplacer/compléter par les types
 * générés via `supabase gen types typescript`.
 */

export type UUID = string;

/** Rôle applicatif (autorité = app_metadata.role, cf. migration 034). */
export type Role = 'candidat' | 'entreprise' | 'ecole' | 'admin';

/** Niveaux de diplôme (clés internes, cf. lib/niveaux.js). */
export type NiveauOffre = 'cap' | 'bac' | 'bts' | 'bach' | 'master';
export type NiveauFormation =
  | 'cap' | 'bac' | 'bts' | 'bts_agri' | 'afpa3'
  | 'deust' | 'niv3' | 'bach' | 'master' | 'autre';

export type Modalite = 'presentiel' | 'distanciel' | 'hybride';
export type TailleEntreprise = 'tpe' | 'pme' | 'ge';

/* ─── Candidat ──────────────────────────────────────────────────────────── */

export interface Experience {
  id: number | string;
  entreprise: string;
  poste: string;
  contrat?: string;
  ville?: string;
  mois_debut?: number | '';
  annee_debut?: number | '';
  mois_fin?: number | '';
  annee_fin?: number | '';
  en_cours?: boolean;
  missions?: string[];
}

export interface Langue {
  id: number | string;
  langue: string;
  niveau: string;
}

export interface Candidat {
  /** = auth.users.id */
  id: UUID;
  prenom: string | null;
  nom: string | null;
  ville: string | null;
  formation: string | null;
  disponibilite: string | null;
  bio: string | null;
  passions: string[];
  loisirs: string[];
  photo_url: string | null;
  /** Visible par les entreprises */
  profil_public: boolean;
  profil_visible_ecoles: boolean;
  profil_en_pause: boolean;
  experiences: Experience[];
  competences_hard: string | null;
  competences_soft: string[];
  niveau_etudes: string | null;
  langues: Langue[];
  linkedin_url: string | null;
  permis: boolean;
  dispo_mois: number | null;
  dispo_annee: number | null;
  masquer_experiences: boolean;
  pas_experience_pro: boolean;
  email: string | null;
  telephone: string | null;
  alternance_trouvee: boolean;
  cv_masquer_apropos: boolean;
  cv_masquer_competences_hard: boolean;
  cv_masquer_soft_skills: boolean;
  cv_masquer_langues: boolean;
  cv_masquer_interets: boolean;
  created_at: string;
  updated_at: string;
}

/* ─── Entreprise & Offre ────────────────────────────────────────────────── */

export interface Entreprise {
  id: UUID;
  user_id: UUID | null;
  siret: string | null;
  raison_sociale: string | null;
  secteur: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  taille: TailleEntreprise | null;
  photo_url: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export type StatutOffre = 'active' | 'inactive' | 'pourvue' | 'archive';
export type TypeOffre = 'poste' | 'ecole_entreprise' | 'campagne';

export interface Offre {
  id: UUID;
  entreprise_id: UUID;
  titre: string;
  niveau: NiveauOffre | null;
  secteur: string | null;
  ville: string | null;
  description: string | null;
  statut: StatutOffre;
  type_offre: TypeOffre | null;
  type_contrat: string[];
  competences: string | null;
  missions: string | null;
  recherche: string | null;
  soft_skills: string[];
  email_contact: string | null;
  telephone_contact: string | null;
  url_candidature: string | null;
  date_prise_poste: string | null;
  preference_ecole: boolean;
  created_at: string;
  updated_at: string;
}

/* ─── École & Formation ─────────────────────────────────────────────────── */

export type SourceEcole = 'lba' | 'allschool' | 'partenaire';

export interface Ecole {
  id: UUID;
  user_id: UUID | null;
  nom: string | null;
  raison_sociale: string | null;
  type_ecole: string | null;
  uai: string | null;
  siret: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  region: string | null;
  academie: string | null;
  latitude: number | null;
  longitude: number | null;
  nb_etudiants: number | null;
  description: string | null;
  site_web: string | null;
  linkedin: string | null;
  email: string | null;
  telephone: string | null;
  email_contact: string | null;
  qualiopi: boolean;
  cover_url: string | null;
  avatar_url: string | null;
  modalites: Modalite[];
  secteurs: string[];
  initiatives: string[];
  publiee: boolean;
  source: SourceEcole;
  created_at: string;
  updated_at: string;
}

export type SourceFormation = 'allschool' | 'lba';

export interface Formation {
  id: UUID;
  ecole_id: UUID | null;
  nom: string;
  niveau: NiveauFormation | null;
  diplome: string | null;
  nb_apprentis: number | null;
  taux_presentation: number | null;
  taux_reussite: number | null;
  modalite: Modalite | null;
  url_onisep: string | null;
  localite_formation: string | null;
  source: SourceFormation;
  lba_id: string | null;
  /** Snapshot brut de l'objet LBA normalisé (cf. FormationLBA) */
  lba_data: FormationLBA | null;
  created_at: string;
  updated_at: string;
}

/* ─── Candidature (tracker candidat) ────────────────────────────────────── */

export type TypeCandidature =
  | 'allschool' | 'externe' | 'spontanee' | 'prospection'
  | 'sourcee' | 'ecole' | 'formation';
export type StatutCandidature = 'a_faire' | 'envoyee' | 'entretien' | 'admis' | 'archive';

export interface CandidatCandidature {
  id: UUID;
  candidat_id: UUID;
  type: TypeCandidature;
  nom_entreprise: string;
  poste: string | null;
  url: string | null;
  notes: string | null;
  statut: StatutCandidature;
  ecole_id: UUID | null;
  formation_id: UUID | null;
  created_at: string;
  updated_at: string;
}

/* ─── Objets implicites (non persistés tels quels) ──────────────────────── */

/** Formation normalisée renvoyée par l'API /api/formations-lba (cf. normalizeFormation). */
export interface FormationLBA {
  lba_id: string | null;
  nom: string;
  ecole_nom: string;
  uai: string | null;
  ecole_siret: string | null;
  ecole_email: string | null;
  ecole_qualiopi: boolean;
  ville: string;
  region: string;
  adresse: string;
  departement: string;
  academie: string;
  niveau: NiveauFormation | null;
  diplome_label: string | null;
  url_onisep: string | null;
  rncp: string | null;
  cfd: string | null;
  lat: number | null;
  lng: number | null;
  sessions: { debut: string; fin?: string; capacite?: number | null }[];
  prochaine_rentree: string | null;
  duree_annees: number | null;
  entierement_distance: boolean;
  contenu: string | null;
  objectif: string | null;
  ecole_id: UUID | null;
  ecole_site_web: string | null;
  ecole_adresse: string | null;
  ecole_cp: string | null;
}

/** Offre normalisée renvoyée par l'API /api/alternance (cf. normalizeJob). */
export interface OffreLBA {
  id: string | null;
  source: string;
  tag: 'sourcee' | 'spontanee';
  titre: string;
  entreprise: string;
  ville: string;
  contrat: string;
  description: string;
  url: string | null;
  niveau: string;
  date_creation: string | null;
}
