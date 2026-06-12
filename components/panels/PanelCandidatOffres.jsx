'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'
import { SECTEURS } from '../../lib/secteurs'
import { typeInfo } from '../../lib/offre-types'
import { NIVEAUX, niveauLabel } from '../../lib/niveaux'
import { verifier } from '../ui/Toaster'

// Centres géographiques approximatifs des régions (pour l'API LBA qui n'accepte que lat/lng)
const REGIONS = [
  { code: '84', label: 'Auvergne-Rhône-Alpes',      lat: 45.44, lng: 4.39,  radius: 220 },
  { code: '27', label: 'Bourgogne-Franche-Comté',    lat: 47.28, lng: 5.00,  radius: 180 },
  { code: '53', label: 'Bretagne',                   lat: 48.11, lng: -2.93, radius: 150 },
  { code: '24', label: 'Centre-Val de Loire',        lat: 47.51, lng: 1.68,  radius: 160 },
  { code: '94', label: 'Corse',                      lat: 42.03, lng: 9.01,  radius: 100 },
  { code: '44', label: 'Grand Est',                  lat: 48.46, lng: 6.56,  radius: 220 },
  { code: '32', label: 'Hauts-de-France',            lat: 50.27, lng: 2.80,  radius: 150 },
  { code: '11', label: 'Île-de-France',              lat: 48.85, lng: 2.35,  radius: 80  },
  { code: '28', label: 'Normandie',                  lat: 49.18, lng: 0.36,  radius: 160 },
  { code: '75', label: 'Nouvelle-Aquitaine',         lat: 44.78, lng: 0.00,  radius: 250 },
  { code: '76', label: 'Occitanie',                  lat: 43.87, lng: 2.56,  radius: 250 },
  { code: '52', label: 'Pays de la Loire',           lat: 47.76, lng: -0.55, radius: 160 },
  { code: '93', label: "Provence-Alpes-Côte d'Azur", lat: 43.94, lng: 6.07,  radius: 180 },
]

const TYPE_INFO = {
  sourcee:   { label: 'Offre sourcée',         icon: 'ti-search',       color: '#15803d', bg: '#f0fdf4',
    desc: 'Offre disponible sur différentes plateformes et sites d\'emploi (France Travail, Monster, etc.).' },
  spontanee: { label: 'Candidature spontanée', icon: 'ti-mail-forward', color: '#c2410c', bg: '#fff7ed',
    desc: 'Entreprise à fort potentiel de recrutement sans offre publiée actuellement, identifiée par La Bonne Alternance. Nécessite un suivi actif.' },
  allschool: { label: 'Offre Allschool',       icon: 'ti-rosette',      color: '#5b21b6', bg: '#ede9fe',
    desc: 'Offre que nous recherchons directement. Le nombre de réponses est encore limité mais nous travaillons activement à l\'enrichir.' },
}

const inputStyle = {
  flex: 1, minWidth: 140, padding: '8px 12px',
  border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)', background: 'white', outline: 'none',
}

