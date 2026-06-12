import { getUserAndRole } from '../../lib/auth-server'
import EspaceHome from '../../components/spaces/EspaceHome'

// Accueil de l'app : accessible à tout utilisateur connecté.
// Le contrôle d'accès par espace se fait sur les routes /app/candidat,
// /app/entreprise, /app/ecole et /app/admin (cf. lib/auth-server.js).
export default async function AppHomePage() {
  const { user, role } = await getUserAndRole()
  return <EspaceHome userId={user.id} role={role} />
}
