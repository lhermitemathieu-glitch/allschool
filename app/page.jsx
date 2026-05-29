'use client'

import { useState } from 'react'
import TopNav from '../components/TopNav'
import Sidebar from '../components/Sidebar'
import PanelHome from '../components/panels/PanelHome'
import PanelCandidatProfil from '../components/panels/PanelCandidatProfil'
import PanelCandidatEcoles from '../components/panels/PanelCandidatEcoles'
import PanelCandidatCandidatures from '../components/panels/PanelCandidatCandidatures'
import PanelCandidatBadges from '../components/panels/PanelCandidatBadges'

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
      { icon: 'ti-search',      label: 'Offres alternance', panel: null, cls: 'cand' },
      { icon: 'ti-gift',        label: 'Bons plans',        panel: null, cls: 'cand' },
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
      { section: 'Gestion' },
      { icon: 'ti-list', label: 'Toutes les entrées', panel: null, cls: 'back' },
    ],
    firstPanel: 'back-overview',
  },
}

export default function Home() {
  const [activeSpace, setActiveSpace] = useState('home')
  const [activePanel, setActivePanel] = useState('home')

  const space = SPACES[activeSpace]
  const isHome = activeSpace === 'home'

  function switchSpace(name) {
    setActiveSpace(name)
    setActivePanel(SPACES[name].firstPanel)
  }

  function renderPanel() {
    switch (activePanel) {
      case 'home':                   return <PanelHome onSwitch={switchSpace} />
      case 'candidat-profil':        return <PanelCandidatProfil />
      case 'candidat-ecoles':        return <PanelCandidatEcoles />
      case 'candidat-candidatures':  return <PanelCandidatCandidatures />
      case 'candidat-badges':        return <PanelCandidatBadges />
      default:
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
              Panel : <code style={{ color: 'var(--accent)' }}>{activePanel}</code>
            </p>
            <p style={{ fontSize: 13 }}>À venir !</p>
          </div>
        )
    }
  }

  return (
    <>
      <TopNav activeSpace={activeSpace} onSwitch={switchSpace} user={space?.user} />
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
