'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'
import AvatarPhoto from '../ui/AvatarPhoto'
import { verifier } from '../ui/Toaster'

/* ─── Constantes ─────────────────────────────────────────────── */
const SOFT_SKILLS = [
  'Autonomie', 'Travail en équipe', 'Rigueur', 'Adaptabilité', 'Créativité',
  'Communication', 'Gestion du temps', "Prise d'initiative", "Esprit d'analyse",
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
const MOIS_FULL  = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const currentYear = new Date().getFullYear()
const ANNEES_DISPO = Array.from({ length: 5 }, (_, i) => currentYear + i)
const ANNEES_EXP   = Array.from({ length: currentYear - 1999 + 3 }, (_, i) => 2000 + i)

/* ─── Helpers ────────────────────────────────────────────────── */
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
  const fin = exp.en_cours
    ? "Aujourd'hui"
    : exp.mois_fin && exp.annee_fin
      ? `${MOIS_LABELS[exp.mois_fin - 1]} ${exp.annee_fin}`
      : '?'
  return `${debut} → ${fin}`
}

function formatDispo(d) {
  if (d.dispo_mois && d.dispo_annee) return `Dispo ${MOIS_FULL[d.dispo_mois - 1]} ${d.dispo_annee}`
  return d.disponibilite || null
}

function formatTel(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  return digits.match(/.{1,2}/g).join('.')
}

const CONTRATS_EXP = ['CDI', 'CDD', 'Alternance', 'Intérim', 'Bénévolat', 'Autre']

function newExp()  { return { id: Date.now(), entreprise: '', poste: '', contrat: '', ville: '', mois_debut: '', annee_debut: '', mois_fin: '', annee_fin: '', en_cours: false, missions: [] } }
function newLang() { return { id: Date.now(), langue: '', niveau: 'Intermédiaire' } }

function safeData(data) {
  return {
    ...data,
    passions:              Array.isArray(data.passions)             ? data.passions             : [],
    loisirs:               Array.isArray(data.loisirs)              ? data.loisirs              : [],
    experiences:           Array.isArray(data.experiences)          ? data.experiences          : [],
    competences_soft:      Array.isArray(data.competences_soft)     ? data.competences_soft     : [],
    langues:               Array.isArray(data.langues)              ? data.langues              : [],
    competences_hard:      data.competences_hard      ?? '',
    niveau_etudes:         data.niveau_etudes         ?? '',
    linkedin_url:          data.linkedin_url           ?? '',
    email:                 data.email                  ?? '',
    telephone:             data.telephone              ?? '',
    permis:                data.permis                ?? false,
    dispo_mois:            data.dispo_mois             ?? '',
    dispo_annee:           data.dispo_annee            ?? '',
    profil_en_pause:       data.profil_en_pause        ?? false,
    profil_visible_ecoles: data.profil_visible_ecoles  ?? false,
    masquer_experiences:        data.masquer_experiences        ?? false,
    pas_experience_pro:         data.pas_experience_pro         ?? false,
    alternance_trouvee:         data.alternance_trouvee         ?? false,
    cv_masquer_apropos:         data.cv_masquer_apropos         ?? false,
    cv_masquer_competences_hard: data.cv_masquer_competences_hard ?? false,
    cv_masquer_soft_skills:     data.cv_masquer_soft_skills     ?? false,
    cv_masquer_langues:         data.cv_masquer_langues         ?? false,
    cv_masquer_interets:        data.cv_masquer_interets        ?? false,
  }
}

const CHAMPS_BASE = ['prenom', 'nom', 'ville', 'formation', 'bio']

