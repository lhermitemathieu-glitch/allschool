'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'
const REGIONS = [
  { code: '84', label: 'Auvergne-Rhône-Alpes',      lat: 45.44, lng: 4.39  },
  { code: '27', label: 'Bourgogne-Franche-Comté',    lat: 47.28, lng: 5.00  },
  { code: '53', label: 'Bretagne',                   lat: 48.11, lng: -2.93 },
  { code: '24', label: 'Centre-Val de Loire',        lat: 47.51, lng: 1.68  },
  { code: '94', label: 'Corse',                      lat: 42.03, lng: 9.01  },
  { code: '44', label: 'Grand Est',                  lat: 48.46, lng: 6.56  },
  { code: '32', label: 'Hauts-de-France',            lat: 50.27, lng: 2.80  },
  { code: '11', label: 'Île-de-France',              lat: 48.85, lng: 2.35  },
  { code: '28', label: 'Normandie',                  lat: 49.18, lng: 0.36  },
  { code: '75', label: 'Nouvelle-Aquitaine',         lat: 44.78, lng: 0.00  },
  { code: '76', label: 'Occitanie',                  lat: 43.87, lng: 2.56  },
  { code: '52', label: 'Pays de la Loire',           lat: 47.76, lng: -0.55 },
  { code: '93', label: "Provence-Alpes-Côte d'Azur", lat: 43.94, lng: 6.07  },
]

const inputStyle = {
  flex: 1, minWidth: 140, padding: '8px 12px',
  border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)', background: 'white', outline: 'none',
}

