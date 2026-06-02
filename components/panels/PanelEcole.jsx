'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

// ── PAGE PUBLIQUE ─────────────────────────────────────────────────────────────
export function PanelEcolePage() {
  const supabase = createClient()
  const [ecole, setEcole]             = useState(null)
  const [formations, setFormations]   = useState([])
  const [evenements, setEvenements]   = useState([])
  const [editing, setEditing]         = useState(false)
  const [form, setForm]               = useState({})
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState('')
  const [loading, setLoading]         = useState(true)
  const [showFormForm, setShowFormForm] = useState(false)
  const [newFormation, setNewFormation] = useState({ nom: '', niveau: 'bach', nb_apprentis: '', taux_presentation: '', taux_reussite: '' })
  const [showEvtForm, setShowEvtForm]   = useState(false)
  const [newEvt, setNewEvt]             = useState({ titre: '', date_event: '', lieu: '', meta: '' })
  const [ecoleId, setEcoleId]           = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: e } = await supabase.from('ecoles').select('*').eq('user_id', user.id).maybeSingle()
      if (e) {
        setEcole(e); setForm(e); setEcoleId(e.id)
        const [{ data: f }, { data: ev }] = await Promise.all([
          supabase.from('formations').select('*').eq('ecole_id', e.id).order('created_at'),
          supabase.from('evenements').select('*').eq('ecole_id', e.id).order('date_event'),
        ])
        setFormations(f || [])
        setEvenements(ev || [])
      } else {
        setEditing(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('ecoles').upsert(payload).select().single()
    if (error) { setMsg('Erreur : ' + error.message) }
    else {
      setEcole(data); setForm(data); setEcoleId(data.id); setEditing(false)
      setMsg('Fiche enregistrée !'); setTimeout(() => setMsg(''), 3000)
    }
    setSaving(false)
  }

  async function handleAddFormation() {
    if (!ecoleId || !newFormation.nom) return
    const { data, error } = await supabase.from('formations').insert({ ...newFormation, ecole_id: ecoleId, nb_apprentis: parseInt(newFormation.nb_apprentis) || 0, taux_presentation: parseInt(newFormation.taux_presentation) || null, taux_reussite: parseInt(newFormation.taux_reussite) || null }).select().single()
    if (!error) { setFormations(prev => [...prev, data]); setShowFormForm(false); setNewFormation({ nom: '', niveau: 'bach', nb_apprentis: '', taux_presentation: '', taux_reussite: '' }) }
  }

  async function handleDeleteFormation(id) {
    await supabase.from('formations').delete().eq('id', id)
    setFormations(prev => prev.filter(f => f.id !== id))
  }

  async function handleAddEvt() {
    if (!ecoleId || !newEvt.titre || !newEvt.date_event) return
    const { data, error } = await supabase.from('evenements').insert({ ...newEvt, ecole_id: ecoleId }).select().single()
    if (!error) { setEvenements(prev => [...prev, data].sort((a, b) => a.date_event.localeCompare(b.date_event))); setShowEvtForm(false); setNewEvt({ titre: '', date_event: '', lieu: '', meta: '' }) }
  }

  async function handleDeleteEvt(id) {
    await supabase.from('evenements').delete().eq('id', id)
    setEvenements(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  const e = editing ? form : ecole

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Ma page publique</div>
          <div className="page-sub">Visible par les candidats et les entreprises</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
          {editing
            ? <button className="btn-sm purple" onClick={handleSave} disabled={saving}><i className="ti ti-device-floppy" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            : <button className="btn-sm purple" onClick={() => setEditing(true)}><i className="ti ti-edit" /> Modifier</button>
          }
        </div>
      </div>

      {/* Carte école */}
      <div className="s-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="school-cover">
          <div className="school-logo-abs">{(e?.nom || 'É')[0]}</div>
        </div>
        <div className="school-body">
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="Nom de l'école" value={form.nom || ''} onChange={ev => setForm(f => ({ ...f, nom: ev.target.value }))} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input placeholder="Ville" value={form.ville || ''} onChange={ev => setForm(f => ({ ...f, ville: ev.target.value }))} style={inputStyle} />
                <input placeholder="Type (ex: CFA public)" value={form.type_ecole || ''} onChange={ev => setForm(f => ({ ...f, type_ecole: ev.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="number" placeholder="Nb étudiants" value={form.nb_etudiants || ''} onChange={ev => setForm(f => ({ ...f, nb_etudiants: ev.target.value }))} style={inputStyle} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--navy)' }}>
                  <input type="checkbox" checked={form.qualiopi || false} onChange={ev => setForm(f => ({ ...f, qualiopi: ev.target.checked }))} />
                  Certification Qualiopi
                </label>
              </div>
              <textarea placeholder="Description" value={form.description || ''} onChange={ev => setForm(f => ({ ...f, description: ev.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input placeholder="Site web" value={form.site_web || ''} onChange={ev => setForm(f => ({ ...f, site_web: ev.target.value }))} style={inputStyle} />
                <input placeholder="LinkedIn" value={form.linkedin || ''} onChange={ev => setForm(f => ({ ...f, linkedin: ev.target.value }))} style={inputStyle} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>{e?.nom || 'Fiche incomplète'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {e?.ville       && <span className="pill" style={{ background: 'var(--light)' }}><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {e.ville}</span>}
                  {e?.qualiopi    && <span className="pill purple">Qualiopi</span>}
                  {e?.nb_etudiants && <span className="pill">{e.nb_etudiants.toLocaleString('fr-FR')} étudiants</span>}
                  {e?.type_ecole  && <span className="pill">{e.type_ecole}</span>}
                </div>
                {e?.description && <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>{e.description}</div>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {e?.site_web && <span className="pill" style={{ cursor: 'pointer' }} onClick={() => window.open(e.site_web, '_blank')}><i className="ti ti-world" style={{ fontSize: 10 }} /> Site web</span>}
                  {e?.linkedin && <span className="pill" style={{ cursor: 'pointer' }} onClick={() => window.open(e.linkedin, '_blank')}><i className="ti ti-brand-linkedin" style={{ fontSize: 10 }} /> LinkedIn</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid2">
        {/* Formations */}
        <div className="s-card">
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-certificate" /> Formations & résultats</div>
            <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setShowFormForm(v => !v)}>+ Ajouter</button>
          </div>

          {showFormForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: 10, background: 'var(--light)', borderRadius: 8 }}>
              <input placeholder="Nom de la formation" value={newFormation.nom} onChange={e => setNewFormation(f => ({ ...f, nom: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                <select value={newFormation.niveau} onChange={e => setNewFormation(f => ({ ...f, niveau: e.target.value }))} style={{ ...inputStyle, padding: '6px 8px' }}>
                  <option value="cap">CAP</option>
                  <option value="bts">BTS</option>
                  <option value="bach">Bachelor</option>
                  <option value="master">Master</option>
                </select>
                <input type="number" placeholder="Apprentis" value={newFormation.nb_apprentis} onChange={e => setNewFormation(f => ({ ...f, nb_apprentis: e.target.value }))} style={{ ...inputStyle, padding: '6px 8px' }} />
                <input type="number" placeholder="% Présent." value={newFormation.taux_presentation} onChange={e => setNewFormation(f => ({ ...f, taux_presentation: e.target.value }))} style={{ ...inputStyle, padding: '6px 8px' }} />
                <input type="number" placeholder="% Réussite" value={newFormation.taux_reussite} onChange={e => setNewFormation(f => ({ ...f, taux_reussite: e.target.value }))} style={{ ...inputStyle, padding: '6px 8px' }} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-sm purple" onClick={handleAddFormation}><i className="ti ti-check" /> Ajouter</button>
                <button className="btn-sm" onClick={() => setShowFormForm(false)}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.75rem', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Formation</div><div>Présent.</div><div>Réussite</div><div></div>
          </div>
          {formations.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Aucune formation ajoutée.</div>
          ) : formations.map((f, i) => (
            <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.75rem', alignItems: 'center', padding: '9px 0', borderBottom: i < formations.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{f.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.niveau?.toUpperCase()} · {f.nb_apprentis} apprentis</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--purple)' }}>{f.taux_presentation != null ? f.taux_presentation + '%' : '—'}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--teal)' }}>{f.taux_reussite != null ? f.taux_reussite + '%' : '—'}</div>
              <button className="btn-sm" style={{ fontSize: 11, color: 'var(--muted)' }} onClick={() => handleDeleteFormation(f.id)}><i className="ti ti-trash" /></button>
            </div>
          ))}
        </div>

        {/* Événements */}
        <div className="s-card">
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-calendar" /> Événements à venir</div>
            <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setShowEvtForm(v => !v)}>+ Ajouter</button>
          </div>

          {showEvtForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: 10, background: 'var(--light)', borderRadius: 8 }}>
              <input placeholder="Titre de l'événement" value={newEvt.titre} onChange={e => setNewEvt(f => ({ ...f, titre: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input type="date" value={newEvt.date_event} onChange={e => setNewEvt(f => ({ ...f, date_event: e.target.value }))} style={inputStyle} />
                <input placeholder="Lieu" value={newEvt.lieu} onChange={e => setNewEvt(f => ({ ...f, lieu: e.target.value }))} style={inputStyle} />
              </div>
              <input placeholder="Description courte" value={newEvt.meta} onChange={e => setNewEvt(f => ({ ...f, meta: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-sm purple" onClick={handleAddEvt}><i className="ti ti-check" /> Ajouter</button>
                <button className="btn-sm" onClick={() => setShowEvtForm(false)}>Annuler</button>
              </div>
            </div>
          )}

          {evenements.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Aucun événement planifié.</div>
          ) : evenements.map((ev, i) => {
            const d = new Date(ev.date_event)
            const jour  = d.toLocaleDateString('fr-FR', { day: '2-digit' })
            const mois  = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
            return (
              <div key={ev.id} className="event-item" style={{ position: 'relative' }}>
                <div className="event-date">
                  <div className="event-day">{jour}</div>
                  <div className="event-month">{mois}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{ev.titre}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{[ev.lieu, ev.meta].filter(Boolean).join(' · ')}</div>
                </div>
                <button className="btn-sm" style={{ fontSize: 11, color: 'var(--muted)' }} onClick={() => handleDeleteEvt(ev.id)}><i className="ti ti-trash" /></button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── APPRENTIS ─────────────────────────────────────────────────────────────────
export function PanelEcoleApprentis() {
  const supabase = createClient()
  const [apprentis, setApprentis]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [ecoleId, setEcoleId]       = useState(null)
  const [invite, setInvite]         = useState('')
  const [inviting, setInviting]     = useState(false)
  const [inviteMsg, setInviteMsg]   = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ecole } = await supabase.from('ecoles').select('id').eq('user_id', user.id).maybeSingle()
      if (!ecole) { setLoading(false); return }
      setEcoleId(ecole.id)
      const { data } = await supabase
        .from('ecole_apprentis')
        .select('*, candidat:candidats(prenom, nom, ville, formation)')
        .eq('ecole_id', ecole.id)
        .order('created_at', { ascending: false })
      setApprentis(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleToggleTop(row) {
    await supabase.from('ecole_apprentis').update({ top_profil: !row.top_profil }).eq('id', row.id)
    setApprentis(prev => prev.map(a => a.id === row.id ? { ...a, top_profil: !row.top_profil } : a))
  }

  async function handleToggleStatut(row) {
    const nouveau = row.statut === 'cherche' ? 'signe' : 'cherche'
    await supabase.from('ecole_apprentis').update({ statut: nouveau }).eq('id', row.id)
    setApprentis(prev => prev.map(a => a.id === row.id ? { ...a, statut: nouveau } : a))
  }

  async function handleInvite() {
    if (!invite.trim() || !ecoleId) return
    setInviting(true)
    // Recherche le candidat par email via auth (nécessite une fonction Edge ou une table avec email public)
    // Pour l'instant on cherche par nom dans la table candidats
    const [prenom, ...rest] = invite.trim().split(' ')
    const nom = rest.join(' ')
    const { data: candidat } = await supabase
      .from('candidats')
      .select('id')
      .ilike('prenom', prenom)
      .ilike('nom', nom || '%')
      .maybeSingle()

    if (!candidat) {
      setInviteMsg('Candidat introuvable — vérifiez le nom.')
    } else {
      const { error } = await supabase.from('ecole_apprentis').insert({ ecole_id: ecoleId, candidat_id: candidat.id })
      if (error) { setInviteMsg('Déjà rattaché ou erreur.') }
      else {
        const { data: row } = await supabase.from('ecole_apprentis').select('*, candidat:candidats(prenom, nom, ville, formation)').eq('ecole_id', ecoleId).eq('candidat_id', candidat.id).single()
        setApprentis(prev => [row, ...prev])
        setInvite('')
        setInviteMsg('Apprenti rattaché !')
      }
    }
    setTimeout(() => setInviteMsg(''), 3000)
    setInviting(false)
  }

  const total   = apprentis.length
  const cherche = apprentis.filter(a => a.statut === 'cherche').length
  const signe   = apprentis.filter(a => a.statut === 'signe').length
  const tops    = apprentis.filter(a => a.top_profil).length

  const CLS_BG = ['var(--teal-soft)', 'var(--purple-soft)', 'var(--accent-soft)']
  const CLS_FG = ['var(--teal-mid)', 'var(--purple-mid)', '#993C1D']

  function initiales(c) {
    return [(c?.prenom || '')[0], (c?.nom || '')[0]].filter(Boolean).join('').toUpperCase() || '?'
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes apprentis</div>
          <div className="page-sub">Gérez et mettez en avant vos alternants</div>
        </div>
      </div>

      <div className="grid4" style={{ marginBottom: '1.25rem' }}>
        {[
          { num: total,   label: 'Total apprentis',    color: 'var(--navy)'   },
          { num: cherche, label: 'En recherche',        color: 'var(--accent)' },
          { num: signe,   label: 'Contrat signé',       color: 'var(--purple)' },
          { num: tops,    label: 'Tops profils',        color: 'var(--gold)'   },
        ].map((s, i) => (
          <div key={i} className="stat-mini">
            <span className="stat-num" style={{ color: s.color }}>{s.num}</span>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-users" /> Liste des apprentis</div>
        </div>

        {!ecoleId && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Complétez d'abord votre fiche école pour rattacher des apprentis.</div>
        )}

        {apprentis.length === 0 && ecoleId ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Aucun apprenti rattaché pour l'instant.</div>
        ) : apprentis.map((a, i) => (
          <div key={a.id} className="entry-row">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: CLS_BG[i % 3], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, color: CLS_FG[i % 3], flexShrink: 0 }}>
              {initiales(a.candidat)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="e-name">{a.candidat?.prenom} {a.candidat?.nom}</div>
              <div className="e-meta">{[a.candidat?.formation, a.candidat?.ville].filter(Boolean).join(' · ')}</div>
            </div>
            <span className={`pill ${a.statut === 'signe' ? 'teal' : 'accent'}`} style={{ cursor: 'pointer' }} onClick={() => handleToggleStatut(a)}>
              {a.statut === 'signe' ? 'Contrat signé' : 'En recherche'}
            </span>
            <button
              className={`btn-sm ${a.top_profil ? 'purple' : ''}`}
              style={{ marginLeft: 4, fontSize: 11 }}
              onClick={() => handleToggleTop(a)}
            >
              <i className="ti ti-star" /> {a.top_profil ? 'Top' : ''}
            </button>
          </div>
        ))}

        {ecoleId && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
            <input
              type="text"
              value={invite}
              onChange={e => setInvite(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder="Prénom Nom du candidat…"
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }}
            />
            <button className="btn-sm purple" onClick={handleInvite} disabled={inviting}>
              <i className="ti ti-plus" /> Rattacher
            </button>
            {inviteMsg && <span style={{ fontSize: 12, color: 'var(--teal)' }}>{inviteMsg}</span>}
          </div>
        )}
      </div>
    </>
  )
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
export function PanelEcoleDashboard() {
  const supabase = createClient()
  const [stats, setStats]     = useState({ total: 0, cherche: 0, signe: 0, tops: 0 })
  const [ecole, setEcole]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: e } = await supabase.from('ecoles').select('id, nom').eq('user_id', user.id).maybeSingle()
      if (!e) { setLoading(false); return }
      setEcole(e)
      const { data: ap } = await supabase.from('ecole_apprentis').select('statut, top_profil').eq('ecole_id', e.id)
      const rows = ap || []
      setStats({
        total:  rows.length,
        cherche: rows.filter(r => r.statut === 'cherche').length,
        signe:   rows.filter(r => r.statut === 'signe').length,
        tops:    rows.filter(r => r.top_profil).length,
      })
      setLoading(false)
    }
    load()
  }, [])

  const slug = ecole?.nom?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'mon-ecole'
  const liens = [
    { bg: 'var(--accent-soft)', iconColor: 'var(--accent)', icon: 'ti-building', label: 'Lien avis entreprises', url: `allschool.fr/avis/${slug}/entreprise` },
    { bg: 'var(--purple-soft)', iconColor: 'var(--purple)', icon: 'ti-user-circle', label: 'Lien avis apprentis', url: `allschool.fr/avis/${slug}/apprenti` },
  ]

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Performance de l'école sur Allschool</div>
        </div>
      </div>

      <div className="grid4" style={{ marginBottom: '1.25rem' }}>
        {[
          { num: stats.total,   label: 'Apprentis rattachés',    color: 'var(--navy)'   },
          { num: stats.cherche, label: 'En recherche',            color: 'var(--accent)' },
          { num: stats.signe,   label: 'Contrats signés',         color: 'var(--purple)' },
          { num: stats.tops,    label: 'Tops profils',            color: 'var(--gold)'   },
        ].map((s, i) => (
          <div key={i} className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
            <span className="stat-num" style={{ color: s.color }}>{s.num}</span>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-star" /> Liens de collecte d'avis</div>
        </div>
        {liens.map((l, i) => (
          <div key={i} className="avis-link-card">
            <div style={{ width: 36, height: 36, borderRadius: 8, background: l.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${l.icon}`} style={{ fontSize: 15, color: l.iconColor }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--navy)', marginBottom: 2 }}>{l.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.url}</div>
            </div>
            <button className="btn-sm" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => navigator.clipboard.writeText(l.url)}>
              <i className="ti ti-copy" /> Copier
            </button>
          </div>
        ))}
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
