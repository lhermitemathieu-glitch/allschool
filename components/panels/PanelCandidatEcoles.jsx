'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'

function sigle(nom) {
  return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

const MODALITE_MAP = {
  presentiel:  { label: 'Présentiel',  icon: 'ti-building', bg: '#e0f2fe', color: '#0369a1' },
  distanciel:  { label: 'Distanciel',  icon: 'ti-wifi',     bg: '#dcfce7', color: '#166534' },
  hybride:     { label: 'Hybride',     icon: 'ti-refresh',  bg: '#fef9c3', color: '#854d0e' },
}

function ModaliteTag({ value, style = {} }) {
  const m = MODALITE_MAP[value]
  if (!m) return null
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3, ...style }}>
      <i className={`ti ${m.icon}`} style={{ fontSize: 9 }} /> {m.label}
    </span>
  )
}

const SECTEURS = [
  'Agriculture & Environnement',
  'Alimentation & Restauration',
  'Arts & Culture',
  'BTP & Immobilier',
  'Commerce & Vente',
  'Communication & Marketing',
  'Finance & Comptabilité',
  'Hôtellerie & Tourisme',
  'Industrie & Production',
  'Informatique & Numérique',
  'Juridique & Droit',
  'Logistique & Transport',
  'Ressources Humaines',
  'Santé & Social',
  'Sport & Animation',
]

