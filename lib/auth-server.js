import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import { getRole, isAdminUser } from './roles'

/**
 * Garde d'accès côté serveur — appelé par les pages de chaque espace.
 * Le proxy (proxy.js) fait le contrôle "optimiste" (connecté ou non) ;
 * ici on fait le contrôle réel par rôle avant d'envoyer le moindre code.
 */

const SPACE_ROLES = {
  candidat:   ['candidat'],
  entreprise: ['entreprise'],
  ecole:      ['ecole'],
}

/** Utilisateur connecté + rôle effectif, ou redirection vers /login. */
export async function getUserAndRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { user, role: getRole(user), isAdmin: isAdminUser(user) }
}

/**
 * Exige l'accès à un espace ('candidat' | 'entreprise' | 'ecole' | 'admin').
 * L'admin (au sens strict, app_metadata) accède à tous les espaces.
 * Sinon, redirection vers l'accueil /app.
 */
export async function requireSpace(spaceKey) {
  const { user, role, isAdmin } = await getUserAndRole()

  if (spaceKey === 'admin') {
    if (!isAdmin) redirect('/app')
    return { user, role: 'admin', isAdmin }
  }

  const allowed = SPACE_ROLES[spaceKey] || []
  if (!allowed.includes(role) && !isAdmin) redirect('/app')
  return { user, role, isAdmin }
}
