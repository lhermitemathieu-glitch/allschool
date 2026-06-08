/**
 * Types d'offres / candidatures — source unique de vérité.
 * Utilisé dans PanelCandidatCandidatures et PanelCandidatOffres.
 */
export const TYPES = [
  {
    key:   'externe',
    label: 'Offre externe',
    icon:  'ti-world',
    hint:  'Indeed, WTJ, LinkedIn…',
    bg:    '#e0f2fe',
    color: '#0369a1',
  },
  {
    key:   'spontanee',
    label: 'Candidature spontanée',
    icon:  'ti-mail-forward',
    hint:  'Pas d\'offre disponible, je postule directement',
    bg:    '#fff7ed',
    color: '#c2410c',
  },
  {
    key:   'sourcee',
    label: 'Offre sourcée',
    icon:  'ti-search',
    hint:  'Offre trouvée via La Bonne Alternance',
    bg:    '#f0fdf4',
    color: '#15803d',
  },
  {
    key:   'prospection',
    label: 'Prospection',
    icon:  'ti-map-pin',
    hint:  'Démarche terrain du candidat',
    bg:    '#fdf4ff',
    color: '#7e22ce',
  },
  {
    key:   'allschool',
    label: 'Offre Allschool',
    icon:  'ti-rosette',
    hint:  'Offre publiée sur la plateforme',
    bg:    '#ede9fe',
    color: '#5b21b6',
  },
]

export function typeInfo(key) {
  return TYPES.find(t => t.key === key) || TYPES[0]
}

/**
 * Détermine le type d'une offre La Bonne Alternance selon sa source.
 * - France Travail (offres_emploi) → offre réelle → 'sourcee'
 * - LBA / LBB (entreprises) → candidature spontanée → 'spontanee'
 */
export function lbaTypeFromSource(source) {
  if (!source) return 'sourcee'
  return source === 'offres_emploi' ? 'sourcee' : 'spontanee'
}
