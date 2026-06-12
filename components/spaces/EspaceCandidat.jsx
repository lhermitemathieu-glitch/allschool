'use client'

import AppShell from './AppShell'
import PanelCandidatProfil from '../panels/PanelCandidatProfil'
import PanelCandidatEcoles from '../panels/PanelCandidatEcoles'
import PanelCandidatFormations from '../panels/PanelCandidatFormations'
import PanelCandidatCandidatures from '../panels/PanelCandidatCandidatures'
import PanelCandidatBadges from '../panels/PanelCandidatBadges'
import PanelCandidatOffres from '../panels/PanelCandidatOffres'
import PanelCandidatArchives from '../panels/PanelCandidatArchives'
import PanelCandidatActions from '../panels/PanelCandidatActions'
import PanelEcolePublique from '../panels/PanelEcolePublique'
import PanelEcoleLBAPublique from '../panels/PanelEcoleLBAPublique'
import PanelFormationPublique from '../panels/PanelFormationPublique'

export default function EspaceCandidat({ userId, role }) {
  const candidatId = role === 'candidat' ? userId : null

  return (
    <AppShell spaceKey="candidat" role={role} userId={userId}>
      {(activePanel, data, navigateTo) => {
        switch (activePanel) {
          case 'candidat-profil':       return <PanelCandidatProfil />
          case 'candidat-ecoles':       return <PanelCandidatEcoles
              initialFilters={data?.filters}
              onNavigateEcole={ecole => navigateTo('ecole-lba', { ecole, from: 'candidat-ecoles', filters: data?.filters })}
            />
          case 'candidat-formations':   return <PanelCandidatFormations
              initialFilters={data?.filters}
              candidatId={candidatId}
              onNavigateFormation={(id, from, filters) => navigateTo('formation-publique', { formationId: id, from, filters })}
              onNavigateEcole={(id, from, filters) => navigateTo('ecole-publique', { ecoleId: id, from, filters })}
              onNavigateArchives={() => navigateTo('candidat-archives')}
            />
          case 'candidat-candidatures': return <PanelCandidatCandidatures
              initialTab={data?.tab}
              onNavigateEcole={(id, fromTab) => navigateTo('ecole-publique', { ecoleId: id, from: 'candidat-candidatures', fromTab })}
              onNavigateFormation={id => navigateTo('formation-publique', { formationId: id, from: 'candidat-candidatures' })}
            />
          case 'candidat-badges':       return <PanelCandidatBadges />
          case 'candidat-actions':      return <PanelCandidatActions
              onNavigateFormation={id => navigateTo('formation-publique', { formationId: id, from: 'candidat-actions' })}
            />
          case 'candidat-offres':       return <PanelCandidatOffres
              onNavigateCandidatures={() => navigateTo('candidat-candidatures')}
              onNavigateArchives={() => navigateTo('candidat-archives')}
            />
          case 'candidat-archives':     return <PanelCandidatArchives />
          case 'ecole-lba':             return (
            <PanelEcoleLBAPublique
              ecole={data?.ecole}
              onBack={() => navigateTo(data?.from || 'candidat-ecoles', { filters: data?.filters })}
            />
          )
          case 'ecole-publique':        return (
            <PanelEcolePublique
              ecoleId={data?.ecoleId}
              onBack={() => navigateTo(data?.from || 'candidat-formations', { tab: data?.fromTab, filters: data?.filters })}
              onNavigateFormation={id => navigateTo('formation-publique', { formationId: id, from: 'ecole-publique', ecoleId: data?.ecoleId, fromTab: data?.fromTab, filters: data?.filters })}
            />
          )
          case 'formation-publique':    return (
            <PanelFormationPublique
              formationId={data?.formationId}
              candidatId={candidatId}
              onBack={() => navigateTo(data?.from || 'candidat-formations', { ecoleId: data?.ecoleId, fromTab: data?.fromTab, filters: data?.filters })}
              onNavigateEcole={id => navigateTo('ecole-publique', { ecoleId: id, from: 'formation-publique', formationId: data?.formationId, fromTab: data?.fromTab, filters: data?.filters })}
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
      }}
    </AppShell>
  )
}
