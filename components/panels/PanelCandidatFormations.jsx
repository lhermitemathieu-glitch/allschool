'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'

function sigle(nom) {
  return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

const MODALITE_MAP = {
  presentiel: { label: 'Présentiel', icon: 'ti-building', bg: '#e0f2fe', color: '#0369a1' },
  distanciel: { label: 'Distanciel', icon: 'ti-wifi',     bg: '#dcfce7', color: '#166534' },
  hybride:    { label: 'Hybride',    icon: 'ti-refresh',  bg: '#fef9c3', color: '#854d0e' },
}

function ModaliteTag({ value }) {
  const m = MODALITE_MAP[value]
  if (!m) return null
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <i className={`ti ${m.icon}`} style={{ fontSize: 9 }} /> {m.label}
    </span>
  )
}

const NIVEAUX = [
  { value: 'cap',      label: 'CAP' },
  { value: 'bac',      label: 'Bac Pro' },
  { value: 'bts',      label: 'BTS' },
  { value: 'bts_agri', label: 'BTS Agricole' },
  { value: 'deust',    label: 'DEUST' },
  { value: 'afpa3',    label: 'Niv 3 – AFPA' },
  { value: 'niv3',     label: 'Niv 3 – Autre' },
  { value: 'bach',     label: 'Bachelor / Licence' },
  { value: 'master',   label: 'Master / Ingénieur' },
  { value: 'autre',    label: 'Autre' },
]

const NIVEAU_LABEL = {
  cap: 'CAP', bac: 'Bac Pro', bts: 'BTS', bts_agri: 'BTS Agricole',
  deust: 'DEUST', afpa3: 'Niv 3 – AFPA', niv3: 'Niv 3 – Autre',
  bach: 'Bachelor', master: 'Master', autre: 'Autre',
}

function niveauStyle(niveau) {
  const map = {
    cap:      { background: '#fef9c3', color: '#854d0e' },
    bac:      { background: '#ffedd5', color: '#9a3412' },
    bts:      { background: '#e0f2fe', color: '#0369a1' },
    bts_agri: { background: '#d1fae5', color: '#065f46' },
    deust:    { background: '#ede9fe', color: '#5b21b6' },
    afpa3:    { background: '#fce7f3', color: '#9d174d' },
    niv3:     { background: '#f1f5f9', color: '#475569' },
    bach:     { background: '#dcfce7', color: '#166534' },
    master:   { background: '#fce7f3', color: '#9d174d' },
    autre:    { background: '#ede9fe', color: '#7c3aed' },
  }
  return map[niveau] || map.autre
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
}

