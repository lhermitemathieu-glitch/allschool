import { requireSpace } from '../../../lib/auth-server'
import EspaceCandidat from '../../../components/spaces/EspaceCandidat'

// Espace Candidat — vérification du rôle côté serveur avant tout envoi de code.
export default async function CandidatPage() {
  const { user, role } = await requireSpace('candidat')
  return <EspaceCandidat userId={user.id} role={role} />
}
