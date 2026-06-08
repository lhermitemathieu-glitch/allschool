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