function completion(profil) {
  const expComplete = profil.masquer_experiences || profil.pas_experience_pro || (profil.experiences?.length || 0) > 0
  const checks = [
    ...CHAMPS_BASE.map(c => !!profil[c]?.trim()),
    !!(profil.dispo_mois && profil.dispo_annee) || !!profil.disponibilite,
    (profil.passions?.length   || 0) > 0,
    (profil.loisirs?.length    || 0) > 0,
    expComplete,
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

/* ─── CityAutocomplete ───────────────────────────────────────── */
function CityAutocomplete({ value, onChange, style }) {
  const [suggestions, setSuggestions] = useState([])

  async function fetchSuggestions(val) {
    if (val.length < 2) { setSuggestions([]); return }
    try {
      const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&type=municipality&limit=6`)
      const json = await res.json()
      setSuggestions((json.features || []).map(f => ({
        label: f.properties.label,
        city:  f.properties.city,
      })))
    } catch { setSuggestions([]) }
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        placeholder="Ville (ex: Paris, Lyon…)"
        value={value}
        onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value) }}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        onKeyDown={e => e.key === 'Escape' && setSuggestions([])}
        style={style || inputStyle}
      />
      {suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => { onChange(s.label); setSuggestions([]) }}
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
  )
}

/* ─── Composant principal ────────────────────────────────────── */
export default function PanelCandidatProfil({ candidatIdOverride, onBack }) {
  const supabase = createClient()

  const [profil, setProfil]       = useState(null)
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [message, setMessage]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [showQR, setShowQR]       = useState(false)

  // Input brut centres d'intérêt (fusion passions + loisirs)
  const [interetsStr, setInteretsStr] = useState('')

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
        setProfil(d); setForm(d)
        setInteretsStr([...(d.passions || []), ...(d.loisirs || [])].join(', '))
      } else {
        const vide = safeData({
          id: uid, prenom: '', nom: '', ville: '', formation: '', disponibilite: '', bio: '',
          passions: [], loisirs: [], experiences: [], competences_hard: '', competences_soft: [],
          niveau_etudes: '', langues: [], linkedin_url: '', permis: false,
          dispo_mois: '', dispo_annee: '', profil_en_pause: false, profil_visible_ecoles: false,
          masquer_experiences: false, pas_experience_pro: false,
        })
        setProfil(vide); setForm(vide)
        setInteretsStr('')
        setEditing(true)
      }
    }
    load()
  }, [candidatIdOverride])

  function startEdit() {
    setInteretsStr([...(form.passions || []), ...(form.loisirs || [])].join(', '))
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true); setMessage('')
    const interets = interetsStr.split(',').map(s => s.trim()).filter(Boolean)
    const payload  = { ...form, passions: interets, loisirs: [], updated_at: new Date().toISOString() }
    let error
    if (candidatIdOverride) {
      ({ error } = await supabase.from('candidats').update(payload).eq('id', candidatIdOverride))
    } else {
      ({ error } = await supabase.from('candidats').upsert(payload))
    }
    if (error) { setMessage('Erreur : ' + error.message) }
    else {
      setProfil({ ...payload }); setForm({ ...payload })
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

  // Sauvegarde immédiate d'un champ booléen (hors mode édition)
  async function saveImmediate(key, val) {
    setField(key, val)
    setProfil(p => ({ ...p, [key]: val }))
    const { error } = await supabase.from('candidats').update({ [key]: val }).eq('id', profil.id)
    if (!verifier(error, 'Le réglage n\'a pas été enregistré.')) {
      // Échec : on remet l'interface dans l'état réel
      setField(key, !val)
      setProfil(p => ({ ...p, [key]: !val }))
    }
  }

  // Expériences
  function addExp()             { setField('experiences', [...(form.experiences || []), newExp()]) }
  function removeExp(id)        { setField('experiences', (form.experiences || []).filter(e => e.id !== id)) }
  function updateExp(id, k, v)  { setField('experiences', (form.experiences || []).map(e => e.id === id ? { ...e, [k]: v } : e)) }

  // Langues
  function addLang()            { setField('langues', [...(form.langues || []), newLang()]) }
  function removeLang(id)       { setField('langues', (form.langues || []).filter(l => l.id !== id)) }
  function updateLang(id, k, v) { setField('langues', (form.langues || []).map(l => l.id === id ? { ...l, [k]: v } : l)) }

  // Soft skills
  function toggleSoft(skill) {
    const current = form.competences_soft || []
    setField('competences_soft', current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill])
  }

  // Mode expériences : null | 'masquer' | 'sans'
  function setExpMode(mode) {
    setField('masquer_experiences', mode === 'masquer')
    setField('pas_experience_pro',  mode === 'sans')
  }

  if (!profil) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  const data    = editing ? form : profil
  const pct     = completion(data)
  const dispUrl = data.photo_url || null
  const dispo   = formatDispo(data)

  /* ── Expériences : quel mode affiché ? ── */
  const expMode = data.masquer_experiences ? 'masquer' : data.pas_experience_pro ? 'sans' : null

  /* ── QR Code modal ── */
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/candidat/${profil.id}` : ''
  const qrSrc     = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}&bgcolor=ffffff&color=0E1B2E&margin=4`

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
          {!candidatIdOverride && (
            <button className="btn-sm" onClick={() => setShowQR(true)}>
              <i className="ti ti-qrcode" /> QR Code
            </button>
          )}
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

      {/* ── Bannière pause ── */}
      {data.profil_en_pause && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-player-pause-filled" style={{ fontSize: 18, color: '#ea580c' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412' }}>Profil en pause</div>
              <div style={{ fontSize: 12, color: '#c2410c' }}>Tu n'apparais dans aucune recherche entreprise ou école.</div>
            </div>
          </div>
          <button className="btn-sm" onClick={() => saveImmediate('profil_en_pause', false)} style={{ whiteSpace: 'nowrap' }}>
            <i className="ti ti-player-play" /> Réactiver
          </button>
        </div>
      )}

      {/* ── Carte identité + Complétion ── */}
      <div className="grid2" style={{ marginBottom: '1.25rem', alignItems: 'stretch' }}>
      <div className="s-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: 0 }}>
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
              <CityAutocomplete value={form.ville || ''} onChange={v => setField('ville', v)} />
              <input placeholder="Formation visée (ex: Bachelor Marketing)" value={form.formation || ''} onChange={e => setField('formation', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            {/* Disponibilité : sélecteur mois + année */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Disponible en</span>
              <select value={form.dispo_mois || ''} onChange={e => setField('dispo_mois', e.target.value ? Number(e.target.value) : '')} style={{ ...selectStyle, flex: 1 }}>
                <option value="">— Mois —</option>
                {MOIS_FULL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={form.dispo_annee || ''} onChange={e => setField('dispo_annee', e.target.value ? Number(e.target.value) : '')} style={{ ...selectStyle, flex: 1 }}>
                <option value="">— Année —</option>
                {ANNEES_DISPO.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <textarea placeholder="Bio — présente-toi en quelques phrases" value={form.bio || ''} onChange={e => setField('bio', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>
              {profil.prenom || profil.nom ? `${profil.prenom} ${profil.nom}`.trim() : 'Profil incomplet'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {profil.ville && <span className="pill teal"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {profil.ville}</span>}
              {profil.formation && <span className="pill purple">{profil.formation}</span>}
              {dispo && <span className="pill accent">{dispo}</span>}
            </div>
            {profil.bio && <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{profil.bio}</div>}
            <div style={{ background: 'var(--light)', borderRadius: 100, height: 5, marginTop: 10 }}>
              <div style={{ width: `${pct}%`, height: 5, borderRadius: 100, background: 'var(--teal)', transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      <div className="s-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-chart-bar" /> Complétion du profil</div>
        </div>
        <div style={{ fontSize: 36, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'var(--teal)' }}>{pct}%</div>
        <div style={{ background: 'var(--light)', borderRadius: 100, height: 8, marginTop: 8 }}>
          <div style={{ width: `${pct}%`, height: 8, borderRadius: 100, background: 'var(--teal)', transition: 'width 0.4s' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{pct < 100 ? 'Complète ton profil pour plus de visibilité' : '🎉 Profil complet !'}</div>
      </div>
      </div>

      {/* ── Visibilité + Pause ── */}
      <div className="s-card">
        <div className="s-card-header" style={{ marginBottom: 12 }}>
          <div className="s-card-title"><i className="ti ti-eye" /> Visibilité</div>
          <button
            onClick={() => saveImmediate('profil_en_pause', !data.profil_en_pause)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif',
              background: data.profil_en_pause ? '#fff7ed' : 'var(--light)',
              color: data.profil_en_pause ? '#ea580c' : 'var(--muted)',
            }}
          >
            <i className={`ti ${data.profil_en_pause ? 'ti-player-play' : 'ti-player-pause'}`} />
            {data.profil_en_pause ? 'Réactiver mon profil' : 'Mettre en pause'}
          </button>
        </div>

        <div style={{ opacity: data.profil_en_pause ? 0.4 : 1, pointerEvents: data.profil_en_pause ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Entreprises */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
                <i className="ti ti-building" style={{ marginRight: 6 }} />Visible par les entreprises
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {data.profil_public ? 'Les entreprises peuvent te trouver' : 'Masqué aux entreprises'}
              </div>
            </div>
            <button
              className={`toggle ${data.profil_public ? 'on' : ''}`}
              onClick={() => saveImmediate('profil_public', !data.profil_public)}
            />
          </div>
          {/* Écoles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '0.5px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
                <i className="ti ti-school" style={{ marginRight: 6 }} />Visible par les écoles partenaires
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {data.profil_visible_ecoles ? 'Les écoles partenaires peuvent consulter ton profil' : 'Masqué aux écoles'}
              </div>
            </div>
            <button
              className={`toggle ${data.profil_visible_ecoles ? 'on' : ''}`}
              onClick={() => saveImmediate('profil_visible_ecoles', !data.profil_visible_ecoles)}
            />
          </div>
        </div>
      </div>

      {/* ── Personnaliser mon CV ── */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-file-cv" /> Personnaliser mon CV</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Toggle expériences — logique inversée : masquer_experiences=true → caché */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-briefcase" />
              Expériences professionnelles
              <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)' }}>
                {data.masquer_experiences ? '— masqué dans le CV' : '— affiché dans le CV'}
              </span>
            </div>
            <button
              className={`toggle ${!data.masquer_experiences ? 'on' : ''}`}
              onClick={() => saveImmediate('masquer_experiences', !data.masquer_experiences)}
            />
          </div>
          {[
            { key: 'cv_masquer_apropos',          icon: 'ti-user',       label: 'À propos' },
            { key: 'cv_masquer_competences_hard',  icon: 'ti-tool',       label: 'Compétences techniques' },
            { key: 'cv_masquer_soft_skills',       icon: 'ti-stars',      label: 'Soft skills' },
            { key: 'cv_masquer_langues',           icon: 'ti-language',   label: 'Langues' },
            { key: 'cv_masquer_interets',          icon: 'ti-heart',      label: "Centres d'intérêt" },
          ].map(({ key, icon, label }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${icon}`} />
                {label}
                <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)' }}>
                  {data[key] ? '— masqué dans le CV' : '— affiché dans le CV'}
                </span>
              </div>
              <button
                className={`toggle ${!data[key] ? 'on' : ''}`}
                onClick={() => saveImmediate(key, !data[key])}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Infos pratiques ── */}
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
          {/* Email */}
          <div style={{ flex: '2 1 220px' }}>
            <div style={labelStyle}><i className="ti ti-mail" style={{ marginRight: 4 }} />Email</div>
            {editing ? (
              <input type="email" placeholder="ton@email.com" value={form.email || ''} onChange={e => setField('email', e.target.value)} style={inputStyle} />
            ) : data.email ? (
              <a href={`mailto:${data.email}`} style={{ fontSize: 13, color: 'var(--teal)', marginTop: 4, display: 'block' }}>{data.email}</a>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Non renseigné</div>
            )}
          </div>
          {/* Téléphone */}
          <div style={{ flex: '1 1 160px' }}>
            <div style={labelStyle}><i className="ti ti-phone" style={{ marginRight: 4 }} />Téléphone</div>
            {editing ? (
              <input type="tel" placeholder="06.00.00.00.00" value={form.telephone || ''} onChange={e => setField('telephone', formatTel(e.target.value))} style={inputStyle} />
            ) : data.telephone ? (
              <a href={`tel:${(data.telephone).replace(/\./g, '')}`} style={{ fontSize: 13, color: 'var(--teal)', marginTop: 4, display: 'block' }}>{formatTel(data.telephone)}</a>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Non renseigné</div>
            )}
          </div>
          {/* LinkedIn */}
          <div style={{ flex: '2 1 240px' }}>
            <div style={labelStyle}><i className="ti ti-brand-linkedin" style={{ marginRight: 4 }} />LinkedIn</div>
            {editing ? (
              <input placeholder="https://linkedin.com/in/votre-profil" value={form.linkedin_url || ''} onChange={e => setField('linkedin_url', e.target.value)} style={inputStyle} />
            ) : data.linkedin_url ? (
              <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--teal)', marginTop: 4, display: 'block', wordBreak: 'break-all' }}>{data.linkedin_url}</a>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Non renseigné</div>
            )}
          </div>
          {/* Permis */}
          <div style={{ flex: '0 0 auto' }}>
            <div style={labelStyle}><i className="ti ti-car" style={{ marginRight: 4 }} />Permis de conduire</div>
            {editing ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => setField('permis', v)} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: form.permis === v ? 'var(--teal)' : 'var(--light)', color: form.permis === v ? 'white' : 'var(--muted)' }}>
                    {v ? 'Oui' : 'Non'}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: data.permis ? '#dcfce7' : 'var(--light)', color: data.permis ? '#166534' : 'var(--muted)' }}>
                  {data.permis ? 'Oui' : 'Non'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Expériences professionnelles ── */}
      {expMode !== 'masquer' && (
        <div className="s-card">
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-briefcase" /> Expériences professionnelles</div>
            {editing && expMode === null && (
              <button className="btn-sm teal" onClick={addExp}><i className="ti ti-plus" /> Ajouter</button>
            )}
          </div>

          {/* Boutons de mode */}
          <div style={{ display: 'flex', gap: 8, marginBottom: expMode === null && (data.experiences || []).length === 0 ? 12 : 0, flexWrap: 'wrap' }}>
            {/* Bouton "pas d'expérience" */}
            <button
              onClick={() => setExpMode(expMode === 'sans' ? null : 'sans')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif',
                background: expMode === 'sans' ? '#dcfce7' : 'var(--light)',
                color: expMode === 'sans' ? '#166534' : 'var(--muted)',
              }}
            >
              <i className={`ti ${expMode === 'sans' ? 'ti-check' : 'ti-user-off'}`} />
              Je n'ai pas d'expérience pro
            </button>

          </div>

          {/* Contenu selon le mode */}
          {expMode === 'sans' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', marginTop: 8 }}>
              <i className="ti ti-check-circle" style={{ color: '#16a34a', fontSize: 18 }} />
              <div style={{ fontSize: 13, color: '#166534' }}>Aucune expérience professionnelle — profil considéré comme complet sur ce point.</div>
            </div>
          ) : (data.experiences || []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: expMode === null ? 0 : 8 }}>
              {editing ? 'Clique sur "+ Ajouter" pour saisir une expérience.' : 'Aucune expérience renseignée.'}
            </div>
          ) : editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              {(form.experiences || []).map((exp, idx) => (
                <div key={exp.id} style={{ padding: 12, borderRadius: 10, background: 'var(--light)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Expérience {idx + 1}</div>
                    <button onClick={() => removeExp(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14 }}><i className="ti ti-trash" /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder="Entreprise"   value={exp.entreprise} onChange={e => updateExp(exp.id, 'entreprise', e.target.value)} style={inputStyle} />
                    <input placeholder="Poste occupé" value={exp.poste}      onChange={e => updateExp(exp.id, 'poste',      e.target.value)} style={inputStyle} />
                    <select value={exp.contrat || ''} onChange={e => updateExp(exp.id, 'contrat', e.target.value)} style={{ ...selectStyle, width: 'auto', flexShrink: 0 }}>
                      <option value="">Contrat</option>
                      {CONTRATS_EXP.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <input placeholder="Ville" value={exp.ville || ''} onChange={e => updateExp(exp.id, 'ville', e.target.value)} style={{ ...inputStyle, maxWidth: 200 }} />
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
                        {ANNEES_EXP.map(a => <option key={a} value={a}>{a}</option>)}
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
                          {ANNEES_EXP.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--navy)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={!!exp.en_cours} onChange={e => updateExp(exp.id, 'en_cours', e.target.checked)} style={{ accentColor: 'var(--teal)' }} />
                      En cours
                    </label>
                  </div>
                  {/* Missions */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Missions</div>
                    {(exp.missions || []).map((m, mi) => (
                      <div key={mi} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ color: 'var(--teal)', fontSize: 14, flexShrink: 0 }}>•</span>
                        <input
                          value={m}
                          onChange={e => {
                            const updated = [...(exp.missions || [])]
                            updated[mi] = e.target.value
                            updateExp(exp.id, 'missions', updated)
                          }}
                          placeholder="Ex : Gestion des réseaux sociaux"
                          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                        />
                        <button onClick={() => {
                          const updated = (exp.missions || []).filter((_, i) => i !== mi)
                          updateExp(exp.id, 'missions', updated)
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, flexShrink: 0 }}>
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateExp(exp.id, 'missions', [...(exp.missions || []), ''])}
                      style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--teal)', cursor: 'pointer', marginTop: 2 }}
                    >
                      <i className="ti ti-plus" style={{ marginRight: 4 }} />Ajouter une mission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
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
                        {exp.contrat && <span style={{ fontWeight: 500, fontSize: 11, color: 'var(--teal)', marginLeft: 6, background: 'var(--teal-soft)', padding: '1px 6px', borderRadius: 4 }}>{exp.contrat}</span>}
                        {duree && <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>({duree} mois)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {formatPeriode(exp)}{exp.ville ? ` · ${exp.ville}` : ''}
                      </div>
                      {(exp.missions || []).filter(Boolean).length > 0 && (
                        <ul style={{ margin: '6px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {exp.missions.filter(Boolean).map((m, i) => (
                            <li key={i} style={{ fontSize: 12, color: 'var(--navy)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--teal)', flexShrink: 0 }}>•</span>{m}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Lien pour réafficher la section masquée */}
      {expMode === 'masquer' && editing && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button onClick={() => setExpMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', textDecoration: 'underline' }}>
            Réafficher la section expériences
          </button>
        </div>
      )}

      {/* ── Modale QR Code ── */}
      {showQR && (
        <div
          onClick={() => setShowQR(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(14,27,46,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 8px 40px rgba(14,27,46,0.18)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                <i className="ti ti-qrcode" style={{ marginRight: 7, color: 'var(--teal)' }} />
                Mon QR Code
              </div>
              <button onClick={() => setShowQR(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {!profil.profil_public && (
              <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '10px 14px', width: '100%', fontSize: 12, color: '#9a3412', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
                Ton profil est actuellement masqué aux entreprises. Active la visibilité pour que le lien soit accessible.
              </div>
            )}

            <img src={qrSrc} alt="QR Code profil" style={{ width: 180, height: 180, borderRadius: 10, border: '1.5px solid var(--border)' }} />

            <div style={{ width: '100%', background: 'var(--light)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace' }}>
              {publicUrl}
            </div>

            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); setMessage('Lien copié !'); setShowQR(false); setTimeout(() => setMessage(''), 3000) }}
                className="btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <i className="ti ti-copy" /> Copier le lien
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sm teal"
                style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <i className="ti ti-external-link" /> Voir la page
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Compétences techniques / Soft skills / Centres d'intérêt / Langues ── */}
      {!data.masquer_experiences && (<div className="grid2" style={{ marginBottom: '1.25rem' }}>
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-tool" /> Compétences techniques</div>
          </div>
          {editing ? (
            <textarea
              placeholder={"Décris tes compétences techniques et missions réalisées…\nEx : Gestion des réseaux sociaux (Instagram, LinkedIn), création de visuels sur Canva, rédaction de newsletters, analyse de KPIs…"}
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

        {/* ── Soft skills ── */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-mood-smile" /> Soft skills</div>
          </div>
          {editing ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {SOFT_SKILLS.map(skill => {
                const selected = (form.competences_soft || []).includes(skill)
                return (
                  <button key={skill} onClick={() => toggleSoft(skill)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif', background: selected ? 'var(--teal)' : 'var(--light)', color: selected ? 'white' : 'var(--navy)', fontWeight: selected ? 600 : 400, transition: 'all 0.15s' }}>
                    {selected && <i className="ti ti-check" style={{ marginRight: 4, fontSize: 11 }} />}
                    {skill}
                  </button>
                )
              })}
            </div>
          ) : (data.competences_soft || []).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.competences_soft.map(s => (
                <span key={s} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'var(--teal-soft)', color: 'var(--teal-mid)' }}>{s}</span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun soft skill sélectionné.</div>
          )}
        </div>

        {/* ── Centres d'intérêt ── */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-heart" /> Centres d'intérêt</div>
          </div>
          {editing ? (
            <>
              <input placeholder="Musique, Running, Social media, Photo…" value={interetsStr} onChange={e => setInteretsStr(e.target.value)} style={inputStyle} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Sépare les mots-clés par des virgules</div>
            </>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {[...(profil.passions || []), ...(profil.loisirs || [])].length
                ? [...(profil.passions || []), ...(profil.loisirs || [])].map(t => <span key={t} className="tag hi">{t}</span>)
                : <span style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun centre d'intérêt renseigné</span>}
            </div>
          )}
        </div>

        {/* ── Langues ── */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-world" /> Langues</div>
            {editing && <button className="btn-sm teal" onClick={addLang}><i className="ti ti-plus" /> Ajouter</button>}
          </div>
          {(data.langues || []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{editing ? 'Clique sur "+ Ajouter" pour renseigner une langue.' : 'Aucune langue renseignée.'}</div>
          ) : editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(form.langues || []).map(lang => (
                <div key={lang.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input placeholder="Langue (ex: Anglais)" value={lang.langue} onChange={e => updateLang(lang.id, 'langue', e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                  <select value={lang.niveau} onChange={e => updateLang(lang.id, 'niveau', e.target.value)} style={{ ...selectStyle, flex: 2 }}>
                    {NIVEAUX_LANGUE.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button onClick={() => removeLang(lang.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, flexShrink: 0 }}><i className="ti ti-trash" /></button>
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
      </div>)}

      {/* ── Alternance trouvée ── */}
      <div
        className="s-card"
        style={{ background: data.alternance_trouvee ? '#fdf4ff' : 'white', border: data.alternance_trouvee ? '1.5px solid #d8b4fe' : '1px solid var(--border)', transition: 'all 0.2s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: data.alternance_trouvee ? '#7e22ce' : 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-confetti" style={{ fontSize: 15 }} />
              J'ai trouvé mon alternance !
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {data.alternance_trouvee ? '🎉 Félicitations — badge débloqué !' : 'Coche cette case quand tu as trouvé ton alternance'}
            </div>
          </div>
          <button
            className={`toggle ${data.alternance_trouvee ? 'on' : ''}`}
            onClick={() => saveImmediate('alternance_trouvee', !data.alternance_trouvee)}
          />
        </div>
      </div>
    </>
  )
}

/* ─── Styles ─────────────────────────────────────────────────── */
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
