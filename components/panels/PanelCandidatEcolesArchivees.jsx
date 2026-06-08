'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

function sigle(nom) {
  return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

export default function PanelCandidatEcolesArchivees() {
  const supabase = createClient()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('candidat_ecoles_cachees')
      .select('*')
      .eq('candidat_id', user.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function restaurer(id) {
    await supabase.from('candidat_ecoles_cachees').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles archivées</div>
          <div className="page-sub">
            {loading ? 'Chargement…' : `${items.length} école${items.length !== 1 ? 's' : ''} masquée${items.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <i className="ti ti-archive" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
          Aucune école archivée.<br />
          <span style={{ fontSize: 12 }}>Les écoles que vous masquez apparaîtront ici.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const e = item.ecole_data || {}
            return (
              <div key={item.id} style={{ display: 'flex', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: '#fafafa', opacity: 0.8 }}>
                <div style={{ width: 4, flexShrink: 0, background: '#ccc', borderRadius: '10px 0 0 10px' }} />
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="e-av purple" style={{ flexShrink: 0 }}>{sigle(e.nom || '')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{e.nom || 'École'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      <i className="ti ti-map-pin" style={{ marginRight: 4 }} />
                      {[e.ville, e.region].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <button className="btn-sm teal" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => restaurer(item.id)}>
                    <i className="ti ti-refresh" /> Restaurer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
