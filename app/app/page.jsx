'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import TopNav from '../../components/TopNav'
import Sidebar from '../../components/Sidebar'
import PanelHome from '../../components/panels/PanelHome'
import PanelCandidatProfil from '../../components/panels/PanelCandidatProfil'
import PanelCandidatEcoles from '../../components/panels/PanelCandidatEcoles'
import PanelCandidatFormations from '../../components/panels/PanelCandidatFormations'
import PanelCandidatCandidatures from '../../components/panels/PanelCandidatCandidatures'
import PanelCandidatBadges from '../../components/panels/PanelCandidatBadges'
import PanelCandidatOffres from '../../components/panels/PanelCandidatOffres'
import PanelCandidatStatuts from '../../components/panels/PanelCandidatStatuts'
import PanelCandidatActions from '../../components/panels/PanelCandidatActions'
import { PanelEntrepriseSiret, PanelEntrepriseRecherche, PanelEntrepriseEcoles, PanelEntrepriseOffres, PanelEntrepriseSimulateur } from '../../components/panels/PanelEntreprise'
import { PanelEcolePage, PanelEcoleApprentis, PanelEcoleDashboard } from '../../components/panels/PanelEcole'
import { PanelBackOverview, PanelBackApprentis, PanelBackEcoles, PanelBackEntreprises, PanelBackLogs } from '../../components/panels/PanelBackoffice'
import { PanelBackDetailEcoles, PanelBackDetailCandidats, PanelBackDetailEntreprises, PanelAdminEntreprise, PanelAdminCandidat } from '../../components/panels/PanelBackDetail'
import PanelEcolePublique from '../../components/panels/PanelEcolePublique'
import PanelFormationPublique from '../../components/panels/PanelFormationPublique'

