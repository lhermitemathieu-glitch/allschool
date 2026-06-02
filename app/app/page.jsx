'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import TopNav from '../../components/TopNav'
import Sidebar from '../../components/Sidebar'
import PanelHome from '../../components/panels/PanelHome'
import PanelCandidatProfil from '../../components/panels/PanelCandidatProfil'
import PanelCandidatEcoles from '../../components/panels/PanelCandidatEcoles'
import PanelCandidatCandidatures from '../../components/panels/PanelCandidatCandidatures'
import PanelCandidatBadges from '../../components/panels/PanelCandidatBadges'
import { PanelEntrepriseSiret, PanelEntrepriseRecherche, PanelEntrepriseEcoles, PanelEntrepriseOffres, PanelEntrepriseSimulateur } from '../../components/panels/PanelEntreprise'
import { PanelEcolePage, PanelEcoleApprentis, PanelEcoleDashboard } from '../../components/panels/PanelEcole'
import { PanelBackOverview, PanelBackApprentis, PanelBackEcoles, PanelBackEntreprises, PanelBackLogs } from '../../components/panels/PanelBackoffice'
import { PanelBackDetailEcoles, PanelBackDetailCandidats, PanelBackDetailEntreprises } from '../../components/panels/PanelBackDetail'

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
      { icon: 'ti-school',      label: 'Mes écoles',       panel: 'candidat-ecoles',       cls: 'cand' },
      { icon: 'ti-building',    label: 'Mes candidatures', panel: 'candidat-candidatures', cls: 'cand' },
      { icon: 'ti-trophy',      label: 'Mes badges',       panel: 'candidat-badges',       cls: 'cand' },
      { section: 'Explorer' },
      { icon: 'ti-search', label: 'Offres alternance', panel: null, cls: 'cand' },
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
  const [authUser, setAuthUser]             = useState(null)
  const [allowedSpaces, setAllowedSpaces]   = useState([])

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
  }

  function renderPanel() {
    switch (activePanel) {
      case 'home':                  return <PanelHome onSwitch={switchSpace} />
      case 'candidat-profil':       return <PanelCandidatProfil />
      case 'candidat-ecoles':       return <PanelCandidatEcoles />
      case 'candidat-candidatures': return <PanelCandidatCandidatures />
      case 'candidat-badges':       return <PanelCandidatBadges />
      case 'entreprise-siret':      return <PanelEntrepriseSiret />
      case 'entreprise-recherche':  return <PanelEntrepriseRecherche onNavigate={setActivePanel} />
      case 'entreprise-ecoles':     return <PanelEntrepriseEcoles />
      case 'entreprise-offres':     return <PanelEntrepriseOffres />
      case 'entreprise-simulateur': return <PanelEntrepriseSimulateur />
      case 'ecole-page':            return <PanelEcolePage />
      case 'ecole-apprentis':       return <PanelEcoleApprentis />
      case 'ecole-dashboard':       return <PanelEcoleDashboard />
      case 'back-overview':         return <PanelBackOverview onNavigate={setActivePanel} />
      case 'back-apprentis':        return <PanelBackApprentis    onImported={() => setActivePanel('back-logs')} />
      case 'back-ecoles':           return <PanelBackEcoles       onImported={() => setActivePanel('back-logs')} />
      case 'back-entreprises':      return <PanelBackEntreprises  onImported={() => setActivePanel('back-logs')} />
      case 'back-logs':                  return <PanelBackLogs />
      case 'back-detail-candidats':   return <PanelBackDetailCandidats />
      case 'back-detail-ecoles':      return <PanelBackDetailEcoles />
      case 'back-detail-entreprises': return <PanelBackDetailEntreprises />
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
      <TopNav activeSpace={activeSpace} onSwitch={switchSpace} user={space?.user} onLogout={handleLogout} allowedSpaces={allowedSpaces} />
      <div className={`workspace ${isHome ? 'home-mode' : ''}`}>
        {!isHome && (
          <Sidebar space={space} activePanel={activePanel} onNavigate={setActivePanel} />
        )}
        <main className="main" id="main-content">
          {renderPanel()}
        </main>
      </div>
    </>
  )
}
