'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'

// ── SIRET ─────────────────────────────────────────────────────────────────────
export function PanelEntrepriseSiret() {
  const supabase = createClient()
  const [siret, setSiret]       = useState('')
  const [fiche, setFiche]       = useState(null)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('entreprises').select('*').eq('user_id', user.id).maybeSingle()
      if (data) { setFiche(data); setForm(data) }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('entreprises').upsert(payload).select().single()
    if (error) { setMsg('Erreur : ' + error.message) }
    else { setFiche(data); setForm(data); setEditing(false); setMsg('Entreprise enregistrée !'); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  // Formulaire d'onboarding si pas encore de fiche
  if (!fiche && !editing) {
    return (
      <>
        <div className="topbar">
          <div>
            <div className="page-title">Créer mon compte entreprise</div>
            <div className="page-sub">Vérification SIRET obligatoire</div>
          </div>
        </div>
        <div className="siret-wrap">
          <div className="siret-icon"><i className="ti ti-building" /></div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>Entrez votre numéro SIRET</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>Le SIRET garantit que vous êtes bien une entreprise réelle et vous donne accès aux coordonnées des candidats.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              value={siret}
              onChange={e => setSiret(e.target.value)}
              placeholder="Ex : 381 658 820 00038"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }}
            />
            <button className="btn-sm accent" style={{ padding: '10px 18px', fontSize: 13 }} onClick={() => { setForm({ siret: siret.replace(/\s/g, '') }); setEditing(true) }}>
              <i className="ti ti-check" /> Valider
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '1rem 0', color: 'var(--muted)', fontSize: 13 }}>
            <div style={{ flex: 1, height: 0.5, background: 'var(--border)' }} />
            Je ne connais pas mon SIRET
            <div style={{ flex: 1, height: 0.5, background: 'var(--border)' }} />
          </div>
          <div className="siret-help" onClick={() => window.open('https://www.pappers.fr', '_blank')}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'white', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-search" style={{ fontSize: 16, color: 'var(--navy)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>Retrouver mon SIRET sur Pappers</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Recherche gratuite · pappers.fr</div>
            </div>
            <i className="ti ti-external-link" style={{ fontSize: 15, color: 'var(--muted)', marginLeft: 'auto' }} />
          </div>
        </div>
      </>
    )
  }

  // Fiche entreprise (lecture / édition)
  const f = editing ? form : fiche
  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mon entreprise</div>
          <div className="page-sub">{f?.raison_sociale || f?.siret || 'Fiche entreprise'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
          {editing
            ? <button className="btn-sm teal" onClick={handleSave} disabled={saving}><i className="ti ti-device-floppy" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            : <button className="btn-sm teal" onClick={() => setEditing(true)}><i className="ti ti-edit" /> Modifier</button>
          }
        </div>
      </div>

      <div className="s-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['SIRET', 'siret', 'text', '381 658 820 00038'],
            ['Raison sociale', 'raison_sociale', 'text', 'Ex : Boulangerie Leroux'],
            ['Secteur', 'secteur', 'text', 'Ex : Artisanat alimentaire'],
            ['Adresse', 'adresse', 'text', '12 rue de la Paix'],
            ['Ville', 'ville', 'text', 'Paris'],
          ].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              {editing
                ? <input type={type} value={form[key] || ''} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} style={inputStyle} />
                : <div style={{ fontSize: 14, color: 'var(--navy)' }}>{f?.[key] || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
              }
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taille</div>
            {editing
              ? (
                <select value={form.taille || ''} onChange={e => setForm(prev => ({ ...prev, taille: e.target.value }))} style={inputStyle}>
                  <option value="">— Sélectionner —</option>
                  <option value="tpe">TPE (moins de 11 salariés)</option>
                  <option value="pme">PME (11 à 249 salariés)</option>
                  <option value="ge">Grande entreprise (250+)</option>
                </select>
              )
              : <div style={{ fontSize: 14, color: 'var(--navy)' }}>{{ tpe: 'TPE', pme: 'PME', ge: 'Grande entreprise' }[f?.taille] || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
            }
          </div>
        </div>
      </div>
    </>
  )
}

