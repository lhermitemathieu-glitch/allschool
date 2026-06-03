'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'

const PAGE_SIZE = 20

function initiales(str) {
  return (str || '').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

// ── TAG DIPLÔME coloré ────────────────────────────────────────────────────────
function DiploTag({ label }) {
  const l = (label || '').toLowerCase()
  let bg = '#ede9fe', color = '#7c3aed'
  if (l.includes('bts') || l.includes('deust'))                { bg = '#e0f2fe'; color = '#0369a1' }
  else if (l.includes('cap') || l.includes('brevet'))                          { bg = '#fef9c3'; color = '#854d0e' }
  else if (l.includes('bac pro') || l.includes('baccalauréat professionnel'))  { bg = '#ffedd5'; color = '#9a3412' }
  else if (l.includes('bachelor') || l.includes('licence'))    { bg = '#dcfce7'; color = '#166534' }
  else if (l.includes('master') || l.includes('ingénieur'))    { bg = '#fce7f3'; color = '#9d174d' }
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// ── BARRE FILTRES commune ─────────────────────────────────────────────────────
function SearchBar({ placeholder, children, onSearch, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={e => e.key === 'Enter' && onSearch()}
        style={inputStyle}
      />
      {children}
      <button className="btn-sm" onClick={onSearch}><i className="ti ti-search" /> Rechercher</button>
    </div>
  )
}

// ── PAGINATION ────────────────────────────────────────────────────────────────
function Pager({ page, hasMore, total, onPrev, onNext }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', marginTop: 8, borderTop: '0.5px solid var(--border)' }}>
      <button className="btn-sm" disabled={page === 0} onClick={onPrev}><i className="ti ti-chevron-left" /> Précédent</button>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        Page {page + 1} · {total.toLocaleString('fr-FR')} résultat{total > 1 ? 's' : ''}
      </span>
      <button className="btn-sm" disabled={!hasMore} onClick={onNext}>Suivant <i className="ti ti-chevron-right" /></button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL — ÉCOLES
// ══════════════════════════════════════════════════════════════════════════════
export function PanelBackDetailEcoles({ onNavigateEcole }) {
  const supabase = createClient()

  const [stats, setStats]     = useState({ ecoles: 0, formations: 0 })
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [total, setTotal]     = useState(0)

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

  const [q, setQ]           = useState('')
  const [region, setRegion] = useState('')
  const [niveau, setNiveau] = useState('')
  const [regions, setRegions] = useState([])

  // Chargement stats + filtres
  useEffect(() => {
    async function init() {
      const [{ count: ce }, { count: cf }] = await Promise.all([
        supabase.from('ecoles').select('*', { count: 'exact', head: true }),
        supabase.from('formations').select('*', { count: 'exact', head: true }),
      ])
      setStats({ ecoles: ce ?? 0, formations: cf ?? 0 })

      // Charger toutes les régions avec pagination
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
    init()
  }, [])

  const fetchRows = useCallback(async (p, q, region, niveau) => {
    setLoading(true)
    const from = p * PAGE_SIZE, to = from + PAGE_SIZE - 1

    // Si filtre niveau, on récupère d'abord les ecole_ids concernés
    let ecoleIds = null
    if (niveau) {
      const { data: fIds } = await supabase.from('formations').select('ecole_id').eq('niveau', niveau)
      ecoleIds = [...new Set((fIds || []).map(f => f.ecole_id))]
      if (ecoleIds.length === 0) { setRows([]); setTotal(0); setLoading(false); return }
    }

    let query = supabase
      .from('ecoles')
      .select('id, nom, ville, region, academie, type_ecole, site_web, email, uai', { count: 'exact' })
      .order('nom')
      .range(from, to)

    if (q.trim())   query = query.ilike('nom', `%${q.trim()}%`)
    if (region)     query = query.eq('region', region)
    if (ecoleIds)   query = query.in('id', ecoleIds)

    const { data, count } = await query
    const ecoles = data || []

    // Pour chaque école, récupérer les niveaux distincts et le nb de formations
    const ids = ecoles.map(e => e.id)
    let formationsMap = {}
    if (ids.length > 0) {
      const { data: fData } = await supabase
        .from('formations')
        .select('ecole_id, niveau')
        .in('ecole_id', ids)

      for (const f of (fData || [])) {
        if (!formationsMap[f.ecole_id]) formationsMap[f.ecole_id] = { niveaux: new Set(), count: 0 }
        formationsMap[f.ecole_id].count++
        if (f.niveau) formationsMap[f.ecole_id].niveaux.add(f.niveau)
      }
    }

    setRows(ecoles.map(e => ({
      ...e,
      niveaux: formationsMap[e.id] ? [...formationsMap[e.id].niveaux] : [],
      nbFormations: formationsMap[e.id]?.count ?? 0,
    })))
    setTotal(count ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRows(0, '', '', '') }, [])

  function handleSearch() { setPage(0); fetchRows(0, q, region, niveau) }
  function handlePrev()   { const p = page - 1; setPage(p); fetchRows(p, q, region, niveau) }
  function handleNext()   { const p = page + 1; setPage(p); fetchRows(p, q, region, niveau) }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles — Vue détaillée</div>
          <div className="page-sub">Liste complète des établissements enregistrés</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid2" style={{ marginBottom: '1.25rem' }}>
        <div className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
          <span className="stat-num" style={{ color: 'var(--purple)' }}>{stats.ecoles.toLocaleString('fr-FR')}</span>
          <div className="stat-label">Écoles sur la plateforme</div>
        </div>
        <div className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
          <span className="stat-num" style={{ color: 'var(--teal)' }}>{stats.formations.toLocaleString('fr-FR')}</span>
          <div className="stat-label">Formations disponibles</div>
        </div>
      </div>

      <div className="s-card">
        {/* Filtres */}
        <SearchBar placeholder="Rechercher une école…" value={q} onChange={e => setQ(e.target.value)} onSearch={handleSearch}>
          <select value={region} onChange={e => setRegion(e.target.value)} style={selectStyle}>
            <option value="">Toutes les régions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={niveau} onChange={e => setNiveau(e.target.value)} style={selectStyle}>
            <option value="">Tous les niveaux</option>
            {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </SearchBar>

        {/* En-tête tableau */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 100px 90px', gap: 10, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
          {['École', 'Diplômes proposés', 'Formations', 'Page'].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
          ))}
        </div>

        {/* Lignes */}
        {loading ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Aucun résultat.</div>
        ) : rows.map((e, i) => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 100px 90px', gap: 10, padding: '10px 4px', borderBottom: i < rows.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
            {/* École */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--purple-soft, #ede9fe)', color: 'var(--purple)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initiales(e.nom)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{e.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{[e.ville, e.region].filter(Boolean).join(' · ')}</div>
              </div>
            </div>

            {/* Niveaux */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {e.niveaux.length === 0
                ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
                : e.niveaux.map(n => {
                    const found = NIVEAUX.find(x => x.value === n)
                    return <DiploTag key={n} label={found?.label || n} />
                  })
              }
            </div>

            {/* Nb formations */}
            <div>
              {e.nbFormations > 0
                ? <span style={{ background: '#fff7ed', color: '#c2410c', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>{e.nbFormations} formation{e.nbFormations > 1 ? 's' : ''}</span>
                : <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
              }
            </div>

            {/* Lien page publique */}
            <div>
              <button
                className="btn-sm"
                style={{ fontSize: 11, color: 'var(--teal)', background: 'var(--teal-soft, #e0fdf4)' }}
                onClick={() => onNavigateEcole?.(e.id)}
              >
                <i className="ti ti-external-link" /> Voir
              </button>
            </div>
          </div>
        ))}

        <Pager page={page} hasMore={rows.length === PAGE_SIZE} total={total} onPrev={handlePrev} onNext={handleNext} />
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL — CANDIDATS
// ══════════════════════════════════════════════════════════════════════════════
export function PanelBackDetailCandidats() {
  const supabase = createClient()

  const [count, setCount]   = useState(0)
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(0)
  const [total, setTotal]   = useState(0)
  const [q, setQ]           = useState('')
  const [ville, setVille]   = useState('')
  const [villes, setVilles] = useState([])

  useEffect(() => {
    async function init() {
      const [{ count: c }, { data: dv }] = await Promise.all([
        supabase.from('candidats').select('*', { count: 'exact', head: true }),
        supabase.from('candidats').select('ville').not('ville', 'is', null),
      ])
      setCount(c ?? 0)
      setVilles([...new Set((dv || []).map(x => x.ville).filter(Boolean))].sort())
    }
    init()
    fetch(0, '', '')
  }, [])

  async function fetch(p, q, ville) {
    setLoading(true)
    const from = p * PAGE_SIZE, to = from + PAGE_SIZE - 1
    let query = supabase
      .from('candidats')
      .select('id, prenom, nom, formation, ville, email, disponibilite', { count: 'exact' })
      .order('nom')
      .range(from, to)
    if (q.trim()) query = query.or(`prenom.ilike.%${q.trim()}%,nom.ilike.%${q.trim()}%`)
    if (ville)    query = query.eq('ville', ville)
    const { data, count: c } = await query
    setRows(data || [])
    setTotal(c ?? 0)
    setLoading(false)
  }

  function handleSearch() { setPage(0); fetch(0, q, ville) }
  function handlePrev()   { const p = page - 1; setPage(p); fetch(p, q, ville) }
  function handleNext()   { const p = page + 1; setPage(p); fetch(p, q, ville) }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Candidats — Vue détaillée</div>
          <div className="page-sub">Liste complète des candidats enregistrés</div>
        </div>
      </div>

      <div className="grid2" style={{ marginBottom: '1.25rem' }}>
        <div className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
          <span className="stat-num" style={{ color: 'var(--teal)' }}>{count.toLocaleString('fr-FR')}</span>
          <div className="stat-label">Candidats sur la plateforme</div>
        </div>
        <div className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
          <span className="stat-num" style={{ color: 'var(--accent)' }}>{rows.filter(r => r.disponibilite).length}</span>
          <div className="stat-label">Disponibles (page actuelle)</div>
        </div>
      </div>

      <div className="s-card">
        <SearchBar placeholder="Rechercher un candidat…" value={q} onChange={e => setQ(e.target.value)} onSearch={handleSearch}>
          <select value={ville} onChange={e => setVille(e.target.value)} style={selectStyle}>
            <option value="">Toutes les villes</option>
            {villes.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </SearchBar>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr', gap: 10, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
          {['Candidat', 'Formation', 'Ville', 'Disponibilité'].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Aucun résultat.</div>
        ) : rows.map((c, i) => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr', gap: 10, padding: '10px 4px', borderBottom: i < rows.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--teal-soft, #ccfbf1)', color: 'var(--teal)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initiales(`${c.prenom} ${c.nom}`)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{c.prenom} {c.nom}</div>
                {c.email && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{c.email}</div>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--navy)' }}>{c.formation || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--navy)' }}>{c.ville || '—'}</div>
            <div>
              {c.disponibilite
                ? <span className="pill teal" style={{ fontSize: 10 }}>{c.disponibilite}</span>
                : <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
              }
            </div>
          </div>
        ))}

        <Pager page={page} hasMore={rows.length === PAGE_SIZE} total={total} onPrev={handlePrev} onNext={handleNext} />
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL — ENTREPRISES
// ══════════════════════════════════════════════════════════════════════════════
export function PanelBackDetailEntreprises() {
  const supabase = createClient()

  const [count, setCount]   = useState(0)
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(0)
  const [total, setTotal]   = useState(0)
  const [q, setQ]           = useState('')
  const [secteur, setSecteur] = useState('')
  const [secteurs, setSecteurs] = useState([])
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const SECTEURS_LIST = [
    'Agriculture & Environnement', 'Alimentation & Restauration', 'Arts & Culture',
    'BTP & Immobilier', 'Commerce & Vente', 'Communication & Marketing',
    'Finance & Comptabilité', 'Hôtellerie & Tourisme', 'Industrie & Production',
    'Informatique & Numérique', 'Juridique & Droit', 'Logistique & Transport',
    'Ressources Humaines', 'Santé & Social', 'Sport & Animation',
  ]

  function openEdit(e) {
    setSelected(e)
    setEditForm({ raison_sociale: e.raison_sociale || '', siret: e.siret || '', secteur: e.secteur || '', ville: e.ville || '', taille: e.taille || '', adresse: e.adresse || '', code_postal: e.code_postal || '' })
    setMsg('')
  }

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase.from('entreprises').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', selected.id).select().single()
    if (error) { setMsg('Erreur : ' + error.message) }
    else {
      setRows(prev => prev.map(r => r.id === selected.id ? { ...r, ...data } : r))
      setSelected(data)
      setMsg('Enregistré !')
      setTimeout(() => setMsg(''), 3000)
    }
    setSaving(false)
  }

  useEffect(() => {
    async function init() {
      const [{ count: c }, { data: ds }] = await Promise.all([
        supabase.from('entreprises').select('*', { count: 'exact', head: true }),
        supabase.from('entreprises').select('secteur').not('secteur', 'is', null),
      ])
      setCount(c ?? 0)
      setSecteurs([...new Set((ds || []).map(x => x.secteur).filter(Boolean))].sort())
    }
    init()
    fetchRows(0, '', '')
  }, [])

  async function fetchRows(p, q, secteur) {
    setLoading(true)
    const from = p * PAGE_SIZE, to = from + PAGE_SIZE - 1
    let query = supabase
      .from('entreprises')
      .select('id, raison_sociale, secteur, ville, taille, source, siret', { count: 'exact' })
      .order('raison_sociale')
      .range(from, to)
    if (q.trim())  query = query.ilike('raison_sociale', `%${q.trim()}%`)
    if (secteur)   query = query.eq('secteur', secteur)
    const { data, count: c } = await query
    setRows(data || [])
    setTotal(c ?? 0)
    setLoading(false)
  }

  function handleSearch() { setPage(0); fetchRows(0, q, secteur) }
  function handlePrev()   { const p = page - 1; setPage(p); fetchRows(p, q, secteur) }
  function handleNext()   { const p = page + 1; setPage(p); fetchRows(p, q, secteur) }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Entreprises — Vue détaillée</div>
          <div className="page-sub">Liste complète des entreprises enregistrées</div>
        </div>
      </div>

      <div className="grid2" style={{ marginBottom: '1.25rem' }}>
        <div className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
          <span className="stat-num" style={{ color: 'var(--accent)' }}>{count.toLocaleString('fr-FR')}</span>
          <div className="stat-label">Entreprises sur la plateforme</div>
        </div>
        <div className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
          <span className="stat-num" style={{ color: 'var(--gold)' }}>{rows.filter(r => r.source === 'csv').length}</span>
          <div className="stat-label">Importées via CSV (page actuelle)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div className="s-card" style={{ flex: 1, minWidth: 0 }}>
        <SearchBar placeholder="Rechercher une entreprise…" value={q} onChange={e => setQ(e.target.value)} onSearch={handleSearch}>
          <select value={secteur} onChange={e => setSecteur(e.target.value)} style={selectStyle}>
            <option value="">Tous les secteurs</option>
            {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </SearchBar>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px', gap: 10, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
          {['Entreprise', 'Secteur', 'Ville', 'Taille', 'Source'].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Aucun résultat.</div>
        ) : rows.map((e, i) => (
          <div
            key={e.id}
            onClick={() => openEdit(e)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px', gap: 10, padding: '10px 4px', borderBottom: i < rows.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center', cursor: 'pointer', borderRadius: 6, background: selected?.id === e.id ? 'var(--light)' : 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fff3e0', color: 'var(--accent)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initiales(e.raison_sociale)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{e.raison_sociale}</div>
                {e.siret && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>SIRET {e.siret}</div>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--navy)' }}>{e.secteur || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--navy)' }}>{e.ville || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--navy)' }}>{e.taille || '—'}</div>
            <div>
              {e.source === 'csv'
                ? <span className="pill gold" style={{ fontSize: 10 }}>CSV</span>
                : <span className="pill" style={{ fontSize: 10 }}>Manuel</span>
              }
            </div>
          </div>
        ))}

        <Pager page={page} hasMore={rows.length === PAGE_SIZE} total={total} onPrev={handlePrev} onNext={handleNext} />
      </div>

      {/* Panel latéral d'édition */}
      {selected && (
        <div className="s-card" style={{ position: 'sticky', top: 0, minWidth: 300, maxWidth: 340, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>Modifier</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {msg && <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
              <button className="btn-sm teal" onClick={handleSave} disabled={saving}>{saving ? '…' : 'Enregistrer'}</button>
              <button className="btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
          </div>
          {[
            ['Raison sociale', 'raison_sociale', 'text'],
            ['SIRET', 'siret', 'text'],
            ['Adresse', 'adresse', 'text'],
            ['Code postal', 'code_postal', 'text'],
            ['Ville', 'ville', 'text'],
          ].map(([label, key, type]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
              <input type={type} value={editForm[key] || ''} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Secteur</div>
            <select value={editForm.secteur || ''} onChange={e => setEditForm(f => ({ ...f, secteur: e.target.value }))} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              {SECTEURS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Taille</div>
            <select value={editForm.taille || ''} onChange={e => setEditForm(f => ({ ...f, taille: e.target.value }))} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              <option value="tpe">TPE (moins de 11 salariés)</option>
              <option value="pme">PME (11 à 249 salariés)</option>
              <option value="ge">Grande entreprise (250+)</option>
            </select>
          </div>
        </div>
      )}
      </div>{/* fin flex wrapper liste + panel */}
    </>
  )
}

const inputStyle = {
  flex: 1, minWidth: 160, padding: '7px 11px', borderRadius: 8,
  border: '0.5px solid var(--border)', background: 'var(--light)',
  fontSize: 12.5, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none',
}
const selectStyle = {
  padding: '7px 11px', borderRadius: 8, border: '0.5px solid var(--border)',
  background: 'var(--light)', fontSize: 12.5, fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)', outline: 'none', minWidth: 160,
}
