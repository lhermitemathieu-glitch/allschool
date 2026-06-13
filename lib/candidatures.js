/**
 * Ajout de candidature — source unique de vérité du payload `candidat_candidatures`.
 *
 * Avant, l'insertion était dupliquée dans 4 composants (fiche/drawer formation,
 * recherche formations, recherche offres, Mes candidatures) avec des valeurs par
 * défaut qui divergeaient (statut, notes, type…). Tout passe désormais par ce
 * module pour garantir des lignes cohérentes et valides vis-à-vis des CHECK.
 *
 * Rappel schéma (cf. migrations 009→040) :
 *   - statut : la colonne a encore le DEFAULT 'enregistre' (obsolète), rejeté par
 *     le CHECK -> il FAUT toujours fournir un statut valide. D'où STATUT_INITIAL.
 *   - type   : DEFAULT 'externe'.
 *   - favori : DEFAULT false (on laisse la base décider sauf demande explicite).
 */

export const STATUT_INITIAL = 'a_faire'

/**
 * Normalise les champs d'une candidature avec les valeurs par défaut canoniques.
 * Les clés absentes ne sont pas envoyées (la base applique ses propres defaults).
 */
export function construireCandidature({
  candidat_id,
  type,
  nom_entreprise,
  poste,
  url,
  statut,
  notes,
  formation_id,
  favori,
} = {}) {
  const row = {
    candidat_id,
    type:           type || 'externe',
    nom_entreprise: nom_entreprise || '',
    statut:         statut || STATUT_INITIAL,
    notes:          notes ?? '',
  }
  if (poste !== undefined)       row.poste = poste
  if (url !== undefined)         row.url = url
  if (formation_id != null)      row.formation_id = formation_id
  if (favori !== undefined)      row.favori = favori
  return row
}

/**
 * Insère une candidature et renvoie `{ data, error }` (ligne unique sélectionnée).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} champs - voir construireCandidature
 */
export async function ajouterCandidature(supabase, champs) {
  return supabase
    .from('candidat_candidatures')
    .insert(construireCandidature(champs))
    .select()
    .single()
}
