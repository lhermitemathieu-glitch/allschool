'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import TopNav from '../TopNav'
import Sidebar from '../Sidebar'
import Toaster from '../ui/Toaster'
import { SPACES } from './spacesConfig'
import { ROLE_TO_ALLOWED_SPACES, SPACE_PATHS } from '../../lib/roles'

/**
 * Coquille commune des espaces : TopNav + Sidebar + navigation interne par panel.
 *
 * Props :
 *   spaceKey  : 'home' | 'candidat' | 'entreprise' | 'ecole' | 'backoffice'
 *   role      : rôle effectif (fourni par le serveur, cf. lib/auth-server)
 *   userId    : id auth de l'utilisateur connecté
 *   children  : fonction (activePanel, activePanelData, navigateTo) => JSX
 */
export default function AppShell({ spaceKey, role, userId, children }) {
  const router = useRouter()
  const supabase = createClient()

  const space  = SPACES[spaceKey]
  const isHome = spaceKey === 'home'
  const allowedSpaces = ROLE_TO_ALLOWED_SPACES[role] ?? []

  const [activePanel, setActivePanel]         = useState(space?.firstPanel || 'home')
  const [activePanelData, setActivePanelData] = useState(null)
  const [dynamicUser, setDynamicUser]         = useState(null)
  const [notifCount, setNotifCount]           = useState(0)

  // Verrouille le scroll sur le body (layout fixe du dashboard)
  useEffect(() => {
    document.body.classList.add('app-mode')
    return () => document.body.classList.remove('app-mode')
  }, [])

  // Nom réel + notifications selon le rôle
  useEffect(() => {
    if (!userId) return
    async function load() {
      if (role === 'entreprise') {
        const { data: ent } = await supabase.from('entreprises').select('raison_sociale').eq('user_id', userId).maybeSingle()
        if (ent?.raison_sociale) {
          const initiales = ent.raison_sociale.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
          setDynamicUser({ name: ent.raison_sociale, av: initiales, role: 'Entreprise', bg: 'var(--accent)' })
        }
      } else if (role === 'candidat') {
        const { data: cand } = await supabase.from('candidats').select('prenom, nom').eq('id', userId).maybeSingle()
        if (cand?.prenom || cand?.nom) {
          const fullName  = [cand.prenom, cand.nom].filter(Boolean).join(' ')
          const initiales = [cand.prenom?.[0], cand.nom?.[0]].filter(Boolean).join('').toUpperCase()
          setDynamicUser({ name: fullName, av: initiales, role: 'Candidat', bg: 'var(--teal)' })
        }
        // Actions en retard ou à faire aujourd'hui
        const today = new Date().toISOString().split('T')[0]
        const { count } = await supabase
          .from('formation_actions')
          .select('id', { count: 'exact', head: true })
          .eq('candidat_id', userId)
          .eq('fait', false)
          .lte('echeance', today)
        setNotifCount(count ?? 0)
      }
    }
    load()
  }, [role, userId])

  // Navigation interne par panel (état + historique navigateur)
  const navigateTo = useCallback((panel, data = null) => {
    window.history.pushState({ panel, data }, '')
    setActivePanel(panel)
    setActivePanelData(data)
  }, [])

  useEffect(() => {
    function onPopState(e) {
      if (e.state?.panel) {
        setActivePanel(e.state.panel)
        setActivePanelData(e.state.data ?? null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Changement d'espace = changement de route (protection côté serveur)
  function switchSpace(name) {
    if (name !== 'home' && !allowedSpaces.includes(name)) return
    router.push(SPACE_PATHS[name] || '/app')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleNotifClick() {
    if (spaceKey === 'candidat') navigateTo('candidat-actions')
    else router.push(SPACE_PATHS.candidat)
  }

  return (
    <>
      <TopNav
        activeSpace={spaceKey}
        onSwitch={switchSpace}
        user={dynamicUser || space?.user}
        onLogout={handleLogout}
        allowedSpaces={allowedSpaces}
        notifCount={notifCount}
        onNotifClick={role === 'candidat' ? handleNotifClick : undefined}
      />
      <div className={`workspace ${isHome ? 'home-mode' : ''}`}>
        {!isHome && (
          <Sidebar space={space} activePanel={activePanel} onNavigate={setActivePanel} dynamicUser={dynamicUser} />
        )}
        <main className="main" id="main-content">
          {children(activePanel, activePanelData, navigateTo)}
        </main>
      </div>
      <Toaster />
    </>
  )
}