export default function PanelCandidatFormations({ onNavigateFormation, onNavigateEcole, initialFilters }) {
  const supabase = createClient()

  const [formations, setFormations] = useState([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)
  const [total, setTotal]           = useState(null)

  const [q,        setQ]        = useState(initialFilters?.q        || '')
  const [diplome,  setDiplome]  = useState(initialFilters?.diplome  || '')
  const [niveau,   setNiveau]   = useState(initialFilters?.niveau   || '')
  const [modalite, setModalite] = useState(initialFilters?.modalite || '')

  const [ville,       setVille]       = useState(initialFilters?.ville     || '')
  const [villeCity,   setVilleCity]   = useState(initialFilters?.villeCity || '')
  const [rayon,       setRayon]       = useState(initialFilters?.rayon     || '')
  const [suggestions, setSuggestions] = useState([])
  const [geoErr,      setGeoErr]      = useState('')
  const [geoLoading,  setGeoLoading]  = useState(false)

  async function fetchSuggestions(val) {
    if (val.length < 2) { setSuggestions([]); return }
    try {
      const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&type=municipality&limit=6`)
      const json = await res.json()
      setSuggestions((json.features || []).map(f => ({
        label: f.properties.label,
        city:  f.properties.city,
        lat:   f.geometry.coordinates[1],
        lng:   f.geometry.coordinates[0],
      })))
    } catch { setSuggestions([]) }
  }

  function selectSuggestion(s) {
    setVille(s.label)
    setVilleCity(s.city)
    setSuggestions([])
  }

  async function geocodeVille(nom) {
    const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(nom)}&type=municipality&limit=1`)
    if (!res.ok) return null
    const json = await res.json()
    const feat = json.features?.[0]
    if (!feat) return null
    const [lng, lat] = feat.geometry.coordinates
    return { lat, lng, city: feat.properties.city }
  }

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    setGeoErr('')

    // ── Filtre géographique → IDs d'écoles ───────────────────────────────────
    let ecoleIds    = null
    let villeExacte = null

    if (ville.trim() && rayon) {
      setGeoLoading(true)
      const coords = await geocodeVille(ville.trim())
      setGeoLoading(false)
      if (!coords) {
        setGeoErr(`Ville "${ville}" introuvable`)
        setFormations([])
        setLoading(false)
        return
      }
      const { data: nearby } = await supabase.rpc('ecoles_dans_rayon', {
        lat: coords.lat, lng: coords.lng, rayon_km: parseFloat(rayon),
      })
      ecoleIds = (nearby || []).map(r => r.id)
      if (ecoleIds.length === 0) { setFormations([]); setLoading(false); return }
    } else if (ville.trim() && !rayon) {
      villeExacte = villeCity || ville.trim()
    }

    // Filtre modalité → IDs d'écoles
    if (modalite) {
      let mQuery = supabase.from('ecoles').select('id').contains('modalites', [modalite])
      if (ecoleIds)    mQuery = mQuery.in('id', ecoleIds)
      if (villeExacte) mQuery = mQuery.ilike('ville', villeExacte)
      const { data: mData } = await mQuery
      ecoleIds = (mData || []).map(e => e.id)
      if (ecoleIds.length === 0) { setFormations([]); setLoading(false); return }
      villeExacte = null
    } else if (villeExacte) {
      const { data: vData } = await supabase.from('ecoles').select('id').ilike('ville', villeExacte)
      ecoleIds = (vData || []).map(e => e.id)
      if (ecoleIds.length === 0) { setFormations([]); setLoading(false); return }
      villeExacte = null
    }

    // ── Requête formations ────────────────────────────────────────────────────
    let fQuery = supabase
      .from('formations')
      .select('id, nom, diplome, niveau, modalite, url_onisep, localite_formation, ecole_id')
      .order('nom')
      .limit(300)

    if (q.trim())       fQuery = fQuery.ilike('nom',    `%${q.trim()}%`)
    if (diplome.trim()) fQuery = fQuery.ilike('diplome', `%${diplome.trim()}%`)
    if (niveau)         fQuery = fQuery.eq('niveau', niveau)
    if (ecoleIds)       fQuery = fQuery.in('ecole_id', ecoleIds)

    const { data: fData } = await fQuery

    // Enrichit avec le nom de l'école
    const ids = [...new Set((fData || []).map(f => f.ecole_id))]
    const { data: eData } = await supabase
      .from('ecoles')
      .select('id, nom, ville, region, modalites')
      .in('id', ids)
    const ecoleMap = Object.fromEntries((eData || []).map(e => [e.id, e]))

    setFormations((fData || []).map(f => ({ ...f, ecole: ecoleMap[f.ecole_id] })))
    setLoading(false)
  }, [q, diplome, niveau, modalite, ville, villeCity, rayon])

  useEffect(() => {
    supabase.from('formations').select('id', { count: 'exact', head: true }).then(({ count }) => setTotal(count))
  }, [])
  // Plus de déclenchement automatique sur changement de filtre

  const filters = { q, diplome, niveau, modalite, ville, villeCity, rayon }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Formations</div>
          <div className="page-sub">{total !== null ? `${total} formations disponibles — utilisez les filtres pour rechercher` : 'Chargement…'}</div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>

        {/* Ligne 1 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Nom de la formation…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={inputStyle}
          />
          <input
            placeholder="Mot clé diplôme…"
            value={diplome}
            onChange={e => setDiplome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={{ ...inputStyle, flex: 'none', width: 200 }}
          />
          <select value={niveau} onChange={e => setNiveau(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 180 }}>
            <option value="">Tous les niveaux</option>
            {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
          <select value={modalite} onChange={e => setModalite(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 150 }}>
            <option value="">Présentiel & distanciel</option>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel">Distanciel</option>
            <option value="hybride">Hybride</option>
          </select>
        </div>

        {/* Ligne 2 : géographique */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
              <i className="ti ti-map-pin" style={{ padding: '0 10px', color: 'var(--muted)', fontSize: 15 }} />
              <input
                placeholder="Votre ville…"
                value={ville}
                onChange={e => { setVille(e.target.value); setVilleCity(''); setGeoErr(''); fetchSuggestions(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); search() } if (e.key === 'Escape') setSuggestions([]) }}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1, padding: '8px 8px 8px 0' }}
              />
              {ville && (
                <button onClick={() => { setVille(''); setVilleCity(''); setSuggestions([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--muted)', fontSize: 13 }}>×</button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onMouseDown={() => selectSuggestion(s)}
                    style={{ padding: '8px 14px', fontSize: 13, color: 'var(--navy)', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <i className="ti ti-map-pin" style={{ fontSize: 11, color: 'var(--muted)', marginRight: 6 }} />
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <select value={rayon} onChange={e => setRayon(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 130 }}>
            <option value="">— Rayon —</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
          {geoErr    && <span style={{ fontSize: 12, color: 'var(--accent)' }}><i className="ti ti-alert-circle" /> {geoErr}</span>}
          {geoLoading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Géolocalisation…</span>}
          <button className="btn-sm teal" onClick={search} style={{ marginLeft: 'auto' }}>
            {geoLoading ? <><i className="ti ti-loader" /> …</> : <><i className="ti ti-search" /> Rechercher</>}
          </button>
        </div>
      </div>

      {/* Résultats */}
      <div className="s-card" style={{ marginBottom: 0 }}>
        {!searched ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <i className="ti ti-certificate" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: 0.3 }} />
            Utilisez les filtres et cliquez sur <strong>Rechercher</strong>.
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Recherche en cours…</div>
        ) : formations.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune formation trouvée. Essayez d'autres filtres.</div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>{formations.length} formation{formations.length > 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {formations.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '0.5px solid var(--border)' }}>

                  {/* Niveau badge */}
                  <div style={{ flexShrink: 0, width: 80, textAlign: 'center' }}>
                    {f.niveau && f.niveau !== 'autre' && (
                      <span style={{ ...niveauStyle(f.niveau), fontSize: 10, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        {NIVEAU_LABEL[f.niveau] || f.niveau}
                      </span>
                    )}
                  </div>

                  {/* Nom + localité */}
                  <div style={{ flex: 1, minWidth: 0, cursor: onNavigateFormation ? 'pointer' : 'default' }} onClick={() => onNavigateFormation?.(f.id, 'candidat-formations', filters)}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: onNavigateFormation ? 'var(--teal)' : 'var(--navy)', lineHeight: 1.4 }}>
                      {f.nom}
                      {onNavigateFormation && <i className="ti ti-chevron-right" style={{ fontSize: 11, marginLeft: 4 }} />}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {f.localite_formation && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          <i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {f.localite_formation}
                        </span>
                      )}
                      <ModaliteTag value={f.modalite || f.ecole?.modalites?.[0]} />
                    </div>
                  </div>

                  {/* École */}
                  {f.ecole && (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: onNavigateEcole ? 'pointer' : 'default', padding: '4px 8px', borderRadius: 8, background: 'var(--light)' }}
                      onClick={() => onNavigateEcole?.(f.ecole.id, 'candidat-formations', filters)}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--purple-soft)', color: 'var(--purple)', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sigle(f.ecole.nom)}
                      </div>
                      <div style={{ maxWidth: 160 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.ecole.nom}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{[f.ecole.ville, f.ecole.region].filter(Boolean).join(' · ')}</div>
                      </div>
                      {onNavigateEcole && <i className="ti ti-chevron-right" style={{ fontSize: 11, color: 'var(--teal)' }} />}
                    </div>
                  )}

                  {/* ONISEP */}
                  {f.url_onisep && (
                    <button className="btn-sm teal" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => window.open(f.url_onisep, '_blank')}>
                      <i className="ti ti-external-link" /> ONISEP
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