const SPACES = {
  home: {
    label: 'Accueil', dot: 'var(--navy)',
    user: { av: 'AS', bg: 'var(--navy)', name: 'Allschool', role: 'Plateforme' },
    nav: [], firstPanel: 'home',
  },
  candidat: {
    label: 'Espace Candidat', dot: 'var(--teal)',
    user: { av: 'TM', bg: 'var(--teal)', name: 'Thomas Martin', role: 'Candidat' },
    nav: [
      { icon: 'ti-user-circle', label: 'Mon profil',      panel: 'candidat-profil',      cls: 'cand' },
      { icon: 'ti-school',      label: 'Écoles',            panel: 'candidat-ecoles',       cls: 'cand' },
      { icon: 'ti-certificate', label: 'Formations',        panel: 'candidat-formations',   cls: 'cand' },
      { icon: 'ti-building',    label: 'Mes candidatures', panel: 'candidat-candidatures', cls: 'cand' },
      { icon: 'ti-trophy',      label: 'Mes badges',        panel: 'candidat-badges',       cls: 'cand' },
      { icon: 'ti-bookmark',    label: 'Mes statuts',       panel: 'candidat-statuts',      cls: 'cand' },
      { icon: 'ti-bell',        label: 'Mes actions',       panel: 'candidat-actions',      cls: 'cand' },
      { section: 'Explorer' },
      { icon: 'ti-search', label: 'Offres alternance', panel: 'candidat-offres', cls: 'cand' },
      { icon: 'ti-gift',   label: 'Bons plans',        panel: null, cls: 'cand' },
    ],
    firstPanel: 'candidat-profil',
  },
  entreprise: {
    label: 'Espace Entreprise', dot: 'var(--accent)',
    user: { av: 'BL', bg: 'var(--accent)', name: 'Boulangerie Leroux', role: 'Entreprise' },
    nav: [
      { icon: 'ti-building-community', label: 'Mon entreprise',      panel: 'entreprise-siret',      cls: 'ent' },
      { icon: 'ti-search',             label: 'Rechercher un profil', panel: 'entreprise-recherche',  cls: 'ent' },
      { icon: 'ti-school',             label: 'Écoles près de moi',   panel: 'entreprise-ecoles',     cls: 'ent' },
      { icon: 'ti-speakerphone',       label: 'Mes offres',           panel: 'entreprise-offres',     cls: 'ent' },
      { icon: 'ti-calculator',         label: 'Simulateurs',          panel: 'entreprise-simulateur', cls: 'ent' },
      { section: 'Ressources' },
      { icon: 'ti-file-text', label: 'Guide alternance', panel: null, cls: 'ent' },
      { icon: 'ti-chart-bar', label: 'Chiffres clés',    panel: null, cls: 'ent' },
    ],
    firstPanel: 'entreprise-recherche',
  },
  ecole: {
    label: 'Espace École', dot: 'var(--purple)',
    user: { av: 'ESG', bg: 'var(--purple)', name: 'ESG Lyon', role: 'École Premium' },
    nav: [
      { section: 'Ma page école' },
      { icon: 'ti-layout',       label: 'Ma page publique', panel: 'ecole-page',      cls: 'eco' },
      { icon: 'ti-users',        label: 'Mes apprentis',    panel: 'ecole-apprentis', cls: 'eco' },
      { icon: 'ti-speakerphone', label: 'Mes offres',       panel: null, cls: 'eco' },
      { icon: 'ti-building',     label: 'Partenaires',      panel: null, cls: 'eco' },
      { icon: 'ti-calendar',     label: 'Événements',       panel: null, cls: 'eco' },
      { icon: 'ti-star',         label: 'Avis & liens',     panel: null, cls: 'eco' },
      { section: 'Pilotage' },
      { icon: 'ti-chart-bar', label: 'Dashboard', panel: 'ecole-dashboard', cls: 'eco' },
    ],
    firstPanel: 'ecole-page',
  },
  backoffice: {
    label: 'Backoffice Admin', dot: 'var(--gold)',
    user: { av: 'AD', bg: 'var(--gold)', name: 'Admin Allschool', role: 'Super admin' },
    nav: [
      { section: 'Vue globale' },
      { icon: 'ti-dashboard', label: "Vue d'ensemble",    panel: 'back-overview',    cls: 'back' },
      { icon: 'ti-history',   label: 'Journal imports',   panel: 'back-logs',        cls: 'back' },
      { section: 'Imports CSV' },
      { icon: 'ti-users',    label: 'Apprentis',          panel: 'back-apprentis',   cls: 'back' },
      { icon: 'ti-school',   label: 'Écoles',             panel: 'back-ecoles',      cls: 'back' },
      { icon: 'ti-building', label: 'Entreprises',        panel: 'back-entreprises', cls: 'back' },
      { section: 'Vue détaillée' },
      { icon: 'ti-users',    label: 'Candidats',   panel: 'back-detail-candidats',   cls: 'back' },
      { icon: 'ti-school',   label: 'Écoles',       panel: 'back-detail-ecoles',      cls: 'back' },
      { icon: 'ti-building', label: 'Entreprises',  panel: 'back-detail-entreprises', cls: 'back' },
      { section: 'Gestion' },
      { icon: 'ti-list', label: 'Toutes les entrées', panel: null, cls: 'back' },
    ],
    firstPanel: 'back-overview',
  },
}

// Mapping rôle Supabase → espace de l'app
const ROLE_TO_SPACE = {
  candidat:   'candidat',
  entreprise: 'entreprise',
  ecole:      'ecole',
  admin:      'backoffice',
}

