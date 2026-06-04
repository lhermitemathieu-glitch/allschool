'use client'

import { useState, useEffect, useRef } from 'react'
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

function AvatarPhoto({ url, initials, size = 64, onUpload, uploading }) {
  const inputRef = useRef(null)
  const [hover, setHover] = useState(false)
  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: onUpload ? 'pointer' : 'default' }}
      onClick={() => onUpload && inputRef.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {url ? (
        <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--teal-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: size * 0.3, fontWeight: 800, color: 'var(--teal-mid)' }}>
          {initials}
        </div>
      )}
      {onUpload && (hover || uploading) && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${uploading ? 'ti-loader' : 'ti-camera'}`} style={{ color: 'white', fontSize: Math.round(size * 0.3) }} />
        </div>
      )}
      {onUpload && <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) onUpload(f); e.target.value = '' }} />}
    </div>
  )
}

export default function PanelCandidatProfil({ candidatIdOverride, onBack }) {
  const supabase = createClient()

  const [profil, setProfil]       = useState(null)
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [message, setMessage]     = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      let uid = candidatIdOverride
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        uid = user.id
      }
      const { data } = await supabase.from('candidats').select('*').eq('id', uid).single()
      if (data) {
        setProfil(data)
        setForm(data)
      } else {
        const vide = { id: uid, prenom: '', nom: '', ville: '', formation: '', disponibilite: '', bio: '', passions: [], loisirs: [] }
        setProfil(vide)
        setForm(vide)
        setEditing(true)
      }
    }
    load()
  }, [candidatIdOverride])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    let error
    if (candidatIdOverride) {
      ({ error } = await supabase.from('candidats').update({ ...form, updated_at: new Date().toISOString() }).eq('id', candidatIdOverride))
    } else {
      ({ error } = await supabase.from('candidats').upsert({ ...form, updated_at: new Date().toISOString() }))
    }
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

  async function handlePhotoUpload(file) {
    if (!profil?.id) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `candidats/${profil.id}/photo.${ext}`
    const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true })
    if (error) { setMessage('Erreur photo : ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path)
    await supabase.from('candidats').update({ photo_url: publicUrl }).eq('id', profil.id)
    setProfil(p => ({ ...p, photo_url: publicUrl }))
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
  }

  function setField(key, val) { setForm((f) => ({ ...f, [key]: val })) }
  function setTags(key, val) {
    const arr = val.split(',').map((s) => s.trim()).filter(Boolean)
    setForm((f) => ({ ...f, [key]: arr }))
  }

  if (!profil) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  const pct = completion(editing ? form : profil)
  const displayUrl = (editing ? form.photo_url : profil.photo_url) || null

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button className="btn-sm" onClick={onBack}><i className="ti ti-arrow-left" /> Retour</button>
          )}
          <div>
            <div className="page-title">
              {candidatIdOverride ? `Profil — ${[profil.prenom, profil.nom].filter(Boolean).join(' ') || 'Candidat'}` : 'Mon profil'}
            </div>
            <div className="page-sub">Complété à {pct}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {message && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{message}</span>}
          {!candidatIdOverride && <button className="btn-sm"><i className="ti ti-qrcode" /> QR Code</button>}
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
        <AvatarPhoto
          url={displayUrl}
          initials={initiales(editing ? form.prenom : profil.prenom, editing ? form.nom : profil.nom)}
          size={64}
          onUpload={handlePhotoUpload}
          uploading={uploading}
        />

        {editing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Prénom" value={form.prenom || ''} onChange={(e) => setField('prenom', e.target.value)} style={inputStyle} />
              <input placeholder="Nom" value={form.nom || ''} onChange={(e) => setField('nom', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Ville (ex: Paris 11e)" value={form.ville || ''} onChange={(e) => setField('ville', e.target.value)} style={inputStyle} />
              <input placeholder="Formation (ex: Bachelor Marketing)" value={form.formation || ''} onChange={(e) => setField('formation', e.target.value)} style={inputStyle} />
            </div>
            <input placeholder="Disponibilité (ex: Dispo sept. 2025)" value={form.disponibilite || ''} onChange={(e) => setField('disponibilite', e.target.value)} style={inputStyle} />
            <textarea placeholder="Bio — présente-toi en quelques phrases" value={form.bio || ''} onChange={(e) => setField('bio', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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
            {profil.bio && <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{profil.bio}</div>}
            <div style={{ background: 'var(--light)', borderRadius: 100, height: 5, marginTop: 10 }}>
              <div style={{ width: `${pct}%`, height: 5, borderRadius: 100, background: 'var(--teal)', transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Visibilité profil */}
      <div className="s-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 2 }}>
            <i className="ti ti-eye" style={{ marginRight: 6 }} />
            Profil visible par les entreprises
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {(editing ? form.profil_public : profil.profil_public)
              ? 'Ton profil est visible dans les recherches entreprise'
              : 'Ton profil est masqué — les entreprises ne peuvent pas te trouver'}
          </div>
        </div>
        <button
          className={`toggle ${(editing ? form.profil_public : profil.profil_public) ? 'on' : ''}`}
          onClick={() => {
            const val = !(editing ? form.profil_public : profil.profil_public)
            setField('profil_public', val)
            if (!editing) {
              supabase.from('candidats').update({ profil_public: val }).eq('id', profil.id)
              setProfil(p => ({ ...p, profil_public: val }))
            }
          }}
        />
      </div>

      <div className="grid3">
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-heart" /> Passions</div>
          </div>
          {editing ? (
            <input placeholder="Social media, Copywriting, UX Design…" value={(form.passions || []).join(', ')} onChange={(e) => setTags('passions', e.target.value)} style={inputStyle} />
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
            <input placeholder="Musique, Running, Photo…" value={(form.loisirs || []).join(', ')} onChange={(e) => setTags('loisirs', e.target.value)} style={inputStyle} />
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
