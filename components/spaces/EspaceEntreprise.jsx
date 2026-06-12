'use client'

import AppShell from './AppShell'
import { PanelEntrepriseSiret, PanelEntrepriseRecherche, PanelEntrepriseOffres, PanelEntrepriseSimulateur } from '../panels/PanelEntreprise'
import PanelCandidatEcoles from '../panels/PanelCandidatEcoles'
import PanelEcolePublique from '../panels/PanelEcolePublique'
import PanelEcoleLBAPublique from '../panels/PanelEcoleLBAPublique'

export default function EspaceEntreprise({ userId, role }) {
  return (
    <AppShell spaceKey="entreprise" role={role} userId={userId}>
      {(activePanel, data, navigateTo) => {
        switch (activePanel) {
          case 'entreprise-siret':      return <PanelEntrepriseSiret />
          case 'entreprise-recherche':  return <PanelEntrepriseRecherche onNavigate={panel => navigateTo(panel)} />
          // Recherche d'écoles : même moteur que l'espace candidat (annuaire LBA),
          // l'ancienne recherche sur la table interne (vidée) ne renvoyait rien.
          case 'entreprise-ecoles':     return <PanelCandidatEcoles
              onNavigateEcole={ecole => navigateTo('ecole-lba', { ecole, from: 'entreprise-ecoles' })}
            />
          case 'entreprise-offres':     return <PanelEntrepriseOffres />
          case 'entreprise-simulateur': return <PanelEntrepriseSimulateur />
          case 'ecole-lba':             return (
            <PanelEcoleLBAPublique
              ecole={data?.ecole}
              onBack={() => navigateTo(data?.from || 'entreprise-ecoles')}
            />
          )
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