// Espaces visibles dans la TopNav selon le rôle
const ROLE_TO_ALLOWED_SPACES = {
  candidat:   ['home', 'candidat'],
  entreprise: ['home', 'entreprise'],
  ecole:      ['home', 'ecole'],
  admin:      ['home', 'candidat', 'entreprise', 'ecole', 'backoffice'],
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  const [activeSpace, setActiveSpace]       = useState('home')
  const [activePanel, setActivePanel]       = useState('home')
  const [activePanelData, setActivePanelData] = useState(null)
  const [authUser, setAuthUser]             = useState(null)
  const [allowedSpaces, setAllowedSpaces]   = useState([])
  const [dynamicUser, setDynamicUser]       = useState(null)

  // Verrouille le scroll sur le body (layout fixe du dashboard)
  useEffect(() => {
    document.body.classList.add('app-mode')
    return () => document.body.classList.remove('app-mode')
  }, [])

  // Au chargement : récupère l'utilisateur et oriente vers le bon espace
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setAuthUser(user)
      const role = user.user_metadata?.role
      setAllowedSpaces(ROLE_TO_ALLOWED_SPACES[role] ?? [])

      // Charge le vrai nom selon le rôle
      if (role === 'entreprise') {
        const { data: ent } = await supabase.from('entreprises').select('raison_sociale').eq('user_id', user.id).maybeSingle()
        if (ent?.raison_sociale) {
          const initiales = ent.raison_sociale.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
          setDynamicUser({ name: ent.raison_sociale, av: initiales, role: 'Entreprise', bg: 'var(--accent)' })
        }
      } else if (role === 'candidat') {
        const { data: cand } = await supabase.from('candidats').select('prenom, nom').eq('id', user.id).maybeSingle()
        if (cand?.prenom || cand?.nom) {
          const fullName = [cand.prenom, cand.nom].filter(Boolean).join(' ')
          const initiales = [cand.prenom?.[0], cand.nom?.[0]].filter(Boolean).join('').toUpperCase()
          setDynamicUser({ name: fullName, av: initiales, role: 'Candidat', bg: 'var(--teal)' })
        }
      }
    }
    loadUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const space = SPACES[activeSpace]
  const isHome = activeSpace === 'home'

  function switchSpace(name) {
    if (!allowedSpaces.includes(name)) return
    setActiveSpace(name)
    setActivePanel(SPACES[name].firstPanel)
    setActivePanelData(null)
  }

  const navigateTo = useCallback((panel, data = null) => {
    window.history.pushState({ panel, data }, '')
    setActivePanel(panel)
    setActivePanelData(data)
  }, [])

  useEffect(() => {
    function onPopState(e) {
      const state = e.state
      if (state?.panel) {
        setActivePanel(state.panel)
        setActivePanelData(state.data ?? null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const isAdmin     = authUser?.user_metadata?.role === 'admin'
  const isCandidat  = authUser?.user_metadata?.role === 'candidat'
  const candidatId  = isCandidat ? authUser?.id : null

  function renderPanel() {
    switch (activePanel) {
      case 'home':                  return <PanelHome onSwitch={switchSpace} />
      case 'candidat-profil':       return <PanelCandidatProfil />
      case 'candidat-ecoles':       return <PanelCandidatEcoles
          initialVue={activePanelData?.tab}
          initialFilters={activePanelData?.filters}
          onNavigateEcole={(id, tab, filters) => navigateTo('ecole-publique', { ecoleId: id, from: 'candidat-ecoles', fromTab: tab, filters })}
          onNavigateFormation={(id, tab, filters) => navigateTo('formation-publique', { formationId: id, from: 'candidat-ecoles', fromTab: tab, filters })}
        />
      case 'candidat-formations':   return <PanelCandidatFormations
          initialFilters={activePanelData?.filters}
          candidatId={candidatId}
          onNavigateFormation={(id, from, filters) => navigateTo('formation-publique', { formationId: id, from, filters })}
          onNavigateEcole={(id, from, filters) => navigateTo('ecole-publique', { ecoleId: id, from, filters })}
        />
      case 'candidat-candidatures': return <PanelCandidatCandidatures />
      case 'candidat-badges':       return <PanelCandidatBadges />
      case 'candidat-statuts':      return <PanelCandidatStatuts
          onNavigateFormation={id => navigateTo('formation-publique', { formationId: id, from: 'candidat-statuts' })}
        />
      case 'candidat-actions':      return <PanelCandidatActions
          onNavigateFormation={id => navigateTo('formation-publique', { formationId: id, from: 'candidat-actions' })}
        />
      case 'candidat-offres':       return <PanelCandidatOffres />
      case 'entreprise-siret':      return <PanelEntrepriseSiret />
      case 'entreprise-recherche':  return <PanelEntrepriseRecherche onNavigate={setActivePanel} />
      case 'entreprise-ecoles':     return <PanelEntrepriseEcoles onNavigateEcole={id => navigateTo('ecole-publique', { ecoleId: id, from: 'entreprise-ecoles' })} />
      case 'entreprise-offres':     return <PanelEntrepriseOffres />
      case 'entreprise-simulateur': return <PanelEntrepriseSimulateur />
      case 'ecole-page':            return <PanelEcolePage onVoirPage={id => navigateTo('ecole-publique', { ecoleId: id, from: 'ecole-page' })} />
      case 'ecole-apprentis':       return <PanelEcoleApprentis />
      case 'ecole-dashboard':       return <PanelEcoleDashboard />
      case 'back-overview':         return <PanelBackOverview onNavigate={setActivePanel} />
      case 'back-apprentis':        return <PanelBackApprentis    onImported={() => setActivePanel('back-logs')} />
      case 'back-ecoles':           return <PanelBackEcoles       onImported={() => setActivePanel('back-logs')} />
      case 'back-entreprises':      return <PanelBackEntreprises  onImported={() => setActivePanel('back-logs')} />
      case 'back-logs':             return <PanelBackLogs />
      case 'back-detail-candidats':   return <PanelBackDetailCandidats onNavigateCandidat={id => navigateTo('back-admin-candidat', { candidatId: id })} />
      case 'back-detail-ecoles':      return <PanelBackDetailEcoles onNavigateEcole={id => navigateTo('ecole-publique', { ecoleId: id, from: 'back-detail-ecoles' })} />
      case 'back-detail-entreprises': return <PanelBackDetailEntreprises onNavigateEntreprise={id => navigateTo('back-admin-entreprise', { entrepriseId: id })} />
      case 'back-admin-entreprise':   return <PanelAdminEntreprise entrepriseId={activePanelData?.entrepriseId} onBack={() => navigateTo('back-detail-entreprises')} />
      case 'back-admin-candidat':     return <PanelAdminCandidat candidatId={activePanelData?.candidatId} onBack={() => navigateTo('back-detail-candidats')} />
      case 'ecole-publique':        return (
        <PanelEcolePublique
          ecoleId={activePanelData?.ecoleId}
          isAdmin={isAdmin}
          isEntreprise={authUser?.user_metadata?.role === 'entreprise'}
          onBack={() => navigateTo(activePanelData?.from || 'home', { tab: activePanelData?.fromTab, filters: activePanelData?.filters })}
          onEdit={isAdmin ? () => navigateTo('ecole-edit', { ecoleId: activePanelData?.ecoleId, from: 'ecole-publique' }) : undefined}
          onNavigateFormation={id => navigateTo('formation-publique', { formationId: id, from: 'ecole-publique', ecoleId: activePanelData?.ecoleId, fromTab: activePanelData?.fromTab, filters: activePanelData?.filters })}
        />
      )
      case 'formation-publique':    return (
        <PanelFormationPublique
          formationId={activePanelData?.formationId}
          candidatId={candidatId}
          onBack={() => navigateTo(activePanelData?.from || 'home', { ecoleId: activePanelData?.ecoleId, fromTab: activePanelData?.fromTab, filters: activePanelData?.filters })}
          onNavigateEcole={id => navigateTo('ecole-publique', { ecoleId: id, from: 'formation-publique', formationId: activePanelData?.formationId, fromTab: activePanelData?.fromTab, filters: activePanelData?.filters })}
        />
      )
      case 'ecole-edit':            return (
        <PanelEcolePage
          ecoleIdOverride={activePanelData?.ecoleId}
          onBack={() => navigateTo('ecole-publique', { ecoleId: activePanelData?.ecoleId, from: activePanelData?.from || 'back-detail-ecoles' })}
          onVoirPage={id => navigateTo('ecole-publique', { ecoleId: id, from: 'ecole-edit' })}
        />
      )
      default:
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
              Panel : <code style={{ color: 'var(--accent)' }}>{activePanel}</code>
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>À venir !</p>
          </div>
        )
    }
  }

  return (
    <>
      <TopNav activeSpace={activeSpace} onSwitch={switchSpace} user={dynamicUser || space?.user} onLogout={handleLogout} allowedSpaces={allowedSpaces} />
      <div className={`workspace ${isHome ? 'home-mode' : ''}`}>
        {!isHome && (
          <Sidebar space={space} activePanel={activePanel} onNavigate={setActivePanel} dynamicUser={dynamicUser} />
        )}
        <main className="main" id="main-content">
          {renderPanel()}
        </main>
      </div>
    </>
  )
}
