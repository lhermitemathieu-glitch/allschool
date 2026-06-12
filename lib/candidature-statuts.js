/**
 * Statuts du pipeline de candidature — source unique de vérité.
 *
 * Utilisé partout où un suivi est affiché : Mes candidatures (offres ET
 * formations) et la fiche formation. Remplace l'ancien double système
 * (formation_statuts avait sa propre liste de 6 statuts, cf. AUDIT §m3).
 */
export const STATUTS_CANDIDATURE = [
  { key: 'a_faire',   label: 'À faire',             icon: 'ti-clipboard', color: '#0369a1',       bg: '#e0f2fe' },
  { key: 'envoyee',   label: 'Candidature envoyée', icon: 'ti-send',      color: 'var(--teal)',   bg: 'var(--teal-soft)' },
  { key: 'entretien', label: 'Entretien',           icon: 'ti-users',     color: 'var(--accent)', bg: '#fff3e0' },
  { key: 'admis',     label: 'Admis',               icon: 'ti-check',     color: '#15803d',       bg: '#dcfce7' },
  { key: 'archive',   label: 'Archivé',             icon: 'ti-archive',   color: '#9e9e9e',       bg: '#f5f5f5' },
]

export function statutInfo(key) {
  return STATUTS_CANDIDATURE.find(s => s.key === key) || STATUTS_CANDIDATURE[0]
}