// ── RECHERCHE ─────────────────────────────────────────────────────────────────
export function PanelEntrepriseRecherche({ onNavigate }) {
  const supabase = createClient()
  const [profils, setProfils]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState({ formation: '', ville: '', disponibilite: '' })
  const [toggles, setToggles]   = useState({ teletravail: false, rqth: false, dispo: false })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('candidats').select('id, prenom, nom, ville, formation, disponibilite, passions')
    if (filters.formation)    q = q.ilike('formation', `%${filters.formation}%`)
    if (filters.ville)        q = q.ilike('ville', `%${filters.ville}%`)
    if (filters.disponibilite) q = q.ilike('disponibilite', `%${filters.disponibilite}%`)
    const { data } = await q.limit(20)
    setProfils(data || [])
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  const toggle = key => setToggles(t => ({ ...t, [key]: !t[key] }))

  function initiales(prenom, nom) {
    return [(prenom || '')[0], (nom || '')[0]].filter(Boolean).join('').toUpperCase() || '?'
  }

  const BG_COLORS = ['var(--teal-soft)', 'var(--purple-soft)', 'var(--accent-soft)']
  const FG_COLORS = ['var(--teal-mid)', 'var(--purple-mid)', '#993C1D']

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Rechercher un alternant</div>
          <div className="page-sub">{loading ? 'Chargement…' : `${profils.length} profil${profils.length !== 1 ? 's' : ''} trouvé${profils.length !== 1 ? 's' : ''}`}</div>
        </div>
        <button className="btn-sm accent" onClick={() => onNavigate('entreprise-offres')}>
          <i className="ti ti-plus" /> Déposer une offre
        </button>
      </div>

      <div className="fbar">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Formation</div>
            <input type="text" value={filters.formation} onChange={e => setFilters(f => ({ ...f, formation: e.target.value }))} placeholder="Bachelor, BTS…" style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ville</div>
            <input type="text" value={filters.ville} onChange={e => setFilters(f => ({ ...f, ville: e.target.value }))} placeholder="Paris…" style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disponibilité</div>
            <input type="text" value={filters.disponibilite} onChange={e => setFilters(f => ({ ...f, disponibilite: e.target.value }))} placeholder="Dispo sept…" style={{ width: '100%' }} />
          </div>
          <button className="btn-sm accent" onClick={load}><i className="ti ti-search" /> Filtrer</button>
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {[['teletravail', '100% télétravail'], ['rqth', 'RQTH / Handicap'], ['dispo', 'Dispo immédiate']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className={`toggle ${toggles[key] ? 'on' : ''}`} onClick={() => toggle(key)} />
              <span style={{ fontSize: 12, color: 'var(--navy)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement des profils…</div>
      ) : profils.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Aucun profil ne correspond à vos critères.</div>
      ) : (
        <div className="grid2">
          {profils.map((p, i) => (
            <div key={p.id} className="p-card">
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: BG_COLORS[i % 3], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: FG_COLORS[i % 3], flexShrink: 0 }}>
                  {initiales(p.prenom, p.nom)}
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
                    {p.prenom} {p.nom}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {[p.ville, p.formation].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {p.disponibilite && <span className="tag hi">{p.disponibilite}</span>}
                {(p.passions || []).slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button className="btn-sm accent" style={{ fontSize: 11 }}><i className="ti ti-send" /> Contacter</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── ÉCOLES ────────────────────────────────────────────────────────────────────
export function PanelEntrepriseEcoles({ onNavigateEcole }) {
  const ecoles = [
    { initiales: 'CFA', nom: 'CFA des Métiers du Rhône', lieu: 'Lyon 7e · 3km', type: 'CFA public', typeCls: 'teal', reussite: '94%', apprentis: '320', avis: '4.2' },
    { initiales: 'ISEG', nom: 'ISEG Marketing Lyon', lieu: 'Lyon 2e · 4km', type: 'CFA privé', typeCls: 'purple', reussite: '91%', apprentis: '480', avis: '4.0' },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles près de moi</div>
          <div className="page-sub">18 établissements dans votre zone</div>
        </div>
      </div>

      <div className="fbar" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {[['Ville', 'text', 'Lyon', '140px'], ['Rayon km', 'number', '20', '70px']].map(([label, type, val, w]) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <input type={type} defaultValue={val} style={{ width: w }} />
          </div>
        ))}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secteur</div>
          <select style={{ width: 180 }}><option>Tous secteurs</option><option>Marketing</option><option>Commerce</option><option>Bâtiment</option></select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</div>
          <select style={{ width: 150 }}><option>Tous types</option><option>CFA public</option><option>CFA privé</option><option>CMA</option></select>
        </div>
        <button className="btn-sm accent"><i className="ti ti-search" /> Rechercher</button>
      </div>

      <div className="grid2">
        {ecoles.map((e, i) => (
          <div key={i} className="s-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--light)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 800, color: 'var(--navy)', flexShrink: 0 }}>{e.initiales}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{e.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.lieu}</div>
              </div>
              <span className={`pill ${e.typeCls}`}>{e.type}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[['Réussite', e.reussite], ['Apprentis', e.apprentis], ['Avis', e.avis]].map(([label, val]) => (
                <div key={label} className="stat-mini" style={{ flex: 1, padding: 8 }}>
                  <span className="stat-num" style={{ fontSize: 18 }}>{val}</span>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button className="btn-sm" onClick={() => onNavigateEcole?.(e.id)}><i className="ti ti-eye" /> Voir</button>
              <button className="btn-sm accent"><i className="ti ti-send" /> Contacter</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── OFFRES ────────────────────────────────────────────────────────────────────
export function PanelEntrepriseOffres() {
  const supabase = createClient()
  const [offres, setOffres]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [entrepriseId, setEntrepriseId] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ titre: '', niveau: 'bach', secteur: '', ville: '', description: '' })
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ent } = await supabase.from('entreprises').select('id').eq('user_id', user.id).maybeSingle()
      if (!ent) { setLoading(false); return }
      setEntrepriseId(ent.id)
      const { data } = await supabase.from('offres').select('*').eq('entreprise_id', ent.id).order('created_at', { ascending: false })
      setOffres(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate() {
    if (!entrepriseId) return
    setSaving(true)
    const { data, error } = await supabase.from('offres').insert({ ...form, entreprise_id: entrepriseId }).select().single()
    if (error) { setMsg('Erreur : ' + error.message) }
    else { setOffres(prev => [data, ...prev]); setShowForm(false); setForm({ titre: '', niveau: 'bach', secteur: '', ville: '', description: '' }); setMsg('Offre publiée !'); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  async function handleToggle(offre) {
    const nouveau = offre.statut === 'active' ? 'inactive' : 'active'
    await supabase.from('offres').update({ statut: nouveau }).eq('id', offre.id)
    setOffres(prev => prev.map(o => o.id === offre.id ? { ...o, statut: nouveau } : o))
  }

  async function handleDelete(id) {
    await supabase.from('offres').delete().eq('id', id)
    setOffres(prev => prev.filter(o => o.id !== id))
  }

  const NIVEAUX = { cap: 'CAP', bts: 'BTS / BUT', bach: 'Bachelor', master: 'Master' }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes offres d'alternance</div>
          <div className="page-sub">{offres.filter(o => o.statut === 'active').length} offre{offres.filter(o => o.statut === 'active').length !== 1 ? 's' : ''} active{offres.filter(o => o.statut === 'active').length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
          <button className="btn-sm accent" onClick={() => setShowForm(v => !v)}><i className="ti ti-plus" /> Nouvelle offre</button>
        </div>
      </div>

      {!entrepriseId && (
        <div className="s-card">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Complétez d'abord votre fiche entreprise (SIRET) pour publier des offres.</div>
        </div>
      )}

      {showForm && entrepriseId && (
        <div className="s-card">
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-plus" /> Nouvelle offre</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Titre du poste" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Niveau</div>
                <select value={form.niveau} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))} style={{ ...inputStyle, width: '100%' }}>
                  <option value="cap">CAP</option>
                  <option value="bts">BTS / BUT (Bac+2)</option>
                  <option value="bach">Bachelor (Bac+3)</option>
                  <option value="master">Master (Bac+5)</option>
                </select>
              </div>
              <input placeholder="Secteur" value={form.secteur} onChange={e => setForm(f => ({ ...f, secteur: e.target.value }))} style={inputStyle} />
              <input placeholder="Ville" value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} style={inputStyle} />
            </div>
            <textarea placeholder="Description du poste…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-sm teal" onClick={handleCreate} disabled={saving || !form.titre}><i className="ti ti-check" /> {saving ? 'Publication…' : 'Publier'}</button>
              <button className="btn-sm" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-speakerphone" /> Toutes les offres</div>
        </div>
        {offres.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Aucune offre pour l'instant.</div>
        ) : offres.map(o => (
          <div key={o.id} className="offre-card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div className="status-dot" style={{ background: o.statut === 'active' ? 'var(--teal)' : 'var(--muted)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{o.titre}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {[NIVEAUX[o.niveau], o.ville, o.secteur].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => handleToggle(o)}>
                  <i className={`ti ti-${o.statut === 'active' ? 'pause' : 'player-play'}`} />
                </button>
                <button className="btn-sm" style={{ fontSize: 11, color: 'var(--muted)' }} onClick={() => handleDelete(o.id)}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── SIMULATEUR ────────────────────────────────────────────────────────────────
export function PanelEntrepriseSimulateur() {
  const [niv, setNiv] = useState('bach')
  const [age, setAge] = useState('18')
  const [tail, setTail] = useState('tpe')

  const smic = 1766.92
  const pcts = { bts: 0.27, bach: 0.43, master: 0.53 }
  const ageMod = age === '18' ? 0 : age === '21' ? 0.06 : 0.12
  const base = (pcts[niv] + ageMod) * smic
  const total = base * 1.25
  const aides = { tpe: 6000, pme: 5000, ge: 3000 }
  const aide = aides[tail]
  const net = total - aide / 12
  const fmt = n => Math.round(n).toLocaleString('fr-FR') + ' €'

  const selectStyle = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }
  const labelStyle = { fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Simulateurs</div>
          <div className="page-sub">Coût d'embauche et aides disponibles</div>
        </div>
      </div>

      <div className="s-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Paramètres</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={labelStyle}>Niveau diplôme</div>
                <select value={niv} onChange={e => setNiv(e.target.value)} style={selectStyle}>
                  <option value="bts">BTS / BUT (Bac+2)</option>
                  <option value="bach">Bachelor (Bac+3)</option>
                  <option value="master">Master (Bac+5)</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>Âge</div>
                <select value={age} onChange={e => setAge(e.target.value)} style={selectStyle}>
                  <option value="18">18 à 20 ans</option>
                  <option value="21">21 à 25 ans</option>
                  <option value="26">26 ans et plus</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>Taille entreprise</div>
                <select value={tail} onChange={e => setTail(e.target.value)} style={selectStyle}>
                  <option value="tpe">TPE (- de 11 sal.)</option>
                  <option value="pme">PME (11 à 249)</option>
                  <option value="ge">Grande entreprise</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--light)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Résultats estimés</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Salaire brut / mois', fmt(base), 'var(--navy)'],
                ['Coût total brut', fmt(total) + ' / mois', 'var(--navy)'],
                ['Aide à l\'embauche / an', fmt(aide) + ' / an', 'var(--teal)'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500, color }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <span style={{ fontWeight: 500 }}>Coût net / mois</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{fmt(net)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const inputStyle = {
  padding: '8px 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)',
  background: 'white',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}
