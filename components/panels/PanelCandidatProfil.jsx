'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'

/* ─── Constantes ───────────────────────────────────────────── */
const SOFT_SKILLS = [
  'Autonomie', 'Travail en équipe', 'Rigueur', 'Adaptabilité', 'Créativité',
  'Communication', 'Gestion du temps', "Prise d'initiative", 'Esprit d\'analyse',
  'Curiosité intellectuelle', 'Leadership', 'Empathie', 'Gestion du stress',
  'Persévérance', 'Sens des responsabilités', 'Organisation', 'Esprit de synthèse',
  'Force de proposition', 'Écoute active', 'Résilience',
]

const NIVEAUX_ETUDES = [
  '3ème', 'Bac (en cours)', 'Bac', 'Bac+1 (en cours)', 'Bac+1',
  'Bac+2 (en cours)', 'Bac+2', 'Bac+3 (en cours)', 'Bac+3',
  'Bac+4 (en cours)', 'Bac+4', 'Bac+5 (en cours)', 'Bac+5 et +',
]

const NIVEAUX_LANGUE = ['Notions', 'Débutant·e', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue natale']

const MOIS_LABELS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

const currentYear = new Date().getFullYear()
const ANNEES = Array.from({ length: currentYear - 1999 + 3 }, (_, i) => 2000 + i)

/* ─── Helpers ───────────────────────────────────────────────── */
function dureeExp(exp) {
  if (!exp.mois_debut || !exp.annee_debut) return null
  const debut = new Date(Number(exp.annee_debut), Number(exp.mois_debut) - 1)
  const fin = exp.en_cours
    ? new Date()
    : exp.mois_fin && exp.annee_fin
      ? new Date(Number(exp.annee_fin), Number(exp.mois_fin) - 1)
      : null
  if (!fin || fin < debut) return null
  return Math.max(1, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24 * 30.44)))
}

function formatPeriode(exp) {
  const debut = exp.mois_debut && exp.annee_debut
    ? `${MOIS_LABELS[exp.mois_debut - 1]} ${exp.annee_debut}`
    : '?'
  const fin = exp.en_cours ? "Aujourd'hui" : (exp.mois_fin && exp.annee_fin ? `${MOIS_LABELS[exp.mois_fin - 1]} ${exp.annee_fin}` : '?')
  return `${debut} → ${fin}`
}

function newExp() {
  return { id: Date.now(), entreprise: '', poste: '', mois_debut: '', annee_debut: '', mois_fin: '', annee_fin: '', en_cours: false }
}

function newLang() {
  return { id: Date.now(), langue: '', niveau: 'Intermédiaire' }
}

function safeData(data) {
  return {
    ...data,
    passions:          Array.isArray(data.passions)          ? data.passions          : [],
    loisirs:           Array.isArray(data.loisirs)           ? data.loisirs           : [],
    experiences:       Array.isArray(data.experiences)       ? data.experiences       : [],
    competences_soft:  Array.isArray(data.competences_soft)  ? data.competences_soft  : [],
    langues:           Array.isArray(data.langues)           ? data.langues           : [],
    competences_hard:  data.competences_hard  ?? '',
    niveau_etudes:     data.niveau_etudes     ?? '',
    linkedin_url:      data.linkedin_url      ?? '',
    permis:            data.permis            ?? false,
  }
}

const CHAMPS_BASE = ['prenom', 'nom', 'ville', 'formation', 'disponibilite', 'bio']

function completion(profil) {
  const checks = [
    ...CHAMPS_BASE.map(c => !!profil[c]?.trim()),
    (profil.passions?.length   || 0) > 0,
    (profil.loisirs?.length    || 0) > 0,
    (profil.experiences?.length || 0) > 0,
    !!profil.competences_hard?.trim(),
    (profil.competences_soft?.length || 0) > 0,
    !!profil.niveau_etudes,
    (profil.langues?.length    || 0) > 0,
  ]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}

function initiales(prenom, nom) {
  return [(prenom || '')[0], (nom || '')[0]].filter(Boolean).join('').toUpperCase() || '?'
}

/* ─── AvatarPhoto ───────────────────────────────────────────── */
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

