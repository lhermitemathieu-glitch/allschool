'use client'

import AppShell from './AppShell'
import { PanelEcolePage, PanelEcoleApprentis, PanelEcoleDashboard } from '../panels/PanelEcole'
import PanelEcolePublique from '../panels/PanelEcolePublique'

export default function EspaceEcole({ userId, role }) {
  return (
    <AppShell spaceKey="ecole" role={role} userId={userId}>
      {(activePanel, data, navigateTo) => {
        switch (activePanel) {
          case 'ecole-page':      return <PanelEcolePage onVoirPage={id => navigateTo('ecole-publique', { ecoleId: id, from: 'ecole-page' })} />
          case 'ecole-apprentis': return <PanelEcoleApprentis />
          case 'ecole-dashboard': return <PanelEcoleDashboard />
          case 'ecole-publique':  return (
            <PanelEcolePublique
              ecoleId={data?.ecoleId}
              onBack={() => navigateTo(data?.from || 'ecole-page')}
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
