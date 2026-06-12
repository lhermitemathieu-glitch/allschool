import { requireSpace } from '../../../lib/auth-server'
import EspaceAdmin from '../../../components/spaces/EspaceAdmin'

// Backoffice Admin — réservé au rôle admin sécurisé (app_metadata, cf. migration 034).
// Un non-admin est redirigé vers /app sans jamais recevoir le code de cette page.
export default async function AdminPage() {
  const { user, role } = await requireSpace('admin')
  return <EspaceAdmin userId={user.id} role={role} />
}