export default function PanelCandidatEcoles({ onNavigateEcole, onNavigateFormation, initialVue, initialFilters }) {
  const supabase = createClient()

  const [vue, setVue]               = useState(initialVue || 'ecoles') // 'ecoles' | 'formations'
  const [ecoles, setEcoles]         = useState([])
  const [loading, setLoading]       = useState(false)
  const [selected, setSelected]     = useState(null)
  const [formations, setFormations] = useState([])       // formations de l'école sélectionnée
  const [loadingF, setLoadingF]     = useState(false)
  const [formationsSearch, setFormationsSearch] = useState([]) // résultats onglet formations
  const [loadingFS, setLoadingFS]   = useState(false)

  // Filtres (restaurés depuis initialFilters si présent)
  const [q, setQ]               = useState(initialFilters?.q        || '')
  const [diplome, setDiplome]   = useState(initialFilters?.diplome  || '')
  const [region, setRegion]     = useState(initialFilters?.region   || '')
  const [niveau, setNiveau]     = useState(initialFilters?.niveau   || '')
  const [secteur, setSecteur]   = useState(initialFilters?.secteur  || '')
  const [modalite, setModalite] = useState(initialFilters?.modalite || '')
  const [regions, setRegions]   = useState([])

  // Filtres géographiques
  const [ville,       setVille]       = useState(initialFilters?.ville || '')
  const [rayon,       setRayon]       = useState(initialFilters?.rayon || '')
  const [villeCity,   setVilleCity]   = useState(initialFilters?.villeCity || '') // nom exact pour filtre sans rayon
  const [suggestions, setSuggestions] = useState([])
  const [geoErr,      setGeoErr]      = useState('')
  const [geoLoading,  setGeoLoading]  = useState(false)

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

  async function fetchSuggestions(q) {
    if (q.length < 2) { setSuggestions([]); return }
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=6`
    try {
      const res = await fetch(url)
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

  // Géocode une ville via l'API adresse du gouvernement
  async function geocodeVille(nom) {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(nom)}&type=municipality&limit=1`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const feat = json.features?.[0]
    if (!feat) return null
    const [lng, lat] = feat.geometry.coordinates
    return { lat, lng, city: feat.properties.city }
  }

  const search = useCallback(async () => {
    setLoading(true)
    setSelected(null)
    setFormations([])
    setGeoErr('')

    // ── Filtre géographique ──────────────────────────────────────────────────
    let geoIds    = null
    let villeExacte = null  // filtre sur le champ ville quand pas de rayon

    if (ville.trim() && rayon) {
      // Rayon → Haversine
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
      // Pas de rayon → filtre exact sur le nom de ville
      villeExacte = villeCity || ville.trim()
    }


    // ── Requête écoles ───────────────────────────────────────────────────────
    let ecolesQuery = supabase
      .from('ecoles')
      .select('id, nom, ville, region, academie, type_ecole, site_web, email, telephone, adresse, code_postal, secteurs, modalites')
      .order('nom')
      .limit(100)

    if (q.trim())      ecolesQuery = ecolesQuery.ilike('nom', `%${q.trim()}%`)
    if (region)        ecolesQuery = ecolesQuery.eq('region', region)
    if (secteur)       ecolesQuery = ecolesQuery.contains('secteurs', [secteur])
    if (geoIds)        ecolesQuery = ecolesQuery.in('id', geoIds)
    if (villeExacte)   ecolesQuery = ecolesQuery.ilike('ville', villeExacte)
    if (modalite)      ecolesQuery = ecolesQuery.contains('modalites', [modalite])

    const { data: ecolesData } = await ecolesQuery
    const ecolesResult = ecolesData || []
    setEcoles(ecolesResult)
    setLoading(false)

    // ── Requête formations ───────────────────────────────────────────────────
    setLoadingFS(true)
    const ecoleIdsResult = ecolesResult.map(e => e.id)
    if (ecoleIdsResult.length === 0) { setFormationsSearch([]); setLoadingFS(false); return }

    let fQuery = supabase
      .from('formations')
      .select('id, nom, diplome, niveau, modalite, url_onisep, localite_formation, ecole_id')
      .in('ecole_id', ecoleIdsResult)
      .order('nom')
      .limit(200)

    if (niveau)         fQuery = fQuery.eq('niveau', niveau)
    if (q.trim())       fQuery = fQuery.ilike('nom', `%${q.trim()}%`)
    if (diplome.trim()) fQuery = fQuery.ilike('diplome', `%${diplome.trim()}%`)

    const { data: fData } = await fQuery

    // Enrichit avec le nom de l'école
    const ecoleMap = Object.fromEntries(ecolesResult.map(e => [e.id, e]))
    setFormationsSearch((fData || []).map(f => ({ ...f, ecole: ecoleMap[f.ecole_id] })))
    setLoadingFS(false)
  }, [q, diplome, region, niveau, secteur, modalite, ville, rayon])

  useEffect(() => { search() }, [region, niveau, secteur, modalite])

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

  const NIVEAU_LABEL = { cap: 'CAP', bac: 'Bac Pro', bts: 'BTS', bts_agri: 'BTS Agricole', deust: 'DEUST', afpa3: 'Niv 3 – AFPA', niv3: 'Niv 3 – Autre', bach: 'Bachelor', master: 'Master', autre: 'Autre' }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles & formations</div>
          <div className="page-sub">Trouvez une école par région, ville ou diplôme</div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 0 }}>

        {/* Ligne 1 : nom + secteur + niveau */}
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
          <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 160 }}>
            <option value="">Toutes les régions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Ligne 2 : diplôme + recherche géographique */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Nom du diplôme…"
            value={diplome}
            onChange={e => setDiplome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={{ ...inputStyle, flex: 'none', width: 220 }}
          />
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
              <i className="ti ti-map-pin" style={{ padding: '0 10px', color: 'var(--muted)', fontSize: 15 }} />
              <input
                placeholder="Votre ville…"
                value={ville}
                onChange={e => { setVille(e.target.value); setVilleCity(''); setGeoErr(''); fetchSuggestions(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); search() } if (e.key === 'Escape') setSuggestions([]) }}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1, padding: '8px 8px 8px 0' }}
              />
              {ville && <button onClick={() => { setVille(''); setVilleCity(''); setSuggestions('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--muted)', fontSize: 13 }}>×</button>}
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
          <select
            value={rayon}
            onChange={e => setRayon(e.target.value)}
            style={{ ...inputStyle, flex: 'none', width: 'auto', minWidth: 130 }}
          >
            <option value="">— Rayon —</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
          {geoErr && <span style={{ fontSize: 12, color: 'var(--accent)' }}><i className="ti ti-alert-circle" /> {geoErr}</span>}
          {geoLoading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Géolocalisation…</span>}
          <button className="btn-sm teal" onClick={search} style={{ marginLeft: 'auto' }}>
            {geoLoading ? <><i className="ti ti-loader" /> …</> : <><i className="ti ti-search" /> Rechercher</>}
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginTop: '1rem', marginBottom: 0 }}>
        {[
          { id: 'ecoles',     icon: 'ti-school',      label: 'Écoles',     count: ecoles.length },
          { id: 'formations', icon: 'ti-certificate', label: 'Formations', count: formationsSearch.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setVue(tab.id); setSelected(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '10px 10px 0 0',
              border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              background: vue === tab.id ? 'white' : 'transparent',
              color: vue === tab.id ? 'var(--navy)' : 'var(--muted)',
              boxShadow: vue === tab.id ? '0 -1px 0 0 var(--border), -1px 0 0 0 var(--border), 1px 0 0 0 var(--border)' : 'none',
            }}
          >
            <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
            {tab.label}
            {!loading && !loadingFS && (
              <span style={{
                background: vue === tab.id ? 'var(--purple-soft)' : 'var(--light)',
                color: vue === tab.id ? 'var(--purple)' : 'var(--muted)',
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── VUE ÉCOLES ── */}
      {vue === 'ecoles' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1rem' }}>
          <div className="s-card" style={{ marginBottom: 0, borderTopLeftRadius: 0 }}>
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

          {/* Détail école */}
          {selected && (
            <div className="s-card" style={{ marginBottom: 0 }}>
              <div className="s-card-header">
                <div className="s-card-title"><i className="ti ti-info-circle" /> {selected.nom}</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {onNavigateEcole && (
                    <button className="btn-sm teal" style={{ fontSize: 11 }} onClick={() => onNavigateEcole(selected.id, vue, { q, diplome, region, niveau, secteur, modalite, ville, villeCity, rayon })}>
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
                    onClick={() => onNavigateFormation?.(f.id, vue, { q, diplome, region, niveau, secteur, modalite, ville, villeCity, rayon })}
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
      )}

      {/* ── VUE FORMATIONS ── */}
      {vue === 'formations' && (
        <div className="s-card" style={{ marginBottom: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {loadingFS ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Recherche en cours…</div>
          ) : formationsSearch.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune formation trouvée. Essayez d'autres filtres.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {formationsSearch.map(f => (
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
                  <div style={{ flex: 1, minWidth: 0, cursor: onNavigateFormation ? 'pointer' : 'default' }} onClick={() => onNavigateFormation?.(f.id, 'formations', { q, diplome, region, niveau, secteur, modalite, ville, villeCity, rayon })}>
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
                      <ModaliteTag value={f.modalite} />
                    </div>
                  </div>

                  {/* École */}
                  {f.ecole && (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: onNavigateEcole ? 'pointer' : 'default', padding: '4px 8px', borderRadius: 8, background: 'var(--light)' }}
                      onClick={() => onNavigateEcole?.(f.ecole.id, 'formations', { q, diplome, region, niveau, secteur, modalite, ville, villeCity, rayon })}
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
          )}
        </div>
      )}
    </>
  )
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
  boxSizing: 'border-box',
}