/* ─── Composant principal ───────────────────────────────────── */
export default function PanelCandidatProfil({ candidatIdOverride, onBack }) {
  const supabase = createClient()

  const [profil, setProfil]       = useState(null)
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [message, setMessage]     = useState('')
  const [uploading, setUploading] = useState(false)

  // Inputs bruts pour passions / loisirs (pour éviter que les espaces soient mangés)
  const [passionsStr, setPassionsStr] = useState('')
  const [loisirsStr,  setLoisirsStr]  = useState('')

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
        const d = safeData(data)
        setProfil(d)
        setForm(d)
        setPassionsStr((d.passions || []).join(', '))
        setLoisirsStr((d.loisirs || []).join(', '))
      } else {
        const vide = safeData({
          id: uid, prenom: '', nom: '', ville: '', formation: '', disponibilite: '', bio: '',
          passions: [], loisirs: [], experiences: [], competences_hard: '', competences_soft: [],
          niveau_etudes: '', langues: [], linkedin_url: '', permis: false,
        })
        setProfil(vide)
        setForm(vide)
        setPassionsStr('')
        setLoisirsStr('')
        setEditing(true)
      }
    }
    load()
  }, [candidatIdOverride])

  function startEdit() {
    setPassionsStr((form.passions || []).join(', '))
    setLoisirsStr((form.loisirs || []).join(', '))
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')

    // Convertit les strings brutes en tableaux
    const passions = passionsStr.split(',').map(s => s.trim()).filter(Boolean)
    const loisirs  = loisirsStr.split(',').map(s => s.trim()).filter(Boolean)
    const payload  = { ...form, passions, loisirs, updated_at: new Date().toISOString() }

    let error
    if (candidatIdOverride) {
      ({ error } = await supabase.from('candidats').update(payload).eq('id', candidatIdOverride))
    } else {
      ({ error } = await supabase.from('candidats').upsert(payload))
    }

    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      const saved = { ...payload }
      setProfil(saved)
      setForm(saved)
      setEditing(false)
      setMessage('Profil enregistré !')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  async function handlePhotoUpload(file) {
    if (!profil?.id) return
    setUploading(true)
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `candidats/${profil.id}/photo.${ext}`
    const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true })
    if (error) { setMessage('Erreur photo : ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path)
    await supabase.from('candidats').update({ photo_url: publicUrl }).eq('id', profil.id)
    setProfil(p => ({ ...p, photo_url: publicUrl }))
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
  }

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // Expériences
  function addExp()         { setField('experiences', [...(form.experiences || []), newExp()]) }
  function removeExp(id)    { setField('experiences', (form.experiences || []).filter(e => e.id !== id)) }
  function updateExp(id, k, v) {
    setField('experiences', (form.experiences || []).map(e => e.id === id ? { ...e, [k]: v } : e))
  }

  // Langues
  function addLang()        { setField('langues', [...(form.langues || []), newLang()]) }
  function removeLang(id)   { setField('langues', (form.langues || []).filter(l => l.id !== id)) }
  function updateLang(id, k, v) {
    setField('langues', (form.langues || []).map(l => l.id === id ? { ...l, [k]: v } : l))
  }

  // Soft skills
  function toggleSoft(skill) {
    const current = form.competences_soft || []
    const next = current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill]
    setField('competences_soft', next)
  }

  if (!profil) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  const data    = editing ? form : profil
  const pct     = completion(data)
  const dispUrl = data.photo_url || null

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && <button className="btn-sm" onClick={onBack}><i className="ti ti-arrow-left" /> Retour</button>}
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
            : <button className="btn-sm teal" onClick={startEdit}>
                <i className="ti ti-edit" /> Modifier
              </button>
          }
        </div>
      </div>

      {/* ── Carte identité ── */}
      <div className="s-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <AvatarPhoto
          url={dispUrl}
          initials={initiales(data.prenom, data.nom)}
          size={64}
          onUpload={handlePhotoUpload}
          uploading={uploading}
        />
        {editing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Prénom" value={form.prenom || ''} onChange={e => setField('prenom', e.target.value)} style={inputStyle} />
              <input placeholder="Nom"    value={form.nom    || ''} onChange={e => setField('nom',    e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Ville (ex: Paris 11e)"             value={form.ville      || ''} onChange={e => setField('ville',      e.target.value)} style={inputStyle} />
              <input placeholder="Formation (ex: Bachelor Marketing)" value={form.formation  || ''} onChange={e => setField('formation',  e.target.value)} style={inputStyle} />
            </div>
            <input placeholder="Disponibilité (ex: Dispo sept. 2025)" value={form.disponibilite || ''} onChange={e => setField('disponibilite', e.target.value)} style={inputStyle} />
            <textarea placeholder="Bio — présente-toi en quelques phrases" value={form.bio || ''} onChange={e => setField('bio', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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

      {/* ── Visibilité profil ── */}
      <div className="s-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 2 }}>
            <i className="ti ti-eye" style={{ marginRight: 6 }} />Profil visible par les entreprises
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {data.profil_public
              ? 'Ton profil est visible dans les recherches entreprise'
              : 'Ton profil est masqué — les entreprises ne peuvent pas te trouver'}
          </div>
        </div>
        <button
          className={`toggle ${data.profil_public ? 'on' : ''}`}
          onClick={() => {
            const val = !data.profil_public
            setField('profil_public', val)
            if (!editing) {
              supabase.from('candidats').update({ profil_public: val }).eq('id', profil.id)
              setProfil(p => ({ ...p, profil_public: val }))
            }
          }}
        />
      </div>

      {/* ── Infos pratiques (études, permis, LinkedIn) ── */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-id-badge-2" /> Infos pratiques</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {/* Niveau d'études */}
          <div style={{ flex: '1 1 180px' }}>
            <div style={labelStyle}>Niveau d'études actuel</div>
            {editing ? (
              <select value={form.niveau_etudes || ''} onChange={e => setField('niveau_etudes', e.target.value)} style={selectStyle}>
                <option value="">— Sélectionner —</option>
                {NIVEAUX_ETUDES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 13, color: data.niveau_etudes ? 'var(--navy)' : 'var(--muted)', marginTop: 4 }}>
                {data.niveau_etudes || 'Non renseigné'}
              </div>
            )}
          </div>

          {/* LinkedIn */}
          <div style={{ flex: '2 1 240px' }}>
            <div style={labelStyle}><i className="ti ti-brand-linkedin" style={{ marginRight: 4 }} />LinkedIn</div>
            {editing ? (
              <input
                placeholder="https://linkedin.com/in/votre-profil"
                value={form.linkedin_url || ''}
                onChange={e => setField('linkedin_url', e.target.value)}
                style={inputStyle}
              />
            ) : data.linkedin_url ? (
              <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--teal)', marginTop: 4, display: 'block', wordBreak: 'break-all' }}>
                {data.linkedin_url}
              </a>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Non renseigné</div>
            )}
          </div>

          {/* Permis */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <div style={labelStyle}><i className="ti ti-car" style={{ marginRight: 4 }} />Permis de conduire</div>
            {editing ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    onClick={() => setField('permis', v)}
                    style={{
                      padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: form.permis === v ? 'var(--teal)' : 'var(--light)',
                      color: form.permis === v ? 'white' : 'var(--muted)',
                    }}
                  >{v ? 'Oui' : 'Non'}</button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: data.permis ? '#dcfce7' : 'var(--light)',
                  color: data.permis ? '#166534' : 'var(--muted)',
                }}>
                  {data.permis ? 'Oui' : 'Non'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Passions / Loisirs / Complétion ── */}
      <div className="grid3">
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-heart" /> Passions</div>
          </div>
          {editing ? (
            <>
              <input
                placeholder="Social media, Copywriting, UX Design…"
                value={passionsStr}
                onChange={e => setPassionsStr(e.target.value)}
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Sépare les mots-clés par des virgules</div>
            </>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(profil.passions || []).length
                ? profil.passions.map(p => <span key={p} className="tag hi">{p}</span>)
                : <span style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune passion renseignée</span>}
            </div>
          )}
        </div>

        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-confetti" /> Loisirs</div>
          </div>
          {editing ? (
            <>
              <input
                placeholder="Musique, Running, Photo…"
                value={loisirsStr}
                onChange={e => setLoisirsStr(e.target.value)}
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Sépare les mots-clés par des virgules</div>
            </>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(profil.loisirs || []).length
                ? profil.loisirs.map(l => <span key={l} className="tag">{l}</span>)
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

      {/* ── Expériences professionnelles ── */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-briefcase" /> Expériences professionnelles</div>
          {editing && (
            <button className="btn-sm teal" onClick={addExp}>
              <i className="ti ti-plus" /> Ajouter
            </button>
          )}
        </div>

        {(data.experiences || []).length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {editing ? 'Clique sur "+ Ajouter" pour saisir une expérience.' : 'Aucune expérience renseignée.'}
          </div>
        ) : editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(form.experiences || []).map((exp, idx) => (
              <div key={exp.id} style={{ padding: 12, borderRadius: 10, background: 'var(--light)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Expérience {idx + 1}</div>
                  <button onClick={() => removeExp(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14 }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input placeholder="Entreprise" value={exp.entreprise} onChange={e => updateExp(exp.id, 'entreprise', e.target.value)} style={inputStyle} />
                  <input placeholder="Poste occupé" value={exp.poste} onChange={e => updateExp(exp.id, 'poste', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Début</span>
                    <select value={exp.mois_debut} onChange={e => updateExp(exp.id, 'mois_debut', e.target.value)} style={{ ...selectStyle, width: 'auto' }}>
                      <option value="">Mois</option>
                      {MOIS_LABELS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select value={exp.annee_debut} onChange={e => updateExp(exp.id, 'annee_debut', e.target.value)} style={{ ...selectStyle, width: 'auto' }}>
                      <option value="">Année</option>
                      {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>→</span>
                  {exp.en_cours ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)' }}>Aujourd'hui</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Fin</span>
                      <select value={exp.mois_fin} onChange={e => updateExp(exp.id, 'mois_fin', e.target.value)} style={{ ...selectStyle, width: 'auto' }}>
                        <option value="">Mois</option>
                        {MOIS_LABELS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                      </select>
                      <select value={exp.annee_fin} onChange={e => updateExp(exp.id, 'annee_fin', e.target.value)} style={{ ...selectStyle, width: 'auto' }}>
                        <option value="">Année</option>
                        {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--navy)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={!!exp.en_cours}
                      onChange={e => updateExp(exp.id, 'en_cours', e.target.checked)}
                      style={{ accentColor: 'var(--teal)' }}
                    />
                    En cours
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(profil.experiences || []).map(exp => {
              const duree = dureeExp(exp)
              return (
                <div key={exp.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--teal-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-building" style={{ color: 'var(--teal-mid)', fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                      {exp.poste || '—'}{exp.entreprise ? ` · ${exp.entreprise}` : ''}
                      {duree && <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>({duree} mois)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{formatPeriode(exp)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Compétences hard ── */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-tool" /> Compétences techniques</div>
        </div>
        {editing ? (
          <textarea
            placeholder="Décris tes compétences techniques et missions réalisées…&#10;Ex : Gestion des réseaux sociaux (Instagram, LinkedIn), création de visuels sur Canva, rédaction de newsletters, analyse de KPIs…"
            value={form.competences_hard || ''}
            onChange={e => setField('competences_hard', e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        ) : data.competences_hard ? (
          <div style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.competences_hard}</div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune compétence technique renseignée.</div>
        )}
      </div>

      {/* ── Compétences soft ── */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-mood-smile" /> Soft skills</div>
        </div>
        {editing ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SOFT_SKILLS.map(skill => {
              const selected = (form.competences_soft || []).includes(skill)
              return (
                <button
                  key={skill}
                  onClick={() => toggleSoft(skill)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif',
                    background: selected ? 'var(--teal)' : 'var(--light)',
                    color: selected ? 'white' : 'var(--navy)',
                    fontWeight: selected ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {selected && <i className="ti ti-check" style={{ marginRight: 4, fontSize: 11 }} />}
                  {skill}
                </button>
              )
            })}
          </div>
        ) : (data.competences_soft || []).length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.competences_soft.map(s => (
              <span key={s} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'var(--teal-soft)', color: 'var(--teal-mid)' }}>
                {s}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun soft skill sélectionné.</div>
        )}
      </div>

      {/* ── Langues ── */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-world" /> Langues</div>
          {editing && (
            <button className="btn-sm teal" onClick={addLang}>
              <i className="ti ti-plus" /> Ajouter
            </button>
          )}
        </div>

        {(data.langues || []).length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {editing ? 'Clique sur "+ Ajouter" pour renseigner une langue.' : 'Aucune langue renseignée.'}
          </div>
        ) : editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(form.langues || []).map(lang => (
              <div key={lang.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="Langue (ex: Anglais)"
                  value={lang.langue}
                  onChange={e => updateLang(lang.id, 'langue', e.target.value)}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <select
                  value={lang.niveau}
                  onChange={e => updateLang(lang.id, 'niveau', e.target.value)}
                  style={{ ...selectStyle, flex: 2 }}
                >
                  {NIVEAUX_LANGUE.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={() => removeLang(lang.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, flexShrink: 0 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(profil.langues || []).map(lang => (
              <div key={lang.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 10, background: 'var(--light)', border: '1px solid var(--border)' }}>
                <i className="ti ti-language" style={{ fontSize: 13, color: 'var(--teal-mid)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{lang.langue}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{lang.niveau}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ─── Styles ────────────────────────────────────────────────── */
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

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
}
