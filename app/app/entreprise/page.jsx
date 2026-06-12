import { requireSpace } from '../../../lib/auth-server'
import EspaceEntreprise from '../../../components/spaces/EspaceEntreprise'

// Espace Entreprise — vérification du rôle côté serveur avant tout envoi de code.
export default async function EntreprisePage() {
  const { user, role } = await requireSpace('entreprise')
  return <EspaceEntreprise userId={user.id} role={role} />
}
