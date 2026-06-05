'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import { STATUTS } from './PanelFormationPublique'

export default function PanelCandidatStatuts({ onNavigateFormation }) {
  const supabase = createClient()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('formation_statuts')
        .select('statut, formation_id, formations(id, nom, niveau, diplome, ecole_id, ecoles(nom, ville))')
        .eq('candidat_id', user.id)
        .order('updated_at', { ascending: false })

      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  // Grouper par statut dans l'ordre défini
  const grouped = STATUTS.map(s => ({
    ...s,
    items: rows.filter(r => r.statut === s.key),
  })).filter(g => g.items.length > 0)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes statuts</div>
          <div className="page-sub">
            {rows.length === 0 ? 'Aucune formation suivie' : `${rows.length} formation${rows.length > 1 ? 's' : ''} suivie${rows.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="s-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <i className="ti ti-bookmark" style={{ fontSize: 32, color: 'var(--muted)', display: 'block', marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Tu n'as encore posé aucun statut sur une formation.</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Ouvre une fiche formation et clique sur un statut pour commencer.</div>
        </div>
      ) : (
        grouped.map(groupe => (
          <div key={groupe.key} style={{ marginBottom: '1.25rem' }}>
            {/* En-tête du groupe */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: groupe.bg, color: groupe.color,
              }}>
                <i className={`ti ${groupe.icon}`} style={{ fontSize: 11 }} />
                {groupe.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{groupe.items.length}</span>
            </div>

            {/* Lignes */}
            <div className="s-card" style={{ padding: 0, overflow: 'hidden' }}>
              {groupe.items.map((row, i) => {
                const f = row.formations
                const ecole = f?.ecoles
                return (
                  <div
                    key={row.formation_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderBottom: i < groupe.items.length - 1 ? '0.5px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => onNavigateFormation?.(row.formation_id)}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: groupe.bg, color: groupe.color, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${groupe.icon}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f?.nom || 'Formation inconnue'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {[ecole?.nom, ecole?.ville].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--muted)', flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </>
  )
}
