'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'

function sigle(nom) {
  return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

export default function PanelCandidatEcoles() {
  const supabase = createClient()

  const [onglet, setOnglet]         = useState('recherche')
  const [ecoles, setEcoles]         = useState([])
  const [loading, setLoading]       = useState(false)
  const [selected, setSelected]     = useState(null)
  const [formations, setFormations] = useState([])
  const [loadingF, setLoadingF]     = useState(false)

  // Filtres
  const [q, setQ]         = useState('')
  const [region, setRegion] = useState('')
  const [niveau, setNiveau] = useState('')
  const [regions, setRegions] = useState([])

  const NIVEAUX = [
    { value: 'cap',    label: 'CAP / Bac Pro' },
    { value: 'bts',    label: 'BTS / DEUST' },
    { value: 'bach',   label: 'Bachelor / Licence' },
    { value: 'master', label: 'Master / Ingénieur' },
    { value: 'autre',  label: 'Autre' },
  ]

  useEffect(() => {
    async function loadRegions() {
      const all = new Set()
      let from = 0
      while (true) {
        const { data } = await supabase.from('ecoles').select('region').not('region', 'is', null).range(from, from + 999)
        if (!data || data.length === 0) break
        data.forEach(x => x.region && all.add(x.region))
        if (data.length < 1000) break
        from += 1000
      }
      setRegions([...all].sort())
    }
    loadRegions()
    search()
  }, [])

  const search = useCallback(async () => {
    setLoading(true)
    setSelected(null)
    setFormations([])

    let query = supabase
      .from('ecoles')
      .select('id, nom, ville, region, academie, type_ecole, site_web, email, telephone, adresse, code_postal')
      .order('nom')
      .limit(50)

    if (q.trim()) query = query.ilike('nom', `%${q.trim()}%`)
    if (region)   query = query.eq('region', region)

    if (niveau) {
      const { data: fIds } = await supabase
        .from('formations').select('ecole_id').eq('niveau', niveau)
      const ids = [...new Set((fIds || []).map(f => f.ecole_id))]
      if (ids.length === 0) { setEcoles([]); setLoading(false); return }
      query = query.in('id', ids)
    }

    const { data } = await query
    setEcoles(data || [])
    setLoading(false)
  }, [q, region, niveau])

  useEffect(() => { search() }, [region, niveau])

  async function selectEcole(ecole) {
    setSelected(ecole)
    setLoadingF(true)
    const { data } = await supabase
      .from('formations')
      .select('id, nom, diplome, niveau, url_onisep, localite_formation')
      .eq('ecole_id', ecole.id)
      .order('nom')
    setFormations(data || [])
    setLoadingF(false)
  }

  const NIVEAU_LABEL = { cap: 'CAP / Bac pro', bts: 'BTS / DEUST', bach: 'Bachelor', master: 'Master', autre: 'Autre' }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles & formations</div>
          <div className="page-sub">Trouvez une école par région, ville ou diplôme</div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="s-card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 0 }}>
        <input
          placeholder="Nom de l'école…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          style={inputStyle}
        />
        <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 160 }}>
          <option value="">Toutes les régions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={niveau} onChange={e => setNiveau(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 180 }}>
          <option value="">Tous les niveaux</option>
          {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
        </select>
        <button className="btn-sm teal" onClick={search}><i className="ti ti-search" /> Rechercher</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1rem', marginTop: '1rem' }}>
        {/* Liste des écoles */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-school" /> Écoles ({ecoles.length})</div>
          </div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Recherche en cours…</div>
          ) : ecoles.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun résultat. Essayez d'autres filtres.</div>
          ) : ecoles.map(e => (
            <div
              key={e.id}
              className="entry-row"
              style={{ cursor: 'pointer', background: selected?.id === e.id ? 'var(--light)' : 'transparent', borderRadius: 8, padding: '6px 4px' }}
              onClick={() => selectEcole(e)}
            >
              <div className="e-av purple">{sigle(e.nom)}</div>
              <div style={{ flex: 1 }}>
                <div className="e-name">{e.nom}</div>
                <div className="e-meta">{[e.ville, e.region].filter(Boolean).join(' · ')}</div>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--muted)' }} />
            </div>
          ))}
        </div>

        {/* Détail école sélectionnée */}
        {selected && (
          <div className="s-card" style={{ marginBottom: 0 }}>
            <div className="s-card-header">
              <div className="s-card-title"><i className="ti ti-info-circle" /> {selected.nom}</div>
              <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setSelected(null)}><i className="ti ti-x" /></button>
            </div>

            {/* Infos école */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {selected.ville      && <span className="pill"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {selected.ville}</span>}
              {selected.region     && <span className="pill">{selected.region}</span>}
              {selected.academie   && <span className="pill">Acad. {selected.academie}</span>}
              {selected.type_ecole && <span className="pill">{selected.type_ecole}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {selected.adresse    && <span><i className="ti ti-map" style={{ fontSize: 11 }} /> {selected.adresse}{selected.code_postal ? ', ' + selected.code_postal : ''}</span>}
              {selected.telephone  && <span><i className="ti ti-phone" style={{ fontSize: 11 }} /> {selected.telephone}</span>}
              {selected.email      && <span><i className="ti ti-mail" style={{ fontSize: 11 }} /> {selected.email}</span>}
              {selected.site_web   && (
                <span
                  style={{ color: 'var(--teal)', cursor: 'pointer' }}
                  onClick={() => window.open(selected.site_web.startsWith('http') ? selected.site_web : 'https://' + selected.site_web, '_blank')}
                >
                  <i className="ti ti-world" style={{ fontSize: 11 }} /> {selected.site_web}
                </span>
              )}
            </div>

            {/* Formations */}
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="ti ti-certificate" /> Formations ({formations.length})
            </div>
            {loadingF ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chargement…</div>
            ) : formations.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune formation enregistrée.</div>
            ) : formations.map(f => (
              <div key={f.id} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)', marginBottom: 2 }}>{f.nom}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {f.diplome   && <span className="pill" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}>{f.diplome}</span>}
                  {f.niveau    && f.niveau !== 'autre' && <span className="pill">{NIVEAU_LABEL[f.niveau] || f.niveau}</span>}
                  {f.localite_formation && <span className="pill"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {f.localite_formation}</span>}
                  {f.url_onisep && (
                    <span
                      className="pill teal"
                      style={{ cursor: 'pointer' }}
                      onClick={() => window.open(f.url_onisep, '_blank')}
                    >
                      <i className="ti ti-external-link" style={{ fontSize: 10 }} /> ONISEP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const inputStyle = {
  flex: 1,
  minWidth: 140,
  padding: '8px 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}