export default function PanelCandidatOffres({ onNavigateCandidatures, onNavigateArchives }) {
  const supabase = createClient()

  const [resultats,   setResultats]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [lbaLoading,  setLbaLoading]  = useState(false)
  const [searched,    setSearched]    = useState(false)
  const [lbaError,    setLbaError]    = useState('')
  const [cachedIds,   setCachedIds]   = useState(new Set())
  const [savedIds,    setSavedIds]    = useState(new Set())

  // Filtres restaurés depuis localStorage
  const ls = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('allschool_offres_filtres') || '{}') } catch { return {} } })()
    : {}
  const [q,       setQ]       = useState(ls.q       || '')
  const [secteur, setSecteur] = useState(ls.secteur || '')
  const [niveau,  setNiveau]  = useState(ls.niveau  || '')
  const [contrat, setContrat] = useState(ls.contrat || '')

  // Géo unifié
  const [ville,       setVille]       = useState(ls.ville || '')
  const [geoSel,      setGeoSel]      = useState(ls.geoSel || null)
  const [rayon,       setRayon]       = useState(ls.rayon || '30')
  const [suggestions, setSuggestions] = useState([])
  const [geoErr,      setGeoErr]      = useState('')

  // Filtre types d'offres
  const [typesFiltres, setTypesFiltres] = useState(ls.typesFiltres || ['sourcee', 'spontanee', 'allschool'])

  // Info légendes types
  const [showTypeInfo, setShowTypeInfo] = useState(false)

  function persistFilters(extra = {}) {
    localStorage.setItem('allschool_offres_filtres', JSON.stringify({
      q, secteur, niveau, contrat, ville, geoSel, rayon, typesFiltres, ...extra,
    }))
  }

  function toggleType(key) {
    setTypesFiltres(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      persistFilters({ typesFiltres: next })
      return next
    })
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('candidat_offres_cachees').select('offre_id').eq('candidat_id', user.id)
        .then(({ data }) => { if (data) setCachedIds(new Set(data.map(d => d.offre_id))) })
    })
  }, [])

  // ── Autocomplete géo ─────────────────────────────────────────────────────────
  async function fetchSuggestions(val) {
    if (val.length < 2) { setSuggestions([]); return }
    const q = val.toLowerCase().trim()
    const results = []

    if ('france'.startsWith(q) || 'france entière'.startsWith(q)) {
      results.push({ type: 'france', label: 'France entière', icon: 'ti-world' })
    }

    REGIONS.filter(r => r.label.toLowerCase().includes(q)).forEach(r => {
      results.push({ type: 'region', label: r.label, icon: 'ti-map', code: r.code, lat: r.lat, lng: r.lng, radius: r.radius })
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
    persistFilters()
    setLoading(true); setLbaLoading(false); setSearched(true); setLbaError(''); setResultats([])

    // ── 1. Offres Allschool ──────────────────────────────────────────────────
    let query = supabase
      .from('offres')
      .select(`id, titre, niveau, secteur, ville, description, type_contrat, competences, missions, recherche, date_prise_poste, preference_ecole, updated_at, type_offre, entreprises ( raison_sociale, ville )`)
      .eq('statut', 'active')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (q.trim())      query = query.ilike('titre',   `%${q.trim()}%`)
    if (secteur)       query = query.ilike('secteur', `%${secteur}%`)
    if (niveau)        query = query.eq('niveau', niveau)
    if (contrat)       query = query.contains('type_contrat', [contrat])
    if (ville.trim() && (!geoSel || geoSel.type === 'commune')) {
      query = query.ilike('ville', `%${geoSel ? geoSel.label : ville.trim()}%`)
    }

    const { data: allschoolData } = await query
    const allschoolOffres = (allschoolData || []).map(o => ({
      _id:              `allschool-${o.id}`,
      _source:          'allschool',
      tag:              o.type_offre || 'allschool',
      titre:            o.titre,
      entreprise:       o.entreprises?.raison_sociale || '',
      ville:            o.ville || '',
      contrat:          (o.type_contrat || []).join(', '),
      niveau:           o.niveau ? niveauLabel(o.niveau) : '',
      description:      o.description || '',
      missions:         o.missions || '',
      competences:      o.competences || '',
      recherche:        o.recherche || '',
      date:             o.updated_at,
      url:              null,
      preference_ecole: o.preference_ecole,
      date_prise_poste: o.date_prise_poste,
      _raw:             o,
    }))

    setResultats(allschoolOffres)
    setLoading(false)

    // ── 2. Offres LBA ────────────────────────────────────────────────────────
    // Ville tapée sans clic sur une suggestion : on résout la commune
    // automatiquement (sinon la recherche nationale était sautée en silence).
    let geo = geoSel
    if (!geo && ville.trim()) {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(ville.trim())}&fields=nom,centre&boost=population&limit=1`)
        const [commune] = await res.json()
        if (commune?.centre) {
          geo = { type: 'commune', label: commune.nom, lat: commune.centre.coordinates[1], lng: commune.centre.coordinates[0] }
        }
      } catch { /* géocodage indisponible */ }
      if (!geo) {
        setGeoErr(`Localisation « ${ville.trim()} » introuvable — choisissez une suggestion dans la liste.`)
        return
      }
    }
    if (!geo) {
      setLbaError('Indiquez une localisation (ville, département, région ou France) pour voir les offres nationales.')
      return
    }

    setLbaLoading(true)
    try {
      const buildParams = (lat, lng, rad) => {
        const p = new URLSearchParams({ latitude: lat, longitude: lng, radius: rad })
        if (secteur) p.set('secteur', secteur)
        if (q.trim()) p.set('q', q.trim())
        return p
      }

      let fetches = []
      if (geo.type === 'france') {
        fetches = REGIONS.map(r =>
          fetch(`/api/alternance?${buildParams(r.lat, r.lng, r.radius)}`).then(res => res.json()).catch(() => ({ jobs: [] }))
        )
      } else if (geo.type === 'region') {
        const reg = REGIONS.find(r => r.code === geo.code)
        if (reg) fetches = [fetch(`/api/alternance?${buildParams(reg.lat, reg.lng, reg.radius)}`).then(res => res.json()).catch(() => ({ jobs: [] }))]
      } else {
        // commune ou département
        fetches = [fetch(`/api/alternance?${buildParams(geo.lat, geo.lng, rayon || '30')}`).then(res => res.json()).catch(() => ({ jobs: [] }))]
      }

      const jsons = await Promise.all(fetches)

      // Erreur API : on l'affiche au lieu de montrer "0 offre" en silence
      if (jsons.length > 0 && jsons.every(j => j.error)) {
        setLbaError(jsons[0].error)
      }
      const seen = new Set()
      const niveauFiltre = niveau ? niveauLabel(niveau) : null

      const lbaOffres = jsons
        .flatMap(json => json.jobs || [])
        .filter(o => {
          const key = o.id || o.titre + o.entreprise
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .filter(o => !niveauFiltre || o.niveau === niveauFiltre || o.niveau === '')
        .map(o => ({
          _id:         `lba-${o.id || Math.random()}`,
          _source:     'lba',
          tag:         o.tag,
          titre:       o.titre,
          entreprise:  o.entreprise || '',
          ville:       o.ville || '',
          contrat:     o.contrat || '',
          niveau:      o.niveau || '',
          description: o.description || '',
          missions:    '',
          competences: '',
          recherche:   '',
          date:        o.date_creation,
          url:         o.url,
          preference_ecole: false,
          date_prise_poste: null,
        }))

      setResultats(prev => [...prev, ...lbaOffres])
    } catch (err) {
      setLbaError(err.message || 'Impossible de charger les offres nationales.')
    } finally {
      setLbaLoading(false)
    }
  }, [q, secteur, niveau, contrat, ville, geoSel, rayon, typesFiltres])

  async function masquer(offre) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('candidat_offres_cachees').upsert({
      candidat_id: user.id, offre_id: offre._id, offre_data: offre,
    }, { onConflict: 'candidat_id,offre_id' })
    if (!verifier(error, 'Impossible de masquer cette offre.')) return
    setCachedIds(prev => new Set([...prev, offre._id]))
  }

  async function enregistrer(offre) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('candidat_candidatures').insert({
      candidat_id:    user.id,
      nom_entreprise: offre.entreprise || 'Entreprise',
      poste:          offre.titre,
      url:            offre.url || '',
      type:           offre.tag === 'allschool' ? 'allschool' : offre.tag,
      statut:         'a_faire',
      notes:          '',
    })
    if (!verifier(error, 'L\'enregistrement de l\'offre dans vos candidatures a échoué.')) return
    setSavedIds(prev => new Set([...prev, offre._id]))
  }

  const resultatsAffiches = resultats
    .filter(o => !cachedIds.has(o._id))
    .filter(o => typesFiltres.includes(o.tag))
  const nbResultats = resultatsAffiches.length

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Offres d'alternance</div>
          <div className="page-sub">
            {searched && !(loading || lbaLoading)
              ? `${nbResultats} offre${nbResultats !== 1 ? 's' : ''} trouvée${nbResultats !== 1 ? 's' : ''}`
              : searched
                ? 'Recherche en cours…'
                : 'Recherchez parmi les offres d\'alternance'}
          </div>
        </div>
        {onNavigateArchives && cachedIds.size > 0 && (
          <button className="btn-sm" style={{ fontSize: 11 }} onClick={onNavigateArchives}>
            <i className="ti ti-archive" /> Archivées ({cachedIds.size})
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>

        {/* Ligne 1 : mots-clés, secteur, niveau, contrat */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Mots-clés (titre, poste…)"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={inputStyle}
          />
          <select value={secteur} onChange={e => setSecteur(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 200 }}>
            <option value="">Tous les secteurs</option>
            {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={niveau} onChange={e => setNiveau(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 160 }}>
            <option value="">Tous niveaux</option>
            {NIVEAUX.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
          <select value={contrat} onChange={e => setContrat(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 190 }}>
            <option value="">Tous types de contrat</option>
            <option value="Contrat d'apprentissage">Apprentissage</option>
            <option value="Contrat de professionnalisation">Professionnalisation</option>
          </select>
        </div>

        {/* Ligne 2 : localisation + rayon + rechercher */}
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

          {/* Rayon (masqué si France ou région) */}
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

        {/* Filtres types d'offres */}
        <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginRight: 2 }}>Type d'offre</span>
          {Object.entries(TYPE_INFO).map(([key, t]) => {
            const active = typesFiltres.includes(key)
            return (
              <label key={key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 100, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                border: `1.5px solid ${active ? t.color : 'var(--border)'}`,
                background: active ? t.bg : 'white',
                color: active ? t.color : 'var(--muted)',
                transition: 'all 0.15s',
              }}>
                <input type="checkbox" checked={active} onChange={() => toggleType(key)} style={{ display: 'none' }} />
                <i className={`ti ${t.icon}`} style={{ fontSize: 12 }} />
                {t.label}
              </label>
            )
          })}
          <button
            onClick={() => setShowTypeInfo(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 2 }}
            title="En savoir plus sur les types d'offres"
          >
            <i className="ti ti-help-circle" style={{ fontSize: 14 }} />
            {showTypeInfo ? 'Masquer' : 'Comprendre les types'}
          </button>
        </div>

        {/* Légendes types — dépliables */}
        {showTypeInfo && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            {Object.entries(TYPE_INFO).map(([key, t]) => (
              <div key={key} style={{ flex: '1 1 220px', background: t.bg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${t.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: t.color }}>
                    <i className={`ti ${t.icon}`} style={{ fontSize: 12 }} /> {t.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--navy)', lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Résultats */}
      <div className="s-card" style={{ marginBottom: 0 }}>
        {!searched ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <i className="ti ti-briefcase" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: 0.3 }} />
            Utilisez les filtres et cliquez sur <strong>Rechercher</strong> pour voir les offres.
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chargement…</div>
        ) : (
          <>
            {lbaLoading && (
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                Recherche des offres LBA en cours…
              </div>
            )}

            {lbaError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fff1f2', color: '#be123c', fontSize: 12, marginBottom: 10 }}>
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{lbaError}
              </div>
            )}

            {resultatsAffiches.length === 0 && !lbaLoading ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune offre ne correspond à vos critères.</div>
            ) : (
              <>
                {resultatsAffiches.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                    {nbResultats} offre{nbResultats > 1 ? 's' : ''}
                    {lbaLoading && <span style={{ marginLeft: 6, opacity: 0.6 }}>• chargement LBA…</span>}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {resultatsAffiches.map((o, i) => (
                    <OffreCard
                      key={o._id || i}
                      offre={o}
                      saved={savedIds.has(o._id)}
                      onMasquer={() => masquer(o)}
                      onEnregistrer={() => enregistrer(o)}
                      onVoirCandidatures={onNavigateCandidatures}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ── Carte offre ────────────────────────────────────────────────────────────────
function OffreCard({ offre: o, saved, onMasquer, onEnregistrer, onVoirCandidatures }) {
  const [open, setOpen] = useState(false)
  const tag = typeInfo(o.tag)
  const hasDetails = o.description || o.missions || o.competences || o.recherche

  return (
    <div style={{ display: 'flex', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: 'white' }}>
      <div style={{ width: 4, flexShrink: 0, background: tag.color, borderRadius: '10px 0 0 10px' }} />
      <div style={{ flex: 1, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Titre + tag */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                {o.titre}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: tag.bg, color: tag.color }}>
                <i className={`ti ${tag.icon}`} style={{ fontSize: 10 }} />
                {tag.label}
              </span>
              {o.niveau && <span className="pill teal" style={{ fontSize: 10 }}>{o.niveau}</span>}
            </div>

            {/* Entreprise + ville */}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              <i className="ti ti-building" style={{ marginRight: 4 }} />
              {o.entreprise || 'Entreprise'}
              {o.ville ? ` · ${o.ville}` : ''}
            </div>

            {o.contrat && (
              <div style={{ marginBottom: 6 }}>
                <span className="pill accent" style={{ fontSize: 10 }}>{o.contrat}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {o.date_prise_poste && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  <i className="ti ti-calendar" style={{ marginRight: 3 }} />
                  {new Date(o.date_prise_poste).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {o.preference_ecole && (
                <span style={{ fontSize: 11, color: 'var(--purple-mid)' }}>
                  <i className="ti ti-school" style={{ marginRight: 3 }} />Préférence école
                </span>
              )}
              {o.date && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {o._source === 'allschool' ? 'Actualisée' : 'Publiée'} le {new Date(o.date).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {hasDetails && (
              <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setOpen(v => !v)}>
                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} /> {open ? 'Moins' : 'Détails'}
              </button>
            )}
            {o.url && (
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="btn-sm" style={{ fontSize: 11, textDecoration: 'none' }}>
                <i className="ti ti-external-link" /> Voir l'offre
              </a>
            )}
            {saved ? (
              <button className="btn-sm teal" style={{ fontSize: 11, opacity: 0.7, cursor: 'default' }} onClick={onVoirCandidatures}>
                <i className="ti ti-check" /> Enregistrée
              </button>
            ) : (
              <button className="btn-sm teal" style={{ fontSize: 11 }} onClick={onEnregistrer}>
                <i className="ti ti-bookmark" /> Enregistrer
              </button>
            )}
            <button className="btn-sm" style={{ fontSize: 11, color: 'var(--muted)' }} onClick={onMasquer} title="Ne plus voir cette offre">
              <i className="ti ti-eye-off" />
            </button>
          </div>
        </div>

        {open && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {o.missions && <div><div style={sectionLabel}>Missions</div><div style={sectionText}>{o.missions}</div></div>}
            {o.competences && <div><div style={sectionLabel}>Compétences attendues</div><div style={sectionText}>{o.competences}</div></div>}
            {o.recherche && <div><div style={sectionLabel}>Ce que nous recherchons</div><div style={sectionText}>{o.recherche}</div></div>}
            {o.description && <div><div style={sectionLabel}>Description</div><div style={sectionText}>{o.description}</div></div>}
          </div>
        )}
      </div>
    </div>
  )
}

const sectionLabel = {
  fontSize: 11, fontWeight: 700, color: 'var(--navy)',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
}

const sectionText = {
  fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
}
