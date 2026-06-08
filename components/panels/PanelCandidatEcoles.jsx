'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'
import { SECTEURS } from '../../lib/secteurs'

function sigle(nom) {
  return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

const NIVEAU_LABEL = {
  cap: 'CAP', bac: 'Bac Pro', bts: 'BTS', bts_agri: 'BTS Agricole',
  deust: 'DEUST', afpa3: 'Niv 3 – AFPA', niv3: 'Niv 3 – Autre',
  bach: 'Bachelor', master: 'Master', autre: 'Autre',
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

export default function PanelCandidatEcoles({ onNavigateEcole, onNavigateFormation, initialFilters }) {
  const supabase = createClient()

  const [ecoles,    setEcoles]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [searched,  setSearched]  = useState(false)
  const [total,     setTotal]     = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [formations, setFormations] = useState([])
  const [loadingF,  setLoadingF]  = useState(false)
  const [regions,   setRegions]   = useState([])

  const [q,        setQ]        = useState(initialFilters?.q        || '')
  const [region,   setRegion]   = useState(initialFilters?.region   || '')
  const [secteur,  setSecteur]  = useState(initialFilters?.secteur  || '')
  const [modalite, setModalite] = useState(initialFilters?.modalite || '')
  const [ville,    setVille]    = useState(initialFilters?.ville    || '')
  const [villeCity, setVilleCity] = useState(initialFilters?.villeCity || '')
  const [rayon,    setRayon]    = useState(initialFilters?.rayon    || '')
  const [suggestions, setSuggestions] = useState([])
  const [geoErr,   setGeoErr]   = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

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
    supabase.from('ecoles').select('id', { count: 'exact', head: true }).then(({ count }) => setTotal(count))
  }, [])

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
    setSelected(null)
    setFormations([])
    setGeoErr('')

    let geoIds      = null
    let villeExacte = null

    if (ville.trim() && rayon) {
      setGeoLoading(true)
      const coords = await geocodeVille(ville.trim())
      setGeoLoading(false)
      if (!coords) {
        setGeoErr(`Ville "${ville}" introuvable`)
        setEcoles([])
        setLoading(false)
        return
      }
      const { data: nearby } = await supabase.rpc('ecoles_dans_rayon', {
        lat: coords.lat, lng: coords.lng, rayon_km: parseFloat(rayon),
      })
      geoIds = (nearby || []).map(r => r.id)
      if (geoIds.length === 0) { setEcoles([]); setLoading(false); return }
    } else if (ville.trim() && !rayon) {
      villeExacte = villeCity || ville.trim()
    }

    let ecolesQuery = supabase
      .from('ecoles')
      .select('id, nom, ville, region, academie, type_ecole, site_web, email, telephone, adresse, code_postal, secteurs, modalites')
      .order('nom')
      .limit(100)

    if (q.trim())    ecolesQuery = ecolesQuery.ilike('nom', `%${q.trim()}%`)
    if (region)      ecolesQuery = ecolesQuery.eq('region', region)
    if (secteur)     ecolesQuery = ecolesQuery.contains('secteurs', [secteur])
    if (geoIds)      ecolesQuery = ecolesQuery.in('id', geoIds)
    if (villeExacte) ecolesQuery = ecolesQuery.ilike('ville', villeExacte)
    if (modalite)    ecolesQuery = ecolesQuery.contains('modalites', [modalite])

    const { data } = await ecolesQuery
    setEcoles(data || [])
    setLoading(false)
  }, [q, region, secteur, modalite, ville, villeCity, rayon])

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

  const filters = { q, region, secteur, modalite, ville, villeCity, rayon }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles</div>
          <div className="page-sub">{total !== null ? `${total} écoles disponibles — utilisez les filtres pour rechercher` : 'Chargement…'}</div>
        </div>
      </div>

      <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Nom de l'école…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={inputStyle}
          />
          <select value={secteur} onChange={e => setSecteur(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 200 }}>
            <option value="">Tous les secteurs</option>
            {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={modalite} onChange={e => setModalite(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 150 }}>
            <option value="">Présentiel & distanciel</option>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel">Distanciel</option>
            <option value="hybride">Hybride</option>
          </select>
          <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 160 }}>
            <option value="">Toutes les régions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

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
              {ville && <button onClick={() => { setVille(''); setVilleCity(''); setSuggestions([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--muted)', fontSize: 13 }}>×</button>}
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
          {geoErr     && <span style={{ fontSize: 12, color: 'var(--accent)' }}><i className="ti ti-alert-circle" /> {geoErr}</span>}
          {geoLoading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Géolocalisation…</span>}
          <button className="btn-sm teal" onClick={search} style={{ marginLeft: 'auto' }}>
            {geoLoading ? <><i className="ti ti-loader" /> …</> : <><i className="ti ti-search" /> Rechercher</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        <div className="s-card" style={{ marginBottom: 0 }}>
          {!searched ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <i className="ti ti-school" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: 0.3 }} />
              Utilisez les filtres et cliquez sur <strong>Rechercher</strong>.
            </div>
          ) : loading ? (
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

        {selected && (
          <div className="s-card" style={{ marginBottom: 0 }}>
            <div className="s-card-header">
              <div className="s-card-title"><i className="ti ti-info-circle" /> {selected.nom}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {onNavigateEcole && (
                  <button className="btn-sm teal" style={{ fontSize: 11 }} onClick={() => onNavigateEcole(selected.id, 'candidat-ecoles', filters)}>
                    <i className="ti ti-external-link" /> Page publique
                  </button>
                )}
                <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setSelected(null)}><i className="ti ti-x" /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {selected.ville      && <span className="pill"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {selected.ville}</span>}
              {selected.region     && <span className="pill">{selected.region}</span>}
              {selected.academie   && <span className="pill">Acad. {selected.academie}</span>}
              {selected.type_ecole && <span className="pill">{selected.type_ecole}</span>}
              {(selected.secteurs || []).map(s => <span key={s} className="pill purple" style={{ fontSize: 10 }}>{s}</span>)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {selected.adresse   && <span><i className="ti ti-map" style={{ fontSize: 11 }} /> {selected.adresse}{selected.code_postal ? ', ' + selected.code_postal : ''}</span>}
              {selected.telephone && <span><i className="ti ti-phone" style={{ fontSize: 11 }} /> {selected.telephone}</span>}
              {selected.email     && <span><i className="ti ti-mail" style={{ fontSize: 11 }} /> {selected.email}</span>}
              {selected.site_web  && <span style={{ color: 'var(--teal)', cursor: 'pointer' }} onClick={() => window.open(selected.site_web.startsWith('http') ? selected.site_web : 'https://' + selected.site_web, '_blank')}><i className="ti ti-world" style={{ fontSize: 11 }} /> {selected.site_web}</span>}
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="ti ti-certificate" /> Formations ({formations.length})
            </div>
            {loadingF ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chargement…</div>
            ) : formations.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune formation enregistrée.</div>
            ) : formations.map(f => (
              <div key={f.id} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div
                  style={{ fontSize: 13, fontWeight: 500, color: onNavigateFormation ? 'var(--teal)' : 'var(--navy)', marginBottom: 2, cursor: onNavigateFormation ? 'pointer' : 'default' }}
                  onClick={() => onNavigateFormation?.(f.id, 'candidat-ecoles', filters)}
                >
                  {f.nom}
                  {onNavigateFormation && <i className="ti ti-chevron-right" style={{ fontSize: 11, marginLeft: 4 }} />}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {f.niveau && f.niveau !== 'autre' && <span className="pill">{NIVEAU_LABEL[f.niveau] || f.niveau}</span>}
                  {f.localite_formation && <span className="pill"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {f.localite_formation}</span>}
                  {f.url_onisep && <span className="pill teal" style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); window.open(f.url_onisep, '_blank') }}><i className="ti ti-external-link" style={{ fontSize: 10 }} /> ONISEP</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
