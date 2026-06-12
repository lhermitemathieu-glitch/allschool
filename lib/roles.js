/**
 * Rôles et espaces — source unique de vérité.
 *
 * Le rôle qui fait autorité est app_metadata.role (non modifiable côté client,
 * cf. migration 034). user_metadata.role ne sert que de repli d'affichage pour
 * les rôles non sensibles — jamais pour l'admin.
 */

/** Espaces accessibles dans la TopNav selon le rôle. */
export const ROLE_TO_ALLOWED_SPACES = {
  candidat:   ['candidat'],
  entreprise: ['entreprise'],
  ecole:      ['ecole'],
  admin:      ['candidat', 'entreprise', 'ecole', 'backoffice'],
}

/** Chemin de route de chaque espace. */
export const SPACE_PATHS = {
  home:       '/app',
  candidat:   '/app/candidat',
  entreprise: '/app/entreprise',
  ecole:      '/app/ecole',
  backoffice: '/app/admin',
}

/**
 * Rôle effectif d'un utilisateur Supabase.
 * app_metadata d'abord (sécurisé) ; user_metadata en repli pour les comptes
 * dont la session n'a pas encore été rafraîchie — sauf 'admin', qui n'est
 * JAMAIS accordé depuis user_metadata.
 */
export function getRole(user) {
  const secure = user?.app_metadata?.role ?? null
  if (secure) return secure
  const declared = user?.user_metadata?.role ?? null
  return declared === 'admin' ? null : declared
}

/** Admin au sens strict : uniquement depuis app_metadata. */
export function isAdminUser(user) {
  return user?.app_metadata?.role === 'admin'
}
