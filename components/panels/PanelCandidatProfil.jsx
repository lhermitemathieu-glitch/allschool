'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

const CHAMPS = ['prenom', 'nom', 'ville', 'formation', 'disponibilite', 'bio']

function completion(profil) {
  const total = [...CHAMPS, 'passions', 'loisirs'].length
  let remplis = CHAMPS.filter((c) => profil[c]?.trim()).length
  if (profil.passions?.length) remplis++
  if (profil.loisirs?.length)  remplis++
  return Math.round((remplis / total) * 100)
}

function initiales(prenom, nom) {
  return [(prenom || '')[0], (nom || '')[0]].filter(Boolean).join('').toUpperCase() || '?'
}

export default function PanelCandidatProfil() {
  const supabase = createClient()

  const [profil, setProfil]     = useState(null)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [message, setMessage]   = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('candidats').select('*').eq('id', user.id).single()
      if (data) {
        setProfil(data)
        setForm(data)
      } else {
        const vide = { id: user.id, prenom: '', nom: '', ville: '', formation: '', disponibilite: '', bio: '', passions: [], loisirs: [] }
        setProfil(vide)
        setForm(vide)
        setEditing(true)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('candidats').upsert({
      ...form,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      setProfil(form)
      setEditing(false)
      setMessage('Profil enregistré !')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function setTags(key, val) {
    const arr = val.split(',').map((s) => s.trim()).filter(Boolean)
    setForm((f) => ({ ...f, [key]: arr }))
  }

  if (!profil) {
    return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
  }

  const pct = completion(editing ? form : profil)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mon profil</div>
          <div className="page-sub">Complété à {pct}%</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {message && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{message}</span>}
          <button className="btn-sm"><i className="ti ti-qrcode" /> QR Code</button>
          {editing
            ? <button className="btn-sm teal" onClick={handleSave} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            : <button className="btn-sm teal" onClick={() => setEditing(true)}>
                <i className="ti ti-edit" /> Modifier
              </button>
          }
        </div>
      </div>

      {/* Carte identité */}
      <div className="s-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--teal-mid)' }}>
            {initiales(editing ? form.prenom : profil.prenom, editing ? form.nom : profil.nom)}
          </div>
        </div>

        {editing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Prénom"
                value={form.prenom || ''}
                onChange={(e) => setField('prenom', e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Nom"
                value={form.nom || ''}
                onChange={(e) => setField('nom', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Ville (ex: Paris 11e)"
                value={form.ville || ''}
                onChange={(e) => setField('ville', e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Formation (ex: Bachelor Marketing)"
                value={form.formation || ''}
                onChange={(e) => setField('formation', e.target.value)}
                style={inputStyle}
              />
            </div>
            <input
              placeholder="Disponibilité (ex: Dispo sept. 2025)"
              value={form.disponibilite || ''}
              onChange={(e) => setField('disponibilite', e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Bio — présente-toi en quelques phrases"
              value={form.bio || ''}
              onChange={(e) => setField('bio', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>
              {profil.prenom || profil.nom ? `${profil.prenom} ${profil.nom}`.trim() : 'Profil incomplet'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {profil.ville         && <span className="pill teal"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {profil.ville}</span>}
              {profil.formation     && <span className="pill purple">{profil.formation}</span>}
              {profil.disponibilite && <span className="pill accent">{profil.disponibilite}</span>}
            </div>
            {profil.bio && (
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{profil.bio}</div>
            )}
            <div style={{ background: 'var(--light)', borderRadius: 100, height: 5, marginTop: 10 }}>
              <div style={{ width: `${pct}%`, height: 5, borderRadius: 100, background: 'var(--teal)', transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Grille passions / loisirs */}
      <div className="grid3">
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-heart" /> Passions</div>
          </div>
          {editing ? (
            <input
              placeholder="Social media, Copywriting, UX Design…"
              value={(form.passions || []).join(', ')}
              onChange={(e) => setTags('passions', e.target.value)}
              style={inputStyle}
            />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(profil.passions || []).length
                ? profil.passions.map((p) => <span key={p} className="tag hi">{p}</span>)
                : <span style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune passion renseignée</span>}
            </div>
          )}
        </div>

        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-confetti" /> Loisirs</div>
          </div>
          {editing ? (
            <input
              placeholder="Musique, Running, Photo…"
              value={(form.loisirs || []).join(', ')}
              onChange={(e) => setTags('loisirs', e.target.value)}
              style={inputStyle}
            />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(profil.loisirs || []).length
                ? profil.loisirs.map((l) => <span key={l} className="tag">{l}</span>)
                : <span style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun loisir renseigné</span>}
            </div>
          )}
        </div>

        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-chart-bar" /> Complétion</div>
          </div>
          <div style={{ fontSize: 32, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'var(--teal)' }}>{pct}%</div>
          <div style={{ background: 'var(--light)', borderRadius: 100, height: 8, marginTop: 8 }}>
            <div style={{ width: `${pct}%`, height: 8, borderRadius: 100, background: 'var(--teal)', transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            {pct < 100 ? 'Complète ton profil pour plus de visibilité' : 'Profil complet !'}
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
