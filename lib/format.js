/**
 * Helpers de formatage partagés — source unique de vérité.
 * Évite la réimplémentation de `initiales`/`sigle`/`formatTel` dans chaque panel.
 */

/** Initiales à partir d'un prénom + nom (ex: "Thomas", "Martin" -> "TM"). */
export function initialesNom(prenom, nom) {
  return [(prenom || '')[0], (nom || '')[0]].filter(Boolean).join('').toUpperCase() || '?'
}

/**
 * Initiales à partir d'une chaîne complète (ex: "Boulangerie Leroux" -> "BL").
 * @param {string} str
 * @param {number} max nombre de lettres (défaut 2)
 */
export function initiales(str, max = 2) {
  return (str || '').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, max) || '?'
}

/**
 * Sigle d'un nom d'établissement : ne garde que les mots de plus de 2 lettres.
 * (ex: "École Supérieure de Gestion" -> "ESG")
 */
export function sigle(str, max = 3) {
  return (str || '').split(' ').filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase().slice(0, max) || '?'
}

/** Formate un numéro de téléphone FR en groupes de 2 (ex: "06.12.34.56.78"). */
export function formatTel(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  return digits.match(/.{1,2}/g).join('.')
}

/** Date longue FR (ex: "12 juin 2026"). */
export function formatDateLongue(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
