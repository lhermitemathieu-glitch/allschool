/**
 * Niveaux de formation pour les offres Allschool.
 * Alignés sur la nomenclature La Bonne Alternance (niveaux européens).
 * Source unique de vérité — importer depuis ici dans tous les composants.
 */
export const NIVEAUX = [
  { key: 'cap',    label: 'CAP / BEP',          european: 3 },
  { key: 'bac',    label: 'Bac Pro / BP',        european: 4 },
  { key: 'bts',    label: 'BTS / BUT',           european: 5 },
  { key: 'bach',   label: 'Bachelor / Licence',  european: 6 },
  { key: 'master', label: 'Master',              european: 7 },
]

/** Objet clé → label, pratique pour l'affichage rapide */
export const NIVEAUX_MAP = Object.fromEntries(NIVEAUX.map(n => [n.key, n.label]))

/** Retourne le label d'un niveau, ou la valeur brute si inconnue */
export function niveauLabel(key) {
  return NIVEAUX_MAP[key] || key || ''
}

/**
 * Convertit un niveau européen LBA (3-7) vers notre clé interne.
 * Retourne null si pas de correspondance.
 */
export function lbaNiveauToKey(european) {
  const n = NIVEAUX.find(x => x.european === Number(european))
  return n?.key || null
}

/**
 * Labels d'affichage des badges de niveau (toutes les clés du CHECK
 * formations_niveau_check). Version courte pour les listes/cartes,
 * version longue pour la fiche formation et les filtres.
 */
export const NIVEAU_LABEL_COURT = {
  cap: 'CAP', bac: 'Bac Pro', bts: 'BTS', bts_agri: 'BTS Agricole',
  deust: 'DEUST', afpa3: 'Niv 3 – AFPA', niv3: 'Niv 3 – Autre',
  bach: 'Bachelor', master: 'Master', autre: 'Autre',
}

export const NIVEAU_LABEL_LONG = {
  ...NIVEAU_LABEL_COURT,
  bach: 'Bachelor / Licence', master: 'Master / Ingénieur',
}

/** Couleurs des badges de niveau — palette unique pour tous les écrans. */
export const NIVEAU_COULEURS = {
  cap:      { bg: '#fef9c3', color: '#854d0e' },
  bac:      { bg: '#ffedd5', color: '#9a3412' },
  bts:      { bg: '#e0f2fe', color: '#0369a1' },
  bts_agri: { bg: '#d1fae5', color: '#065f46' },
  deust:    { bg: '#ede9fe', color: '#5b21b6' },
  afpa3:    { bg: '#fce7f3', color: '#9d174d' },
  niv3:     { bg: '#f1f5f9', color: '#475569' },
  bach:     { bg: '#dcfce7', color: '#166534' },
  master:   { bg: '#fce7f3', color: '#9d174d' },
  autre:    { bg: '#ede9fe', color: '#7c3aed' },
}

/** Style prêt à spreader dans un badge (ex: <span style={{ ...niveauStyle(f.niveau) }}>). */
export function niveauStyle(key) {
  const c = NIVEAU_COULEURS[key] || NIVEAU_COULEURS.autre
  return { background: c.bg, color: c.color }
}
