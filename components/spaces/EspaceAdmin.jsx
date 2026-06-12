'use client'

import AppShell from './AppShell'
import { PanelBackOverview, PanelBackApprentis, PanelBackEcoles, PanelBackEntreprises, PanelBackLogs } from '../panels/PanelBackoffice'
import { PanelBackDetailEcoles, PanelBackDetailCandidats, PanelBackDetailEntreprises, PanelAdminEntreprise, PanelAdminCandidat } from '../panels/PanelBackDetail'
import { PanelEcolePage } from '../panels/PanelEcole'
import PanelEcolePublique from '../panels/PanelEcolePublique'
import PanelFormationPublique from '../panels/PanelFormationPublique'

export default function EspaceAdmin({ userId, role }) {
  return (
    <AppShell spaceKey="backoffice" role={role} userId={userId}>
      {(activePanel, data, navigateTo) => {
        switch (activePanel) {
          case 'back-overview':    return <PanelBackOverview onNavigate={panel => navigateTo(panel)} />
          case 'back-apprentis':   return <PanelBackApprentis    onImported={() => navigateTo('back-logs')} />
          case 'back-ecoles':      return <PanelBackEcoles       onImported={() => navigateTo('back-logs')} />
          case 'back-entreprises': return <PanelBackEntreprises  onImported={() => navigateTo('back-logs')} />
          case 'back-logs':        return <PanelBackLogs />
          case 'back-detail-candidats':   return <PanelBackDetailCandidats onNavigateCandidat={id => navigateTo('back-admin-candidat', { candidatId: id })} />
          case 'back-detail-ecoles':      return <PanelBackDetailEcoles onNavigateEcole={id => navigateTo('ecole-publique', { ecoleId: id, from: 'back-detail-ecoles' })} />
          case 'back-detail-entreprises': return <PanelBackDetailEntreprises onNavigateEntreprise={id => navigateTo('back-admin-entreprise', { entrepriseId: id })} />
          case 'back-admin-entreprise':   return <PanelAdminEntreprise entrepriseId={data?.entrepriseId} onBack={() => navigateTo('back-detail-entreprises')} />
          case 'back-admin-candidat':     return <PanelAdminCandidat candidatId={data?.candidatId} onBack={() => navigateTo('back-detail-candidats')} />
          case 'ecole-publique':   return (
            <PanelEcolePublique
              ecoleId={data?.ecoleId}
              isAdmin
              onBack={() => navigateTo(data?.from || 'back-detail-ecoles', { tab: data?.fromTab, filters: data?.filters })}
              onEdit={() => navigateTo('ecole-edit', { ecoleId: data?.ecoleId, from: 'ecole-publique' })}
              onNavigateFormation={id => navigateTo('formation-publique', { formationId: id, from: 'ecole-publique', ecoleId: data?.ecoleId })}
            />
          )
          case 'formation-publique': return (
            <PanelFormationPublique
              formationId={data?.formationId}
              candidatId={null}
              onBack={() => navigateTo(data?.from || 'back-detail-ecoles', { ecoleId: data?.ecoleId })}
              onNavigateEcole={id => navigateTo('ecole-publique', { ecoleId: id, from: 'formation-publique' })}
            />
          )
          case 'ecole-edit':       return (
            <PanelEcolePage
              ecoleIdOverride={data?.ecoleId}
              onBack={() => navigateTo('ecole-publique', { ecoleId: data?.ecoleId, from: data?.from || 'back-detail-ecoles' })}
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
      }}
    </AppShell>
  )
}
