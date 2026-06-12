import { requireSpace } from '../../../lib/auth-server'
import EspaceEcole from '../../../components/spaces/EspaceEcole'

// Espace École — vérification du rôle côté serveur avant tout envoi de code.
export default async function EcolePage() {
  const { user, role } = await requireSpace('ecole')
  return <EspaceEcole userId={user.id} role={role} />
}