function sigle(nom) {
  return (nom || '').split(' ').filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

// Regroupe les formations LBA par école (UAI ou SIRET comme clé)
function grouperParEcole(formations) {
  const map = new Map()
  for (const f of formations) {
    const key = f.uai || f.ecole_siret || f.ecole_nom
    if (!key) continue
    if (!map.has(key)) {
      map.set(key, {
        key,
        uai:          f.uai,
        siret:        f.ecole_siret,
        nom:          f.ecole_nom,
        email:        f.ecole_email,
        qualiopi:     f.ecole_qualiopi,
        ville:        f.ville,
        region:       f.region,
        departement:  f.departement,
        academie:     f.academie,
        ecole_id:     f.ecole_id,
        ecole_site_web: f.ecole_site_web,
        ecole_adresse: f.ecole_adresse,
        ecole_cp:     f.ecole_cp,
        lat:          f.ecole_geo_lat,
        lng:          f.ecole_geo_lng,
        formations:   [],
      })
    }
    map.get(key).formations.push(f)
  }
  return [...map.values()].sort((a, b) => b.formations.length - a.formations.length)
}

export default function PanelCandidatEcoles({ onNavigateEcole, initialFilters }) {
  const supabase = createClient()

  const [ecoles,    setEcoles]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [searched,  setSearched]  = useState(false)

  // Filtres
  const ls = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('allschool_ecoles_filters') || '{}') } catch { return {} } })()
    : {}
  const [keyword,  setKeyword]  = useState(initialFilters?.keyword || ls.keyword || '')
  const [modalite, setModalite] = useState(initialFilters?.modalite || ls.modalite || '')
  const [ville,    setVille]    = useState(initialFilters?.ville || ls.ville || '')
  const [geoSel,   setGeoSel]   = useState(ls.geoSel || null)
  const [rayon,    setRayon]    = useState(initialFilters?.rayon || ls.rayon || '30')
  const [suggestions, setSuggestions] = useState([])
  const [geoErr,   setGeoErr]   = useState('')

  // Sauvegarde automatique dès que les filtres changent (pas seulement au clic Rechercher)
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('allschool_ecoles_filters', JSON.stringify({ keyword, modalite, ville, geoSel, rayon }))
  }, [keyword, modalite, ville, geoSel, rayon])

  // ── Autocomplete géo ────────────────────────────────────────────────────────
  async function fetchSuggestions(val) {
    if (val.length < 2) { setSuggestions([]); return }
    const q = val.toLowerCase().trim()
    const results = []

    if ('france'.startsWith(q) || 'france entière'.startsWith(q)) {
      results.push({ type: 'france', label: 'France entière', icon: 'ti-world' })
    }
    REGIONS.filter(r => r.label.toLowerCase().includes(q)).forEach(r => {
      results.push({ type: 'region', label: r.label, icon: 'ti-map', code: r.code, lat: r.lat, lng: r.lng })
    })

    if (val.length >= 3) {
      const [deptRes, commRes] = await Promise.all([
        fetch(`https://geo.api.gouv.fr/departements?nom=${encodeURIComponent(val)}&fields=nom,centre,code&limit=3`).then(r => r.json()).catch(() => []),
        fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(val)}&fields=nom,centre,codeDepartement&boost=population&limit=5`).then(r => r.json()).catch(() => []),
      ])
      ;(deptRes || []).forEach(d => {
        if (d.centre) results.push({ type: 'departement', label: `Département ${d.nom}`, icon: 'ti-map-2', lat: d.centre.coordinates[1], lng: d.centre.coordinates[0] })
      })
      ;(commRes || []).forEach(c => {
        if (c.centre) results.push({ type: 'commune', label: c.nom, icon: 'ti-map-pin', lat: c.centre.coordinates[1], lng: c.centre.coordinates[0] })
      })
    }
    setSuggestions(results.slice(0, 8))
  }

  function selectSuggestion(s) { setVille(s.label); setGeoSel(s); setSuggestions([]) }
  function clearGeo() { setVille(''); setGeoSel(null); setSuggestions([]) }

  // ── Recherche ────────────────────────────────────────────────────────────────
  const search = useCallback(async () => {
    setLoading(true); setSearched(true); setGeoErr(''); setEcoles([])

    if (!geoSel) {
      setLoading(false)
      return
    }

    try {
      const buildParams = (geoOverride = {}) => {
        const p = new URLSearchParams()
        p.set('mode', 'ecoles')
        if (keyword.trim()) p.set('keyword', keyword.trim())
        if (modalite)       p.set('modalite', modalite)
        if (geoOverride.lat) {
          p.set('latitude',  String(geoOverride.lat))
          p.set('longitude', String(geoOverride.lng))
          p.set('radius',    rayon || '30')
        } else if (geoOverride.region) {
          p.set('region', geoOverride.region)
        }
        return p
      }

      let fetches = []
      if (geoSel.type === 'france') {
        fetches = REGIONS.map(r =>
          fetch(`/api/formations-lba?${buildParams({ region: r.code })}`).then(res => res.json()).catch(() => ({ results: [] }))
        )
      } else if (geoSel.type === 'region') {
        fetches = [fetch(`/api/formations-lba?${buildParams({ region: geoSel.code })}`).then(res => res.json()).catch(() => ({ results: [] }))]
      } else {
        fetches = [fetch(`/api/formations-lba?${buildParams({ lat: geoSel.lat, lng: geoSel.lng })}`).then(res => res.json()).catch(() => ({ results: [] }))]
      }

      const jsons = await Promise.all(fetches)
      const seen = new Set()
      const allFormations = []
      for (const json of jsons) {
        for (const f of (json.results || [])) {
          if (f.lba_id && seen.has(f.lba_id)) continue
          if (f.lba_id) seen.add(f.lba_id)
          allFormations.push(f)
        }
      }

      // Filtre keyword côté client sur nom école OU nom formation si pas passé à l'API
      const kw = keyword.trim().toLowerCase()
      const filtered = kw
        ? allFormations.filter(f =>
            f.ecole_nom?.toLowerCase().includes(kw) ||
            f.nom?.toLowerCase().includes(kw)
          )
        : allFormations

      setEcoles(grouperParEcole(filtered))
    } catch (err) {
      setGeoErr('Erreur lors de la recherche.')
    } finally {
      setLoading(false)
    }
  }, [keyword, modalite, ville, geoSel, rayon])

  const nbEcoles = ecoles.length
  const nbFormations = ecoles.reduce((s, e) => s + e.formations.length, 0)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles</div>
          <div className="page-sub">
            {searched && !loading
              ? `${nbEcoles} école${nbEcoles !== 1 ? 's' : ''} · ${nbFormations} formation${nbFormations !== 1 ? 's' : ''}`
              : 'Recherchez des CFA et écoles en alternance'}
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Mots-clés (école, formation…)"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={inputStyle}
          />
          <select value={modalite} onChange={e => setModalite(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 180 }}>
            <option value="">Présentiel & distanciel</option>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel">Distanciel</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Champ géo unifié */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
              <i className={`ti ${geoSel ? (geoSel.icon || 'ti-map-pin') : 'ti-map-pin'}`} style={{ padding: '0 10px', color: geoSel ? 'var(--teal)' : 'var(--muted)', fontSize: 15 }} />
              <input
                placeholder="Ville, département, région ou France…"
                value={ville}
                onChange={e => { setVille(e.target.value); setGeoSel(null); setGeoErr(''); fetchSuggestions(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); search() } if (e.key === 'Escape') setSuggestions([]) }}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1, padding: '8px 8px 8px 0' }}
              />
              {ville && <button onClick={clearGeo} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--muted)', fontSize: 13 }}>×</button>}
            </div>
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {suggestions.map((s, i) => (
                  <div key={i} onMouseDown={() => selectSuggestion(s)}
                    style={{ padding: '8px 14px', fontSize: 13, color: 'var(--navy)', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '0.5px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <i className={`ti ${s.icon}`} style={{ fontSize: 12, color: 'var(--teal)', flexShrink: 0 }} />
                    <span>{s.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
                      {s.type === 'france' ? 'Toute la France' : s.type === 'region' ? 'Région' : s.type === 'departement' ? 'Département' : 'Commune'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(!geoSel || geoSel.type === 'commune' || geoSel.type === 'departement') && (
            <select value={rayon} onChange={e => setRayon(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 130 }}>
              <option value="">— Rayon —</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
              <option value="30">30 km</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
            </select>
          )}

          {geoErr && <span style={{ fontSize: 12, color: 'var(--accent)' }}><i className="ti ti-alert-circle" /> {geoErr}</span>}

          <button className="btn-sm teal" onClick={search} style={{ marginLeft: 'auto' }}>
            <i className="ti ti-search" /> Rechercher
          </button>
        </div>

        {geoSel?.type === 'france' && (
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 12 }} />
            Recherche sur toute la France — peut prendre quelques secondes
          </div>
        )}
      </div>

      {/* Résultats */}
      <div className="s-card" style={{ marginBottom: 0 }}>
        {!searched ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <i className="ti ti-school" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: 0.3 }} />
            Sélectionnez une localisation et cliquez sur <strong>Rechercher</strong>.
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Recherche en cours…
          </div>
        ) : !geoSel ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            <i className="ti ti-map-pin" style={{ marginRight: 6 }} />
            Sélectionnez une localisation pour lancer la recherche.
          </div>
        ) : ecoles.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune école trouvée pour ces critères.</div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
              {nbEcoles} école{nbEcoles > 1 ? 's' : ''} · {nbFormations} formation{nbFormations > 1 ? 's' : ''}
            </div>
            {ecoles.map(e => (
              <EcoleRow
                key={e.key}
                ecole={e}
                onClick={() => onNavigateEcole?.(e)}
              />
            ))}
          </>
        )}
      </div>
    </>
  )
}

// ── Ligne école dans la liste ─────────────────────────────────────────────────
function EcoleRow({ ecole: e, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, transition: 'background 0.12s' }}
      onMouseEnter={el => el.currentTarget.style.background = 'var(--light)'}
      onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'var(--purple-soft)', color: 'var(--purple-mid)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 12,
      }}>
        {sigle(e.nom)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {e.nom || 'École sans nom'}
          {e.qualiopi && (
            <span style={{ marginLeft: 6, fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
              Qualiopi
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {[e.ville, e.region].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600, flexShrink: 0, textAlign: 'right' }}>
        {e.formations.length} formation{e.formations.length > 1 ? 's' : ''}
      </div>
      <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--muted)', flexShrink: 0 }} />
    </div>
  )
}

