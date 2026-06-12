'use client'

import AppShell from './AppShell'
import { PanelEntrepriseSiret, PanelEntrepriseRecherche, PanelEntrepriseEcoles, PanelEntrepriseOffres, PanelEntrepriseSimulateur } from '../panels/PanelEntreprise'
import PanelEcolePublique from '../panels/PanelEcolePublique'

export default function EspaceEntreprise({ userId, role }) {
  return (
    <AppShell spaceKey="entreprise" role={role} userId={userId}>
      {(activePanel, data, navigateTo) => {
        switch (activePanel) {
          case 'entreprise-siret':      return <PanelEntrepriseSiret />
          case 'entreprise-recherche':  return <PanelEntrepriseRecherche onNavigate={panel => navigateTo(panel)} />
          case 'entreprise-ecoles':     return <PanelEntrepriseEcoles onNavigateEcole={id => navigateTo('ecole-publique', { ecoleId: id, from: 'entreprise-ecoles' })} />
          case 'entreprise-offres':     return <PanelEntrepriseOffres />
          case 'entreprise-simulateur': return <PanelEntrepriseSimulateur />
          case 'ecole-publique':        return (
            <PanelEcolePublique
              ecoleId={data?.ecoleId}
              isEntreprise
              onBack={() => navigateTo(data?.from || 'entreprise-ecoles')}
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
