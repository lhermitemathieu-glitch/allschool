'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'
import { STATUTS } from './PanelFormationPublique'
import { SECTEUR_ROME } from '../../lib/rome-mapping'
import { NIVEAUX } from '../../lib/niveaux'
import PanelFormationLBADrawer from './PanelFormationLBADrawer'

const SECTEURS = Object.keys(SECTEUR_ROME).sort()

const REGIONS = [
  { code: '84', label: 'Auvergne-Rhône-Alpes' },
  { code: '27', label: 'Bourgogne-Franche-Comté' },
  { code: '53', label: 'Bretagne' },
  { code: '24', label: 'Centre-Val de Loire' },
  { code: '94', label: 'Corse' },
  { code: '44', label: 'Grand Est' },
  { code: '32', label: 'Hauts-de-France' },
  { code: '11', label: 'Île-de-France' },
  { code: '28', label: 'Normandie' },
  { code: '75', label: 'Nouvelle-Aquitaine' },
  { code: '76', label: 'Occitanie' },
  { code: '52', label: 'Pays de la Loire' },
  { code: '93', label: "Provence-Alpes-Côte d'Azur" },
]

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

const NIVEAU_LABEL = {
  cap: 'CAP', bac: 'Bac Pro', bts: 'BTS', bts_agri: 'BTS Agricole',
  deust: 'DEUST', afpa3: 'Niv 3 – AFPA', niv3: 'Niv 3 – Autre',
  bach: 'Bachelor', master: 'Master', autre: 'Autre',
}

const NIVEAUX_FILTER = [
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
  flex: 1, minWidth: 140, padding: '8px 12px',
  border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)', background: 'white', outline: 'none',
}

