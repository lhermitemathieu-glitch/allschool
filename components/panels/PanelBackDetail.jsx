'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'
import { PanelEntrepriseOffres } from './PanelEntreprise'
import { SECTEURS } from '../../lib/secteurs'
import AvatarPhoto from '../ui/AvatarPhoto'
import { verifier } from '../ui/Toaster'

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

// AvatarPhoto partagé (../ui/AvatarPhoto) : les usages entreprise passent
// bg="#fff3e0" color="var(--accent)", les usages candidat passent du teal.

// Source unique de vérité : lib/secteurs.js (alignée avec les autres espaces).
const SECTEURS_LIST = SECTEURS

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

  useEffect(() => {
    async function init() {
      const [{ count: ce }, { count: cf }] = await Promise.all([
        supabase.from('ecoles').select('*', { count: 'exact', head: true }),
        supabase.from('formations').select('*', { count: 'exact', head: true }),
      ])
      setStats({ ecoles: ce ?? 0, formations: cf ?? 0 })

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

        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 100px 90px', gap: 10, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
          {['École', 'Diplômes proposés', 'Formations', 'Page'].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Aucun résultat.</div>
        ) : rows.map((e, i) => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 100px 90px', gap: 10, padding: '10px 4px', borderBottom: i < rows.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--purple-soft, #ede9fe)', color: 'var(--purple)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initiales(e.nom)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{e.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{[e.ville, e.region].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {e.niveaux.length === 0
                ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
                : e.niveaux.map(n => {
                    const found = NIVEAUX.find(x => x.value === n)
                    return <DiploTag key={n} label={found?.label || n} />
                  })
              }
            </div>
            <div>
              {e.nbFormations > 0
                ? <span style={{ background: '#fff7ed', color: '#c2410c', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>{e.nbFormations} formation{e.nbFormations > 1 ? 's' : ''}</span>
                : <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
              }
            </div>
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
export function PanelBackDetailCandidats({ onNavigateCandidat }) {
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
    fetchRows(0, '', '')
  }, [])

  async function fetchRows(p, q, ville) {
    setLoading(true)
    const from = p * PAGE_SIZE, to = from + PAGE_SIZE - 1
    let query = supabase
      .from('candidats')
      .select('id, prenom, nom, formation, ville, email, disponibilite, photo_url', { count: 'exact' })
      .order('nom')
      .range(from, to)
    if (q.trim()) query = query.or(`prenom.ilike.%${q.trim()}%,nom.ilike.%${q.trim()}%`)
    if (ville)    query = query.eq('ville', ville)
    const { data, count: c } = await query
    setRows(data || [])
    setTotal(c ?? 0)
    setLoading(false)
  }

  function handleSearch() { setPage(0); fetchRows(0, q, ville) }
  function handlePrev()   { const p = page - 1; setPage(p); fetchRows(p, q, ville) }
  function handleNext()   { const p = page + 1; setPage(p); fetchRows(p, q, ville) }

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

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 80px', gap: 10, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
          {['Candidat', 'Formation', 'Ville', 'Disponibilité', 'Accès'].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem 0', color: 'var(--muted)', fontSize: 13 }}>Aucun résultat.</div>
        ) : rows.map((c, i) => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 80px', gap: 10, padding: '10px 4px', borderBottom: i < rows.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {c.photo_url ? (
                <img src={c.photo_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--teal-soft, #ccfbf1)', color: 'var(--teal)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {initiales(`${c.prenom} ${c.nom}`)}
                </div>
              )}
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
            <div>
              <button
                className="btn-sm"
                style={{ fontSize: 11, color: 'var(--teal)', background: 'var(--teal-soft, #e0fdf4)' }}
                onClick={() => onNavigateCandidat?.(c.id)}
              >
                <i className="ti ti-eye" /> Voir
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
// PANEL — ENTREPRISES
// ══════════════════════════════════════════════════════════════════════════════
export function PanelBackDetailEntreprises({ onNavigateEntreprise }) {
  const supabase = createClient()

  const [count, setCount]   = useState(0)
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(0)
  const [total, setTotal]   = useState(0)
  const [q, setQ]           = useState('')
  const [secteur, setSecteur] = useState('')
  const [secteurs, setSecteurs] = useState([])

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
      .select('id, raison_sociale, secteur, ville, taille, source, siret, photo_url', { count: 'exact' })
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

      <div className="s-card">
        <SearchBar placeholder="Rechercher une entreprise…" value={q} onChange={e => setQ(e.target.value)} onSearch={handleSearch}>
          <select value={secteur} onChange={e => setSecteur(e.target.value)} style={selectStyle}>
            <option value="">Tous les secteurs</option>
            {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </SearchBar>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px 80px', gap: 10, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
          {['Entreprise', 'Secteur', 'Ville', 'Taille', 'Source', 'Accès'].map(h => (
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
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px 80px', gap: 10, padding: '10px 4px', borderBottom: i < rows.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {e.photo_url ? (
                <img src={e.photo_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fff3e0', color: 'var(--accent)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {initiales(e.raison_sociale)}
                </div>
              )}
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
            <div>
              <button
                className="btn-sm"
                style={{ fontSize: 11, color: 'var(--accent)', background: '#fff3e0' }}
                onClick={() => onNavigateEntreprise?.(e.id)}
              >
                <i className="ti ti-eye" /> Voir
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
// PANEL ADMIN — VUE ENTREPRISE (Fiche + Offres)
// ══════════════════════════════════════════════════════════════════════════════
export function PanelAdminEntreprise({ entrepriseId, onBack }) {
  const supabase = createClient()
  const [tab, setTab]           = useState('fiche')
  const [fiche, setFiche]       = useState(null)
  const [form, setForm]         = useState({})
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('entreprises').select('*').eq('id', entrepriseId).single()
      if (data) { setFiche(data); setForm(data) }
      setLoading(false)
    }
    load()
  }, [entrepriseId])

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const { data, error } = await supabase
      .from('entreprises')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', entrepriseId)
      .select().single()
    if (error) { setMsg('Erreur : ' + error.message) }
    else { setFiche(data); setForm(data); setEditing(false); setMsg('Enregistré !'); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  async function handlePhotoUpload(file) {
    if (!entrepriseId) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `entreprises/${entrepriseId}/photo.${ext}`
    const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true })
    if (error) { setMsg('Erreur photo : ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path)
    await supabase.from('entreprises').update({ photo_url: publicUrl }).eq('id', entrepriseId)
    setFiche(p => ({ ...p, photo_url: publicUrl }))
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  const f = editing ? form : fiche

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-sm" onClick={onBack}><i className="ti ti-arrow-left" /> Retour</button>
          <div>
            <div className="page-title">{fiche?.raison_sociale || 'Entreprise'}</div>
            <div className="page-sub">Vue admin — {fiche?.siret ? `SIRET ${fiche.siret}` : 'Aucun SIRET'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
          {tab === 'fiche' && (
            editing
              ? <button className="btn-sm teal" onClick={handleSave} disabled={saving}><i className="ti ti-device-floppy" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              : <button className="btn-sm teal" onClick={() => setEditing(true)}><i className="ti ti-edit" /> Modifier</button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
        <button className={`btn-sm ${tab === 'fiche' ? 'accent' : ''}`} onClick={() => setTab('fiche')}>
          <i className="ti ti-building" /> Fiche entreprise
        </button>
        <button className={`btn-sm ${tab === 'offres' ? 'accent' : ''}`} onClick={() => setTab('offres')}>
          <i className="ti ti-speakerphone" /> Offres
        </button>
      </div>

      {tab === 'fiche' && (
        <div className="s-card">
          {/* Avatar + nom */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <AvatarPhoto
              url={editing ? form.photo_url : fiche?.photo_url}
              initials={initiales(f?.raison_sociale)}
              size={64}
              bg="#fff3e0"
              color="var(--accent)"
              onUpload={handlePhotoUpload}
              uploading={uploading}
            />
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
              {f?.raison_sociale || <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>—</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Raison sociale', 'raison_sociale'],
              ['SIRET', 'siret'],
              ['Adresse', 'adresse'],
              ['Code postal', 'code_postal'],
              ['Ville', 'ville'],
              ['Email', 'email'],
              ['Téléphone', 'telephone'],
              ['Site web', 'site_web'],
              ['Description', 'description'],
            ].map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
                {editing ? (
                  key === 'description'
                    ? <textarea value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                    : <input value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--navy)' }}>{f?.[key] || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
                )}
              </div>
            ))}

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Secteur</div>
              {editing ? (
                <select value={form.secteur || ''} onChange={e => setForm(p => ({ ...p, secteur: e.target.value }))} style={inputStyle}>
                  <option value="">— Sélectionner —</option>
                  {SECTEURS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--navy)' }}>{f?.secteur || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Taille</div>
              {editing ? (
                <select value={form.taille || ''} onChange={e => setForm(p => ({ ...p, taille: e.target.value }))} style={inputStyle}>
                  <option value="">— Sélectionner —</option>
                  <option value="tpe">TPE (moins de 11 salariés)</option>
                  <option value="pme">PME (11 à 249 salariés)</option>
                  <option value="ge">Grande entreprise (250+)</option>
                </select>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--navy)' }}>
                  {({ tpe: 'TPE (moins de 11 salariés)', pme: 'PME (11 à 249 salariés)', ge: 'Grande entreprise (250+)' }[f?.taille]) || <span style={{ color: 'var(--muted)' }}>—</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'offres' && (
        <PanelEntrepriseOffres entrepriseIdOverride={entrepriseId} hideTopbar />
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ADMIN — VUE CANDIDAT
// ══════════════════════════════════════════════════════════════════════════════
export function PanelAdminCandidat({ candidatId, onBack }) {
  const supabase = createClient()
  const [profil, setProfil]       = useState(null)
  const [form, setForm]           = useState({})
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('candidats').select('*').eq('id', candidatId).single()
      if (data) { setProfil(data); setForm(data) }
      setLoading(false)
    }
    load()
  }, [candidatId])

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const { data, error } = await supabase
      .from('candidats')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', candidatId)
      .select().single()
    if (error) { setMsg('Erreur : ' + error.message) }
    else { setProfil(data); setForm(data); setEditing(false); setMsg('Enregistré !'); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  async function handlePhotoUpload(file) {
    if (!candidatId) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `candidats/${candidatId}/photo.${ext}`
    const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true })
    if (error) { setMsg('Erreur photo : ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path)
    await supabase.from('candidats').update({ photo_url: publicUrl }).eq('id', candidatId)
    setProfil(p => ({ ...p, photo_url: publicUrl }))
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
  }

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }
  function setTags(key, val) {
    setForm(f => ({ ...f, [key]: val.split(',').map(s => s.trim()).filter(Boolean) }))
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  const f = editing ? form : profil
  const displayUrl = (editing ? form.photo_url : profil?.photo_url) || null
  const initials = [(f?.prenom || '')[0], (f?.nom || '')[0]].filter(Boolean).join('').toUpperCase() || '?'

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-sm" onClick={onBack}><i className="ti ti-arrow-left" /> Retour</button>
          <div>
            <div className="page-title">{[profil?.prenom, profil?.nom].filter(Boolean).join(' ') || 'Candidat'}</div>
            <div className="page-sub">Vue admin — profil candidat</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
          {editing
            ? <button className="btn-sm teal" onClick={handleSave} disabled={saving}><i className="ti ti-device-floppy" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            : <button className="btn-sm teal" onClick={() => setEditing(true)}><i className="ti ti-edit" /> Modifier</button>
          }
        </div>
      </div>

      {/* Identité */}
      <div className="s-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <AvatarPhoto
          url={displayUrl}
          initials={initials}
          size={64}
          bg="var(--teal-soft, #ccfbf1)"
          color="var(--teal)"
          onUpload={handlePhotoUpload}
          uploading={uploading}
        />
        {editing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Prénom" value={form.prenom || ''} onChange={e => setField('prenom', e.target.value)} style={inputStyle} />
              <input placeholder="Nom" value={form.nom || ''} onChange={e => setField('nom', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Ville" value={form.ville || ''} onChange={e => setField('ville', e.target.value)} style={inputStyle} />
              <input placeholder="Formation" value={form.formation || ''} onChange={e => setField('formation', e.target.value)} style={inputStyle} />
            </div>
            <input placeholder="Disponibilité" value={form.disponibilite || ''} onChange={e => setField('disponibilite', e.target.value)} style={inputStyle} />
            <textarea placeholder="Bio" value={form.bio || ''} onChange={e => setField('bio', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <input placeholder="Passions (séparées par virgule)" value={(form.passions || []).join(', ')} onChange={e => setTags('passions', e.target.value)} style={inputStyle} />
            <input placeholder="Loisirs (séparés par virgule)" value={(form.loisirs || []).join(', ')} onChange={e => setTags('loisirs', e.target.value)} style={inputStyle} />
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>
              {[profil?.prenom, profil?.nom].filter(Boolean).join(' ') || 'Profil incomplet'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {profil?.ville && <span className="pill teal"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {profil.ville}</span>}
              {profil?.formation && <span className="pill purple">{profil.formation}</span>}
              {profil?.disponibilite && <span className="pill accent">{profil.disponibilite}</span>}
            </div>
            {profil?.bio && <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>{profil.bio}</div>}
            {profil?.email && <div style={{ fontSize: 12, color: 'var(--muted)' }}><i className="ti ti-mail" style={{ marginRight: 4 }} />{profil.email}</div>}
          </div>
        )}
      </div>

      {/* Passions & loisirs en lecture */}
      {!editing && ((profil?.passions?.length > 0) || (profil?.loisirs?.length > 0)) && (
        <div className="grid2">
          {profil.passions?.length > 0 && (
            <div className="s-card" style={{ marginBottom: 0 }}>
              <div className="s-card-title" style={{ marginBottom: 8 }}><i className="ti ti-heart" /> Passions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {profil.passions.map(p => <span key={p} className="tag hi">{p}</span>)}
              </div>
            </div>
          )}
          {profil.loisirs?.length > 0 && (
            <div className="s-card" style={{ marginBottom: 0 }}>
              <div className="s-card-title" style={{ marginBottom: 8 }}><i className="ti ti-confetti" /> Loisirs</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {profil.loisirs.map(l => <span key={l} className="tag">{l}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visibilité */}
      <div className="s-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 2 }}>
            <i className="ti ti-eye" style={{ marginRight: 6 }} />
            Profil visible par les entreprises
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {(editing ? form.profil_public : profil?.profil_public)
              ? 'Profil visible dans les recherches entreprise'
              : 'Profil masqué'}
          </div>
        </div>
        <button
          className={`toggle ${(editing ? form.profil_public : profil?.profil_public) ? 'on' : ''}`}
          onClick={async () => {
            const val = !(editing ? form.profil_public : profil?.profil_public)
            setField('profil_public', val)
            if (!editing) {
              const { error } = await supabase.from('candidats').update({ profil_public: val }).eq('id', candidatId)
              if (!verifier(error, 'Le changement de visibilité du profil a échoué.')) {
                setField('profil_public', !val)
                return
              }
              setProfil(p => ({ ...p, profil_public: val }))
            }
          }}
        />
      </div>
    </>
  )
}

const inputStyle = {
  flex: 1, minWidth: 160, padding: '7px 11px', borderRadius: 8,
  border: '0.5px solid var(--border)', background: 'var(--light)',
  fontSize: 12.5, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const selectStyle = {
  padding: '7px 11px', borderRadius: 8, border: '0.5px solid var(--border)',
  background: 'var(--light)', fontSize: 12.5, fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)', outline: 'none', minWidth: 160,
}
