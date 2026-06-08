'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import { typeInfo } from '../../lib/offre-types'

const NIVEAU_LABEL = {
  cap: 'CAP', bac: 'Bac Pro', bts: 'BTS', bts_agri: 'BTS Agricole',
  deust: 'DEUST', afpa3: 'Niv 3 – AFPA', niv3: 'Niv 3 – Autre',
  bach: 'Bachelor', master: 'Master', autre: 'Autre',
}

export default function PanelCandidatArchives() {
  const supabase = createClient()
  const [onglet,   setOnglet]   = useState('offres')
  const [offres,   setOffres]   = useState([])
  const [formations, setFormations] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: o }, { data: f }] = await Promise.all([
      supabase.from('candidat_offres_cachees').select('*').eq('candidat_id', user.id).order('created_at', { ascending: false }),
      supabase.from('candidat_formations_cachees').select('*').eq('candidat_id', user.id).order('created_at', { ascending: false }),
    ])
    setOffres(o || [])
    setFormations(f || [])
    setLoading(false)
  }

  async function restaurerOffre(id) {
    await supabase.from('candidat_offres_cachees').delete().eq('id', id)
    setOffres(prev => prev.filter(i => i.id !== id))
  }

  async function restaurerFormation(id) {
    await supabase.from('candidat_formations_cachees').delete().eq('id', id)
    setFormations(prev => prev.filter(i => i.id !== id))
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Archives</div>
          <div className="page-sub">{loading ? 'Chargement…' : `${offres.length} offre${offres.length !== 1 ? 's' : ''} · ${formations.length} formation${formations.length !== 1 ? 's' : ''} masquées`}</div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
        {[
          { key: 'offres',     label: 'Offres',     icon: 'ti-briefcase',   count: offres.length },
          { key: 'formations', label: 'Formations', icon: 'ti-certificate', count: formations.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setOnglet(tab.key)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none', fontFamily: 'DM Sans, sans-serif',
              color: onglet === tab.key ? 'var(--navy)' : 'var(--muted)',
              borderBottom: onglet === tab.key ? '2px solid var(--navy)' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 100,
              background: onglet === tab.key ? 'var(--navy)' : 'var(--border)',
              color: onglet === tab.key ? 'white' : 'var(--muted)',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
      ) : onglet === 'offres' ? (
        offres.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <i className="ti ti-archive" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
            Aucune offre archivée.<br />
            <span style={{ fontSize: 12 }}>Les offres que vous masquez apparaîtront ici.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {offres.map(item => {
              const o = item.offre_data || {}
              const tag = typeInfo(o.tag)
              return (
                <div key={item.id} style={{ display: 'flex', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: '#fafafa', opacity: 0.8 }}>
                  <div style={{ width: 4, flexShrink: 0, background: '#ccc', borderRadius: '10px 0 0 10px' }} />
                  <div style={{ flex: 1, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{o.titre}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: tag.bg, color: tag.color }}>
                          <i className={`ti ${tag.icon}`} style={{ fontSize: 10 }} />{tag.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        <i className="ti ti-building" style={{ marginRight: 4 }} />
                        {o.entreprise || 'Entreprise'}{o.ville ? ` · ${o.ville}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {o.url && (
                        <a href={o.url} target="_blank" rel="noopener noreferrer" className="btn-sm" style={{ fontSize: 11, textDecoration: 'none' }}>
                          <i className="ti ti-external-link" /> Voir
                        </a>
                      )}
                      <button className="btn-sm teal" style={{ fontSize: 11 }} onClick={() => restaurerOffre(item.id)}>
                        <i className="ti ti-refresh" /> Restaurer
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        formations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <i className="ti ti-archive" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
            Aucune formation archivée.<br />
            <span style={{ fontSize: 12 }}>Les formations que vous masquez apparaîtront ici.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {formations.map(item => {
              const f = item.formation_data || {}
              return (
                <div key={item.id} style={{ display: 'flex', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: '#fafafa', opacity: 0.8 }}>
                  <div style={{ width: 4, flexShrink: 0, background: '#ccc', borderRadius: '10px 0 0 10px' }} />
                  <div style={{ flex: 1, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>{f.nom || 'Formation'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {f.niveau && f.niveau !== 'autre' && <span>{NIVEAU_LABEL[f.niveau] || f.niveau}</span>}
                        {f.ecole_nom && <span><i className="ti ti-school" style={{ marginRight: 3 }} />{f.ecole_nom}{f.ecole_ville ? ` · ${f.ecole_ville}` : ''}</span>}
                      </div>
                    </div>
                    <button className="btn-sm teal" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => restaurerFormation(item.id)}>
                      <i className="ti ti-refresh" /> Restaurer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </>
  )
}