// ── Sélecteur de statut compact ───────────────────────────────────────────────
function StatutPicker({ formationId, currentStatut, candidatId, onChange }) {
  const supabase = createClient()
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function select(key) {
    setSaving(true)
    setOpen(false)
    if (currentStatut === key) {
      await supabase.from('formation_statuts').delete().eq('candidat_id', candidatId).eq('formation_id', formationId)
      onChange(formationId, null)
    } else {
      await supabase.from('formation_statuts').upsert({
        candidat_id: candidatId, formation_id: formationId,
        statut: key, updated_at: new Date().toISOString(),
      })
      onChange(formationId, key)
    }
    setSaving(false)
  }

  const cfg = STATUTS.find(s => s.key === currentStatut)

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => !saving && setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
          cursor: saving ? 'wait' : 'pointer',
          border: `1.5px solid ${cfg ? cfg.color : 'var(--border)'}`,
          background: cfg ? cfg.bg : 'white',
          color: cfg ? cfg.color : 'var(--muted)',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        <i className={`ti ${saving ? 'ti-loader' : cfg ? cfg.icon : 'ti-bookmark'}`} style={{ fontSize: 11 }} />
        {cfg ? cfg.label : 'Statut'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          background: 'white', border: '1.5px solid var(--border)', borderRadius: 10,
          zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden',
        }}>
          {STATUTS.map((s, i) => (
            <div
              key={s.key}
              onMouseDown={() => select(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer', fontSize: 12,
                background: currentStatut === s.key ? s.bg : 'white',
                color: currentStatut === s.key ? s.color : 'var(--navy)',
                fontWeight: currentStatut === s.key ? 600 : 400,
                borderBottom: i < STATUTS.length - 1 ? '0.5px solid var(--border)' : 'none',
              }}
            >
              <i className={`ti ${s.icon}`} style={{ fontSize: 12, color: s.color, flexShrink: 0 }} />
              {s.label}
              {currentStatut === s.key && <i className="ti ti-check" style={{ marginLeft: 'auto', fontSize: 11 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function PanelCandidatFormations({ candidatId, onNavigateFormation, onNavigateEcole, onNavigateArchives, initialFilters }) {
  const supabase = createClient()

  const [formations, setFormations] = useState([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)
  const [total, setTotal]           = useState(null)

  const [drawerFormation, setDrawerFormation] = useState(null)

  const [statuts,    setStatuts]    = useState({})
  const [savedIds,   setSavedIds]   = useState(new Set())   // formation_id enregistrées (Supabase)
  const [lbaSavedIds, setLbaSavedIds] = useState(new Set()) // lba_id enregistrés
  const [cachedIds,  setCachedIds]  = useState(new Set())   // formation_id masquées
  const [saving,     setSaving]     = useState(new Set())   // IDs en cours d'enregistrement

  // Filtres
  const [keyword,  setKeyword]  = useState(initialFilters?.keyword || initialFilters?.q || '')
  const [secteur,  setSecteur]  = useState(initialFilters?.secteur  || '')
  const [niveau,   setNiveau]   = useState(initialFilters?.niveau   || '')
  const [modalite, setModalite] = useState(initialFilters?.modalite || '')

  const [ville,       setVille]       = useState(initialFilters?.ville     || '')
  const [villeCity,   setVilleCity]   = useState(initialFilters?.villeCity || '')
  const [villeLat,    setVilleLat]    = useState(initialFilters?.villeLat  || null)
  const [villeLng,    setVilleLng]    = useState(initialFilters?.villeLng  || null)
  const [rayon,       setRayon]       = useState(initialFilters?.rayon     || '')
  const [region,      setRegion]      = useState(initialFilters?.region    || '')
  const [suggestions, setSuggestions] = useState([])
  const [geoErr,      setGeoErr]      = useState('')
  const [geoLoading,  setGeoLoading]  = useState(false)

  useEffect(() => {
    supabase.from('formations').select('id', { count: 'exact', head: true })
      .eq('source', 'allschool')
      .then(({ count }) => setTotal(count))

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: cands }, { data: cachees }] = await Promise.all([
        supabase.from('candidat_candidatures').select('formation_id').eq('candidat_id', user.id).eq('type', 'formation').not('formation_id', 'is', null),
        supabase.from('candidat_formations_cachees').select('formation_id').eq('candidat_id', user.id),
      ])
      if (cands)   setSavedIds(new Set(cands.map(c => c.formation_id)))
      if (cachees) setCachedIds(new Set(cachees.map(c => c.formation_id)))

      // Récupère les lba_id déjà enregistrés
      if (cands && cands.length > 0) {
        const fIds = cands.map(c => c.formation_id).filter(Boolean)
        const { data: lbaForms } = await supabase
          .from('formations')
          .select('id, lba_id')
          .in('id', fIds)
          .eq('source', 'lba')
          .not('lba_id', 'is', null)
        if (lbaForms) setLbaSavedIds(new Set(lbaForms.map(f => f.lba_id)))
      }
    })
  }, [])

  async function fetchSuggestions(val) {
    if (val.length < 3) { setSuggestions([]); return }
    try {
      const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&type=municipality&limit=6`)
      if (!res.ok) { setSuggestions([]); return }
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
    setVille(s.label); setVilleCity(s.city)
    setVilleLat(s.lat); setVilleLng(s.lng)
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
    setLoading(true); setSearched(true); setGeoErr('')
    try {
      // ── 1. Géolocalisation ──────────────────────────────────────────────────
      let geoCoords = null

      if (ville.trim()) {
        if (villeLat && villeLng) {
          geoCoords = { lat: villeLat, lng: villeLng }
        } else {
          setGeoLoading(true)
          geoCoords = await geocodeVille(ville.trim())
          setGeoLoading(false)
          if (!geoCoords) {
            setGeoErr(`Ville "${ville}" introuvable`)
            setFormations([])
            setLoading(false)
            return
          }
        }
      }

      // ── 2. Recherche Allschool (Supabase) ───────────────────────────────────
      let allschoolRows = []

      // Filtre écoles par géo ou modalité
      let ecoleIds = null
      if (geoCoords && rayon) {
        const { data: nearby } = await supabase.rpc('ecoles_dans_rayon', {
          lat: geoCoords.lat, lng: geoCoords.lng, rayon_km: parseFloat(rayon),
        })
        ecoleIds = (nearby || []).map(r => r.id)
      } else if (modalite || (geoCoords && !rayon)) {
        let eQuery = supabase.from('ecoles').select('id')
        if (modalite)            eQuery = eQuery.contains('modalites', [modalite])
        if (geoCoords && !rayon) eQuery = eQuery.ilike('ville', `%${villeCity || ville.trim()}%`)
        const { data: eData } = await eQuery
        ecoleIds = (eData || []).map(e => e.id)
      }

      // Requête formations uniquement si ecoleIds non vide (ou pas de filtre géo)
      const skipAllschool = ecoleIds !== null && ecoleIds.length === 0
      if (!skipAllschool) {
        let fQuery = supabase
          .from('formations')
          .select('id, nom, diplome, niveau, modalite, url_onisep, localite_formation, ecole_id')
          .eq('source', 'allschool')
          .order('nom').limit(300)

        if (keyword.trim()) fQuery = fQuery.ilike('nom', `%${keyword.trim()}%`)
        if (niveau)         fQuery = fQuery.eq('niveau', niveau)
        if (ecoleIds && ecoleIds.length > 0) fQuery = fQuery.in('ecole_id', ecoleIds)

        const { data: fData } = await fQuery
        const ecoleUniqueIds = [...new Set((fData || []).filter(f => f.ecole_id).map(f => f.ecole_id))]
        const { data: eRows } = ecoleUniqueIds.length > 0
          ? await supabase.from('ecoles').select('id, nom, ville, region, modalites').in('id', ecoleUniqueIds)
          : { data: [] }
        const ecoleMap = Object.fromEntries((eRows || []).map(e => [e.id, e]))

        allschoolRows = (fData || [])
          .map(f => ({ ...f, _source: 'allschool', ecole: ecoleMap[f.ecole_id] }))
          .filter(f => !cachedIds.has(f.id))
      }

      // ── 3. Recherche LBA ────────────────────────────────────────────────────
      let lbaRows = []
      if (geoCoords || region) {
        const params = new URLSearchParams()
        if (secteur)        params.set('secteurs', JSON.stringify([secteur]))
        if (keyword.trim()) params.set('keyword', keyword.trim())
        if (niveau)         params.set('niveau', niveau)
        if (geoCoords) {
          params.set('latitude',  String(geoCoords.lat))
          params.set('longitude', String(geoCoords.lng))
          params.set('radius',    rayon || '30')
        } else {
          params.set('region', region)
        }

        try {
          const res  = await fetch(`/api/formations-lba?${params}`)
          const json = await res.json()
          if (res.ok && json.results) {
            lbaRows = json.results
              .filter(f => f.lba_id && !lbaSavedIds.has(f.lba_id))
              .map(f => ({ ...f, id: `lba_${f.lba_id}`, _source: 'lba' }))
          }
        } catch { /* LBA non disponible, on affiche juste Allschool */ }
      }

      setFormations([...allschoolRows, ...lbaRows])

      // Statuts pour les formations Allschool
      if (candidatId && allschoolRows.length > 0) {
        const fIds = allschoolRows.map(f => f.id)
        const { data: sData } = await supabase
          .from('formation_statuts').select('formation_id, statut')
          .eq('candidat_id', candidatId).in('formation_id', fIds)
        setStatuts(Object.fromEntries((sData || []).map(s => [s.formation_id, s.statut])))
      }
    } catch (err) {
      console.error('[formations]', err)
    } finally {
      setLoading(false)
    }
  }, [keyword, secteur, niveau, modalite, ville, villeCity, villeLat, villeLng, rayon, region, candidatId, cachedIds, lbaSavedIds])

  function handleStatutChange(formationId, newStatut) {
    setStatuts(prev => ({ ...prev, [formationId]: newStatut }))
  }

  // Enregistrer une formation Allschool (Supabase)
  async function enregistrer(f, e) {
    e.stopPropagation()
    if (savedIds.has(f.id) || saving.has(f.id)) return
    setSaving(prev => new Set([...prev, f.id]))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(prev => { const s = new Set(prev); s.delete(f.id); return s }); return }
    await supabase.from('candidat_candidatures').insert({
      candidat_id:    user.id,
      nom_entreprise: f.ecole?.nom || 'École',
      poste:          f.nom,
      type:           'formation',
      statut:         'a_faire',
      notes:          '',
      formation_id:   f.id,
    })
    setSavedIds(prev => new Set([...prev, f.id]))
    setSaving(prev => { const s = new Set(prev); s.delete(f.id); return s })
  }

  // Enregistrer une formation LBA (snapshot + candidature via API route)
  async function enregistrerLBA(f, e) {
    e.stopPropagation()
    if (lbaSavedIds.has(f.lba_id) || saving.has(f.id)) return
    setSaving(prev => new Set([...prev, f.id]))
    try {
      const res = await fetch('/api/formations-lba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation: f }),
      })
      if (res.ok) {
        setLbaSavedIds(prev => new Set([...prev, f.lba_id]))
      }
    } catch { /* ignore */ }
    setSaving(prev => { const s = new Set(prev); s.delete(f.id); return s })
  }

  async function masquer(f, e) {
    e.stopPropagation()
    if (f._source === 'lba') {
      setFormations(prev => prev.filter(x => x.id !== f.id))
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('candidat_formations_cachees').upsert({
      candidat_id:    user.id,
      formation_id:   f.id,
      formation_data: { id: f.id, nom: f.nom, niveau: f.niveau, ecole_nom: f.ecole?.nom, ecole_ville: f.ecole?.ville },
    }, { onConflict: 'candidat_id,formation_id' })
    setCachedIds(prev => new Set([...prev, f.id]))
    setFormations(prev => prev.filter(x => x.id !== f.id))
  }

  const filters = { keyword, secteur, niveau, modalite, ville, villeCity, rayon, region }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Formations</div>
          <div className="page-sub">{total !== null ? `${total} formations partenaires + résultats La Bonne Alternance` : 'Chargement…'}</div>
        </div>
        {onNavigateArchives && cachedIds.size > 0 && (
          <button className="btn-sm" style={{ fontSize: 11 }} onClick={onNavigateArchives}>
            <i className="ti ti-archive" /> Archivées ({cachedIds.size})
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
        {/* Ligne 1 : mots-clés + secteur + niveau */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Mots-clés (formation, diplôme…)"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={inputStyle}
          />
          <select
            value={secteur}
            onChange={e => setSecteur(e.target.value)}
            style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 220 }}
          >
            <option value="">Tous les secteurs</option>
            {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={niveau}
            onChange={e => setNiveau(e.target.value)}
            style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 180 }}
          >
            <option value="">Tous les niveaux</option>
            {NIVEAUX_FILTER.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
          <select
            value={modalite}
            onChange={e => setModalite(e.target.value)}
            style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 170 }}
            title="Filtre modalité (formations Allschool uniquement)"
          >
            <option value="">Toutes modalités</option>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel">Distanciel</option>
            <option value="hybride">Hybride</option>
          </select>
        </div>

        {/* Ligne 2 : localisation */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Ville + rayon */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
              <i className="ti ti-map-pin" style={{ padding: '0 10px', color: 'var(--muted)', fontSize: 15 }} />
              <input
                placeholder="Votre ville…"
                value={ville}
                onChange={e => { setVille(e.target.value); setVilleCity(''); setVilleLat(null); setVilleLng(null); setGeoErr(''); setRegion(''); fetchSuggestions(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); search() } if (e.key === 'Escape') setSuggestions([]) }}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1, padding: '8px 8px 8px 0' }}
              />
              {ville && <button onClick={() => { setVille(''); setVilleCity(''); setVilleLat(null); setVilleLng(null); setSuggestions([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--muted)', fontSize: 13 }}>×</button>}
            </div>
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {suggestions.map((s, i) => (
                  <div key={i} onMouseDown={() => selectSuggestion(s)}
                    style={{ padding: '8px 14px', fontSize: 13, color: 'var(--navy)', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <i className="ti ti-map-pin" style={{ fontSize: 11, color: 'var(--muted)', marginRight: 6 }} />{s.label}
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

          <span style={{ fontSize: 12, color: 'var(--muted)' }}>ou</span>

          <select
            value={region}
            onChange={e => { setRegion(e.target.value); if (e.target.value) { setVille(''); setVilleCity(''); setRayon('') } }}
            style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 220 }}
          >
            <option value="">France entière (partenaires)</option>
            {REGIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>

          {geoErr     && <span style={{ fontSize: 12, color: 'var(--accent)' }}><i className="ti ti-alert-circle" /> {geoErr}</span>}
          {geoLoading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Géolocalisation…</span>}

          <button className="btn-sm teal" onClick={search} style={{ marginLeft: 'auto' }}>
            {geoLoading ? <><i className="ti ti-loader" /> …</> : <><i className="ti ti-search" /> Rechercher</>}
          </button>
        </div>

        {(ville || region) && (
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 12 }} />
            {ville || region ? 'Résultats La Bonne Alternance inclus' : ''}
            {modalite ? ' · Filtre modalité actif sur formations partenaires uniquement' : ''}
          </div>
        )}
      </div>

      {/* Résultats */}
      <div className="s-card" style={{ marginBottom: 0 }}>
        {!searched ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <i className="ti ti-certificate" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: 0.3 }} />
            Utilisez les filtres et cliquez sur <strong>Rechercher</strong>.
            <div style={{ marginTop: 8, fontSize: 12 }}>Pour inclure les résultats La Bonne Alternance, sélectionnez une ville ou une région.</div>
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Recherche en cours…</div>
        ) : (
          <>
            {formations.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune formation trouvée.</div>
            ) : (
            <>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
              {formations.length} formation{formations.length > 1 ? 's' : ''}
              {formations.some(f => f._source === 'lba') && (
                <span style={{ marginLeft: 8, background: '#e0f2fe', color: '#0369a1', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                  dont LBA
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {formations.map(f => {
                const isLBA    = f._source === 'lba'
                const isSaved  = isLBA ? lbaSavedIds.has(f.lba_id) : savedIds.has(f.id)
                const isSaving = saving.has(f.id)

                if (isLBA) return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '0.5px solid var(--border)' }}>

                    {/* Niveau */}
                    <div style={{ flexShrink: 0, width: 72, textAlign: 'center' }}>
                      {f.niveau && f.niveau !== 'autre' ? (
                        <span style={{ ...niveauStyle(f.niveau), fontSize: 10, padding: '3px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          {f.niveau_sigle || NIVEAU_LABEL[f.niveau] || f.niveau}
                        </span>
                      ) : (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 10, padding: '3px 7px', borderRadius: 20, whiteSpace: 'nowrap', fontWeight: 600 }}>LBA</span>
                      )}
                    </div>

                    {/* Nom + méta — cliquable pour ouvrir le drawer */}
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => setDrawerFormation(f)}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', lineHeight: 1.4 }}>
                        {f.nom} <i className="ti ti-chevron-right" style={{ fontSize: 11 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2, alignItems: 'center' }}>
                        {f.ville && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            <i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {f.ville}
                          </span>
                        )}
                        {f.ecole_nom && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            · <i className="ti ti-school" style={{ fontSize: 10 }} /> {f.ecole_nom}
                          </span>
                        )}
                        {f.prochaine_rentree && (
                          <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500 }}>
                            · <i className="ti ti-calendar" style={{ fontSize: 10 }} /> {new Date(f.prochaine_rentree).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {f.duree_annees && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            · {f.duree_annees} an{f.duree_annees > 1 ? 's' : ''}
                          </span>
                        )}
                        {f.ecole_site_web && (
                          <a
                            href={f.ecole_site_web} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500, textDecoration: 'none' }}
                          >
                            · <i className="ti ti-world" style={{ fontSize: 10 }} /> Site école
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Enregistrer / Masquer */}
                    <button
                      className="btn-sm"
                      style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, background: isSaved ? 'var(--teal-soft)' : undefined, color: isSaved ? 'var(--teal)' : undefined, opacity: isSaved ? 0.7 : 1 }}
                      onClick={ev => enregistrerLBA(f, ev)}
                      disabled={isSaved || isSaving}
                      title={isSaved ? 'Déjà dans mes candidatures' : 'Enregistrer dans mes candidatures'}
                    >
                      <i className={`ti ${isSaved ? 'ti-check' : isSaving ? 'ti-loader' : 'ti-bookmark'}`} />
                    </button>
                    <button
                      className="btn-sm"
                      style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, color: 'var(--muted)' }}
                      onClick={ev => masquer(f, ev)}
                      title="Ne plus voir cette formation"
                    >
                      <i className="ti ti-eye-off" />
                    </button>
                  </div>
                )

                // Formation Allschool (inchangée)
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ flexShrink: 0, width: 80, textAlign: 'center' }}>
                      {f.niveau && f.niveau !== 'autre' && (
                        <span style={{ ...niveauStyle(f.niveau), fontSize: 10, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          {NIVEAU_LABEL[f.niveau] || f.niveau}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: onNavigateFormation ? 'pointer' : 'default' }}
                      onClick={() => onNavigateFormation?.(f.id, 'candidat-formations', filters)}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: onNavigateFormation ? 'var(--teal)' : 'var(--navy)', lineHeight: 1.4 }}>
                        {f.nom}
                        {onNavigateFormation && <i className="ti ti-chevron-right" style={{ fontSize: 11, marginLeft: 4 }} />}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                        {(f.localite_formation || f.ville) && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            <i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {f.localite_formation || f.ville}
                          </span>
                        )}
                        <ModaliteTag value={f.modalite || f.ecole?.modalites?.[0]} />
                        {f.ecole && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            · <i className="ti ti-school" style={{ fontSize: 10 }} /> {f.ecole.nom}
                          </span>
                        )}
                      </div>
                    </div>
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
                    {f.url_onisep && (
                      <button className="btn-sm teal" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => window.open(f.url_onisep, '_blank')}>
                        <i className="ti ti-external-link" /> ONISEP
                      </button>
                    )}
                    {candidatId && (
                      <StatutPicker formationId={f.id} currentStatut={statuts[f.id] || null} candidatId={candidatId} onChange={handleStatutChange} />
                    )}
                    <button
                      className="btn-sm"
                      style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, background: isSaved ? 'var(--teal-soft)' : undefined, color: isSaved ? 'var(--teal)' : undefined, opacity: isSaved ? 0.7 : 1 }}
                      onClick={ev => enregistrer(f, ev)}
                      disabled={isSaved || isSaving}
                    >
                      <i className={`ti ${isSaved ? 'ti-check' : isSaving ? 'ti-loader' : 'ti-bookmark'}`} />
                    </button>
                    <button className="btn-sm" style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, color: 'var(--muted)' }} onClick={ev => masquer(f, ev)}>
                      <i className="ti ti-eye-off" />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
            )}
          </>
        )}
      </div>

      {drawerFormation && (
        <PanelFormationLBADrawer
          formation={drawerFormation}
          onClose={() => setDrawerFormation(null)}
        />
      )}
    </>
  )
}
