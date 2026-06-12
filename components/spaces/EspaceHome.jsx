'use client'

import { useRouter } from 'next/navigation'
import AppShell from './AppShell'
import PanelHome from '../panels/PanelHome'
import { ROLE_TO_ALLOWED_SPACES, SPACE_PATHS } from '../../lib/roles'

export default function EspaceHome({ userId, role }) {
  const router = useRouter()
  const allowedSpaces = ROLE_TO_ALLOWED_SPACES[role] ?? []

  function goToSpace(space) {
    if (!allowedSpaces.includes(space)) return
    router.push(SPACE_PATHS[space] || '/app')
  }

  return (
    <AppShell spaceKey="home" role={role} userId={userId}>
      {() => <PanelHome onSwitch={goToSpace} />}
    </AppShell>
  )
}
