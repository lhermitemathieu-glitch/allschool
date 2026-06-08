'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'
import { SECTEURS } from '../../lib/secteurs'
import { NIVEAUX, niveauLabel } from '../../lib/niveaux'

function AvatarPhoto({ url, initials, size = 64, bg = '#fff3e0', color = 'var(--accent)', onUpload, uploading }) {
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
        <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: size * 0.3, fontWeight: 800, color }}>
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

// ── SIRET ─────────────────────────────────────────────────────────────────────
// Composant champ lecture/édition
function FieldRow({ label, editing, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      {editing
        ? children
        : <div style={{ fontSize: 14, color: 'var(--navy)' }}>{children || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
      }
    </div>
  )
}

// Composant adresse avec autocomplete api-adresse.data.gouv.fr
function AdresseField({ editing, adresse, codePostal, ville, onChange }) {
  const [suggestions, setSuggestions] = useState([])

  async function fetchSuggestions(val) {
    if (val.length < 3) { setSuggestions([]); return }
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=6`)
    const json = await res.json()
    setSuggestions(json?.features || [])
  }

  function selectSuggestion(feat) {
    const p = feat.properties
    onChange({
      adresse:     p.name,
      code_postal: p.postcode,
      ville:       p.city,
    })
    setSuggestions([])
  }

  if (!editing) {
    const parts = [adresse, codePostal && ville ? `${codePostal} ${ville}` : (ville || codePostal)].filter(Boolean)
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adresse</div>
        <div style={{ fontSize: 14, color: 'var(--navy)' }}>
          {parts.length > 0 ? parts.map((p, i) => <div key={i}>{p}</div>) : <span style={{ color: 'var(--muted)' }}>—</span>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adresse</div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          value={adresse || ''}
          onChange={e => { onChange({ adresse: e.target.value }); fetchSuggestions(e.target.value) }}
          placeholder="Commencez à taper votre adresse…"
          style={inputStyle}
        />
        {suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginTop: 2 }}>
            {suggestions.map(feat => (
              <div
                key={feat.properties.id}
                onMouseDown={() => selectSuggestion(feat)}
                style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--navy)', borderBottom: '0.5px solid var(--border)' }}
              >
                <div style={{ fontWeight: 500 }}>{feat.properties.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{feat.properties.postcode} {feat.properties.city}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={codePostal || ''}
          onChange={e => onChange({ code_postal: e.target.value })}
          placeholder="Code postal"
          style={{ ...inputStyle, flex: '0 0 120px' }}
        />
        <input
          value={ville || ''}
          onChange={e => onChange({ ville: e.target.value })}
          placeholder="Ville"
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
    </div>
  )
}

export function PanelEntrepriseSiret({ entrepriseIdOverride, onBack }) {
  const supabase = createClient()
  const [siret, setSiret]       = useState('')
  const [fiche, setFiche]       = useState(null)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      let data
      if (entrepriseIdOverride) {
        const res = await supabase.from('entreprises').select('*').eq('id', entrepriseIdOverride).single()
        data = res.data
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const res = await supabase.from('entreprises').select('*').eq('user_id', user.id).maybeSingle()
        data = res.data
      }
      if (data) { setFiche(data); setForm(data) }
      setLoading(false)
    }
    load()
  }, [entrepriseIdOverride])

  async function handleSave() {
    setSaving(true)
    setMsg('')
    let data, error
    if (entrepriseIdOverride) {
      const res = await supabase.from('entreprises').update({ ...form, updated_at: new Date().toISOString() }).eq('id', entrepriseIdOverride).select().single()
      data = res.data; error = res.error
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
      const res = await supabase.from('entreprises').upsert(payload).select().single()
      data = res.data; error = res.error
    }
    if (error) { setMsg('Erreur : ' + error.message) }
    else { setFiche(data); setForm(data); setEditing(false); setMsg('Entreprise enregistrée !'); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  async function handlePhotoUpload(file) {
    if (!fiche?.id) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `entreprises/${fiche.id}/photo.${ext}`
    const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true })
    if (error) { setMsg('Erreur photo : ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path)
    await supabase.from('entreprises').update({ photo_url: publicUrl }).eq('id', fiche.id)
    setFiche(p => ({ ...p, photo_url: publicUrl }))
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
  }

  function initials(str) {
    return (str || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  // Formulaire d'onboarding si pas encore de fiche (mode normal uniquement)
  if (!fiche && !editing && !entrepriseIdOverride) {
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
  const displayUrl = (editing ? form.photo_url : fiche?.photo_url) || null
  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && <button className="btn-sm" onClick={onBack}><i className="ti ti-arrow-left" /> Retour</button>}
          <div>
            <div className="page-title">{entrepriseIdOverride ? 'Fiche entreprise (admin)' : 'Mon entreprise'}</div>
            <div className="page-sub">{f?.raison_sociale || f?.siret || 'Fiche entreprise'}</div>
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

      <div className="s-card">
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
          <AvatarPhoto
            url={displayUrl}
            initials={initials(f?.raison_sociale)}
            size={64}
            onUpload={fiche ? handlePhotoUpload : undefined}
            uploading={uploading}
          />
          <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--navy)', alignSelf: 'center' }}>
            {f?.raison_sociale || <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>Raison sociale non renseignée</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* SIRET */}
          <FieldRow label="SIRET" editing={editing}>
            {editing
              ? <input value={form.siret || ''} onChange={e => setForm(p => ({ ...p, siret: e.target.value }))} placeholder="381 658 820 00038" style={inputStyle} />
              : f?.siret}
          </FieldRow>

          {/* Raison sociale */}
          <FieldRow label="Raison sociale" editing={editing}>
            {editing
              ? <input value={form.raison_sociale || ''} onChange={e => setForm(p => ({ ...p, raison_sociale: e.target.value }))} placeholder="Ex : Boulangerie Leroux" style={inputStyle} />
              : f?.raison_sociale}
          </FieldRow>

          {/* Secteur — liste prédéfinie */}
          <FieldRow label="Secteur d'activité" editing={editing}>
            {editing
              ? (
                <select value={form.secteur || ''} onChange={e => setForm(p => ({ ...p, secteur: e.target.value }))} style={inputStyle}>
                  <option value="">— Sélectionner —</option>
                  {SECTEURS_ENT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )
              : f?.secteur}
          </FieldRow>

          {/* Adresse avec autocomplete */}
          <AdresseField
            editing={editing}
            adresse={editing ? form.adresse : f?.adresse}
            codePostal={editing ? form.code_postal : f?.code_postal}
            ville={editing ? form.ville : f?.ville}
            onChange={(patch) => setForm(p => ({ ...p, ...patch }))}
          />

          {/* Taille */}
          <FieldRow label="Taille" editing={editing}>
            {editing
              ? (
                <select value={form.taille || ''} onChange={e => setForm(p => ({ ...p, taille: e.target.value }))} style={inputStyle}>
                  <option value="">— Sélectionner —</option>
                  <option value="tpe">TPE (moins de 11 salariés)</option>
                  <option value="pme">PME (11 à 249 salariés)</option>
                  <option value="ge">Grande entreprise (250+)</option>
                </select>
              )
              : ({ tpe: 'TPE (moins de 11 salariés)', pme: 'PME (11 à 249 salariés)', ge: 'Grande entreprise (250+)' }[f?.taille])}
          </FieldRow>

        </div>
      </div>
    </>
  )
}

// ── RECHERCHE ─────────────────────────────────────────────────────────────────
export function PanelEntrepriseRecherche({ onNavigate }) {
  const supabase = createClient()
  const [profils, setProfils]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [filters, setFilters]   = useState({ formation: '', ville: '', disponibilite: '' })
  const [toggles, setToggles]   = useState({ teletravail: false, rqth: false, dispo: false })

  const load = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    let q = supabase.from('candidats').select('id, prenom, nom, ville, formation, disponibilite, passions')
    if (filters.formation)     q = q.ilike('formation', `%${filters.formation}%`)
    if (filters.ville)         q = q.ilike('ville', `%${filters.ville}%`)
    if (filters.disponibilite) q = q.ilike('disponibilite', `%${filters.disponibilite}%`)
    const { data } = await q.limit(20)
    setProfils(data || [])
    setLoading(false)
  }, [filters])

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
          <div className="page-sub">{loading ? 'Chargement…' : searched ? `${profils.length} profil${profils.length !== 1 ? 's' : ''} trouvé${profils.length !== 1 ? 's' : ''}` : 'Lancez une recherche pour voir les profils'}</div>
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

      {!searched ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          <i className="ti ti-search" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
          Utilisez les filtres ci-dessus et cliquez sur <strong>Filtrer</strong> pour voir les candidats disponibles.
        </div>
      ) : loading ? (
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
const SECTEURS_ENT = SECTEURS

async function geocodeVilleEnt(nom) {
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(nom)}&type=municipality&limit=1`)
  const json = await res.json()
  const feat = json?.features?.[0]
  if (!feat) return null
  const [lng, lat] = feat.geometry.coordinates
  return { lat, lng }
}

export function PanelEntrepriseEcoles({ onNavigateEcole }) {
  const supabase = createClient()

  const [ecoles,      setEcoles]      = useState([])
  const [loading,     setLoading]     = useState(false)
  const [searched,    setSearched]    = useState(false)
  const [total,       setTotal]       = useState(null)
  const [ville,       setVille]       = useState('')
  const [rayon,       setRayon]       = useState('20')
  const [secteur,     setSecteur]     = useState('')
  const [modalite,    setModalite]    = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [geoErr,      setGeoErr]      = useState('')
  const [geoLoading,  setGeoLoading]  = useState(false)

  useEffect(() => {
    supabase.from('ecoles').select('id', { count: 'exact', head: true }).then(({ count }) => setTotal(count))
  }, [])

  async function fetchSuggestions(val) {
    if (val.length < 2) { setSuggestions([]); return }
    const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&type=municipality&limit=6`)
    const json = await res.json()
    setSuggestions(json?.features?.map(f => f.properties.label) || [])
  }

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    setGeoErr('')
    setSuggestions([])

    let geoIds = null

    if (ville.trim() && rayon) {
      setGeoLoading(true)
      const coords = await geocodeVilleEnt(ville.trim())
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
    }

    let q = supabase
      .from('ecoles')
      .select('id, nom, ville, type_ecole, secteurs, modalites, email, telephone, site_web')
      .order('nom')
      .limit(100)

    if (geoIds)   q = q.in('id', geoIds)
    if (secteur)  q = q.contains('secteurs', [secteur])
    if (modalite) q = q.contains('modalites', [modalite])

    const { data } = await q
    setEcoles(data || [])
    setLoading(false)
  }, [ville, rayon, secteur, modalite])

  function sigleEcole(nom) {
    return (nom || '').split(' ').filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles près de moi</div>
          <div className="page-sub">
            {searched
              ? loading ? 'Recherche…' : `${ecoles.length} école${ecoles.length !== 1 ? 's' : ''} trouvée${ecoles.length !== 1 ? 's' : ''}`
              : total !== null ? `${total} écoles disponibles — lancez une recherche` : 'Chargement…'}
          </div>
        </div>
      </div>

      <div className="fbar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Ville */}
          <div style={{ position: 'relative', flex: '2 1 140px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ville</div>
            <input
              type="text" value={ville} placeholder="Lyon, Paris…"
              onChange={e => { setVille(e.target.value); fetchSuggestions(e.target.value) }}
              onKeyDown={e => e.key === 'Enter' && search()}
              style={{ width: '100%' }}
            />
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                {suggestions.map(s => (
                  <div key={s} style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--navy)' }}
                    onMouseDown={() => { setVille(s); setSuggestions([]) }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Rayon */}
          <div style={{ flex: '0 0 80px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rayon km</div>
            <input type="number" value={rayon} min="1" max="200" onChange={e => setRayon(e.target.value)} style={{ width: '100%' }} />
          </div>
          {/* Secteur */}
          <div style={{ flex: '2 1 160px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secteur</div>
            <select value={secteur} onChange={e => setSecteur(e.target.value)} style={{ width: '100%' }}>
              <option value="">Tous secteurs</option>
              {SECTEURS_ENT.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Modalité */}
          <div style={{ flex: '1 1 130px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modalité</div>
            <select value={modalite} onChange={e => setModalite(e.target.value)} style={{ width: '100%' }}>
              <option value="">Toutes</option>
              <option value="présentiel">Présentiel</option>
              <option value="distanciel">Distanciel</option>
              <option value="hybride">Hybride</option>
            </select>
          </div>
          <button className="btn-sm accent" onClick={search} style={{ flexShrink: 0 }}>
            {geoLoading ? <><i className="ti ti-loader" /> …</> : <><i className="ti ti-search" /> Rechercher</>}
          </button>
        </div>
        {geoErr && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{geoErr}</div>}
      </div>

      {!searched ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <i className="ti ti-school" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
          Entrez une ville et cliquez sur <strong>Rechercher</strong> pour trouver des écoles.
        </div>
      ) : loading ? (
        <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Recherche en cours…</div>
      ) : ecoles.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Aucune école trouvée. Essayez d'élargir le rayon ou de changer les filtres.</div>
      ) : (
        <div className="grid2">
          {ecoles.map((e) => (
            <div key={e.id} className="s-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--light)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 800, color: 'var(--navy)', flexShrink: 0 }}>
                  {sigleEcole(e.nom)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{e.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.ville}{e.type_ecole ? ` · ${e.type_ecole}` : ''}</div>
                </div>
              </div>
              {/* Modalités */}
              {(e.modalites || []).length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  {e.modalites.map(m => (
                    <span key={m} className="pill teal" style={{ fontSize: 10 }}>{m}</span>
                  ))}
                </div>
              )}
              {/* Secteurs */}
              {(e.secteurs || []).length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {e.secteurs.slice(0, 3).map(s => (
                    <span key={s} className="tag" style={{ fontSize: 10 }}>{s}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 5 }}>
                <button className="btn-sm" onClick={() => onNavigateEcole?.(e.id)}><i className="ti ti-eye" /> Voir</button>
                {e.email && (
                  <a href={`mailto:${e.email}`} className="btn-sm accent" style={{ textDecoration: 'none', fontSize: 11 }}>
                    <i className="ti ti-send" /> Contacter
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── CONSTANTES OFFRES ────────────────────────────────────────────────────────
const SOFT_SKILLS_OFFRE = [
  'Autonomie', 'Travail en équipe', 'Rigueur', 'Adaptabilité', 'Créativité',
  'Communication', 'Gestion du temps', "Prise d'initiative", "Esprit d'analyse",
  'Curiosité intellectuelle', 'Leadership', 'Empathie', 'Gestion du stress',
  'Persévérance', 'Sens des responsabilités', 'Organisation', 'Esprit de synthèse',
  'Force de proposition', 'Écoute active', 'Résilience',
]

const TYPE_OFFRE_CONFIG = {
  poste:            { label: 'Poste disponible',         icon: 'ti-briefcase',      bg: '#e0f2fe', color: '#0369a1' },
  ecole_entreprise: { label: 'École + Entreprise',       icon: 'ti-building-school', bg: '#ede9fe', color: '#5b21b6' },
  campagne:         { label: 'Campagne de recrutement',  icon: 'ti-speakerphone',   bg: '#fff7ed', color: '#c2410c' },
}

// ── CityAutocomplete pour les offres ─────────────────────────────────────────
function CityAutocompleteOffre({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([])

  async function fetchSuggestions(val) {
    if (val.length < 2) { setSuggestions([]); return }
    try {
      const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&type=municipality&limit=6`)
      const json = await res.json()
      setSuggestions((json.features || []).map(f => f.properties.label))
    } catch { setSuggestions([]) }
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        placeholder="Ville ou France entière"
        value={value}
        onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value) }}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        style={{ ...inputStyle, width: '100%' }}
      />
      {suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div
            onMouseDown={() => { onChange('France entière'); setSuggestions([]) }}
            style={{ padding: '8px 14px', fontSize: 13, color: 'var(--teal)', cursor: 'pointer', fontWeight: 600, borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-map" style={{ fontSize: 12 }} /> France entière
          </div>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => { onChange(s); setSuggestions([]) }}
              style={{ padding: '8px 14px', fontSize: 13, color: 'var(--navy)', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '0.5px solid var(--border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f7f5f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <i className="ti ti-map-pin" style={{ fontSize: 11, color: 'var(--muted)', marginRight: 6 }} />{s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── OffreForm : formulaire partagé création + édition ────────────────────────
function OffreForm({ form, setForm, onSubmit, onCancel, saving, submitLabel }) {
  const erreurs = []
  if (!form.type_offre)        erreurs.push('type_offre')
  if (!form.titre?.trim())     erreurs.push('titre')
  if (!form.missions?.trim())  erreurs.push('missions')
  if (!form.ville?.trim())     erreurs.push('ville')
  const canSubmit = erreurs.length === 0

  function toggleSoft(s) {
    setForm(f => ({
      ...f,
      soft_skills: (f.soft_skills || []).includes(s)
        ? f.soft_skills.filter(x => x !== s)
        : [...(f.soft_skills || []), s],
    }))
  }

  function toggleContrat(type) {
    setForm(f => ({
      ...f,
      type_contrat: (f.type_contrat || []).includes(type)
        ? f.type_contrat.filter(t => t !== type)
        : [...(f.type_contrat || []), type],
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Type d'offre (obligatoire) ── */}
      <div>
        <div style={labelStyle}>Type d'offre <span style={{ color: 'var(--accent)' }}>*</span></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_OFFRE_CONFIG).map(([key, cfg]) => {
            const selected = form.type_offre === key
            return (
              <button
                key={key}
                onClick={() => setForm(f => ({ ...f, type_offre: key }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid ' + (selected ? cfg.color : 'var(--border)'),
                  background: selected ? cfg.bg : 'white',
                  color: selected ? cfg.color : 'var(--muted)',
                  transition: 'all 0.15s',
                }}
              >
                <i className={`ti ${cfg.icon}`} style={{ fontSize: 14 }} />
                {cfg.label}
                {selected && <i className="ti ti-check" style={{ fontSize: 11, marginLeft: 2 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Titre + Niveau + Ville ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <div>
          <div style={labelStyle}>Titre du poste <span style={{ color: 'var(--accent)' }}>*</span></div>
          <input
            placeholder="Ex : Chargé(e) de marketing digital"
            value={form.titre || ''}
            onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
            style={{ ...inputStyle, width: '100%', borderColor: !form.titre?.trim() ? '#fca5a5' : undefined }}
          />
        </div>
        <div>
          <div style={labelStyle}>Niveau</div>
          <select value={form.niveau || 'bach'} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))} style={{ ...inputStyle, width: '100%' }}>
            {NIVEAUX.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Ville <span style={{ color: 'var(--accent)' }}>*</span></div>
          <CityAutocompleteOffre value={form.ville || ''} onChange={v => setForm(f => ({ ...f, ville: v }))} />
        </div>
      </div>

      {/* ── Type de contrat ── */}
      <div>
        <div style={labelStyle}>Type de contrat</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {["Contrat d'apprentissage", 'Contrat de professionnalisation'].map(type => {
            const sel = (form.type_contrat || []).includes(type)
            return (
              <button
                key={type}
                onClick={() => toggleContrat(type)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: '1.5px solid ' + (sel ? 'var(--accent)' : 'var(--border)'),
                  background: sel ? 'var(--accent-soft)' : 'white',
                  color: sel ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {sel && <i className="ti ti-check" style={{ marginRight: 5 }} />}{type}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Missions (obligatoire) ── */}
      <div>
        <div style={labelStyle}>Missions <span style={{ color: 'var(--accent)' }}>*</span></div>
        <textarea
          placeholder="Décrivez les principales missions du poste…"
          value={form.missions || ''}
          onChange={e => setForm(f => ({ ...f, missions: e.target.value }))}
          rows={3}
          style={{ ...inputStyle, width: '100%', resize: 'vertical', boxSizing: 'border-box', borderColor: !form.missions?.trim() ? '#fca5a5' : undefined }}
        />
      </div>

      {/* ── Compétences techniques ── */}
      <div>
        <div style={labelStyle}>Compétences techniques attendues</div>
        <textarea
          placeholder="Ex : Maîtrise des réseaux sociaux, Excel, Adobe Suite…"
          value={form.competences || ''}
          onChange={e => setForm(f => ({ ...f, competences: e.target.value }))}
          rows={2}
          style={{ ...inputStyle, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {/* ── Soft skills attendus ── */}
      <div>
        <div style={labelStyle}>Soft skills attendus</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SOFT_SKILLS_OFFRE.map(skill => {
            const sel = (form.soft_skills || []).includes(skill)
            return (
              <button
                key={skill}
                onClick={() => toggleSoft(skill)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  background: sel ? 'var(--teal)' : 'var(--light)',
                  color: sel ? 'white' : 'var(--navy)',
                  fontWeight: sel ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {sel && <i className="ti ti-check" style={{ marginRight: 4, fontSize: 11 }} />}{skill}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Ce que nous recherchons ── */}
      <div>
        <div style={labelStyle}>Ce que nous recherchons</div>
        <textarea
          placeholder="Profil idéal, motivations attendues…"
          value={form.recherche || ''}
          onChange={e => setForm(f => ({ ...f, recherche: e.target.value }))}
          rows={2}
          style={{ ...inputStyle, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {/* ── Contact pour postuler ── */}
      <div>
        <div style={labelStyle}>Comment postuler ?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}><i className="ti ti-mail" style={{ marginRight: 4 }} />Email</div>
            <input type="email" placeholder="recrutement@entreprise.fr" value={form.email_contact || ''} onChange={e => setForm(f => ({ ...f, email_contact: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}><i className="ti ti-phone" style={{ marginRight: 4 }} />Téléphone</div>
            <input type="tel" placeholder="06 00 00 00 00" value={form.telephone_contact || ''} onChange={e => setForm(f => ({ ...f, telephone_contact: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}><i className="ti ti-link" style={{ marginRight: 4 }} />Lien candidature</div>
            <input type="url" placeholder="https://…" value={form.url_candidature || ''} onChange={e => setForm(f => ({ ...f, url_candidature: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
          </div>
        </div>
      </div>

      {/* ── Date + préférence école ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={labelStyle}>Date de prise de poste</div>
          <input type="date" value={form.date_prise_poste || ''} onChange={e => setForm(f => ({ ...f, date_prise_poste: e.target.value }))} style={{ ...inputStyle, width: 180 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 2 }}>
          <div>
            <div style={labelStyle}>Préférence école partenaire ?</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Je souhaite travailler avec une école spécifique</div>
          </div>
          <button className={`toggle ${form.preference_ecole ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, preference_ecole: !f.preference_ecole }))} />
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4 }}>
        <button className="btn-sm accent" onClick={onSubmit} disabled={saving || !canSubmit}>
          <i className="ti ti-speakerphone" /> {saving ? 'Publication…' : submitLabel}
        </button>
        <button className="btn-sm" onClick={onCancel}>Annuler</button>
        {!canSubmit && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Champs obligatoires manquants : {erreurs.map(e => ({ type_offre: 'type d\'offre', titre: 'titre', missions: 'missions', ville: 'ville' }[e])).join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}

// ── OFFRES ────────────────────────────────────────────────────────────────────
export function PanelEntrepriseOffres({ entrepriseIdOverride, hideTopbar } = {}) {
  const supabase = createClient()
  const [offres, setOffres]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [entrepriseId, setEntrepriseId] = useState(entrepriseIdOverride || null)
  const [showForm, setShowForm]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState('')
  const [editingId, setEditingId]       = useState(null)
  const [editForm, setEditForm]         = useState({})

  const EMPTY_FORM = {
    titre: '', niveau: 'bach', secteur: '', ville: '', description: '',
    type_contrat: [], competences: '', missions: '', recherche: '',
    date_prise_poste: '', preference_ecole: false,
    type_offre: '', email_contact: '', telephone_contact: '', url_candidature: '', soft_skills: [],
  }
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    async function load() {
      let entId = entrepriseIdOverride
      if (!entId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data: ent } = await supabase.from('entreprises').select('id').eq('user_id', user.id).maybeSingle()
        if (!ent) { setLoading(false); return }
        entId = ent.id
        setEntrepriseId(entId)
      }
      const { data } = await supabase.from('offres').select('*').eq('entreprise_id', entId).order('created_at', { ascending: false })
      setOffres(data || [])
      setLoading(false)
    }
    load()
  }, [entrepriseIdOverride])

  async function handleCreate() {
    if (!entrepriseId) return
    setSaving(true)
    const { data, error } = await supabase.from('offres').insert({ ...form, entreprise_id: entrepriseId }).select().single()
    if (error) { setMsg('Erreur : ' + error.message) }
    else { setOffres(prev => [data, ...prev]); setShowForm(false); setForm(EMPTY_FORM); setMsg('Offre publiée !'); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  function openEdit(o) {
    setEditingId(o.id)
    setEditForm({
      titre: o.titre || '', niveau: o.niveau || 'bach', secteur: o.secteur || '',
      ville: o.ville || '', type_contrat: o.type_contrat || [],
      competences: o.competences || '', missions: o.missions || '',
      recherche: o.recherche || '', date_prise_poste: o.date_prise_poste || '',
      preference_ecole: o.preference_ecole || false,
      type_offre: o.type_offre || '',
      email_contact: o.email_contact || '', telephone_contact: o.telephone_contact || '',
      url_candidature: o.url_candidature || '', soft_skills: o.soft_skills || [],
    })
  }

  async function handleUpdate() {
    setSaving(true)
    const { data, error } = await supabase.from('offres').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', editingId).select().single()
    if (!error && data) { setOffres(prev => prev.map(o => o.id === editingId ? data : o)); setEditingId(null); setMsg('Offre mise à jour !'); setTimeout(() => setMsg(''), 3000) }
    else setMsg('Erreur : ' + error?.message)
    setSaving(false)
  }

  async function handleStatut(id, statut) {
    const { data } = await supabase.from('offres').update({ statut, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (data) setOffres(prev => prev.map(o => o.id === id ? data : o))
  }

  async function handleActualiser(id) {
    const { data } = await supabase.from('offres').update({ updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (data) { setOffres(prev => prev.map(o => o.id === id ? data : o)); setMsg('Offre actualisée !'); setTimeout(() => setMsg(''), 3000) }
  }

  async function handleDelete(id) {
    await supabase.from('offres').delete().eq('id', id)
    setOffres(prev => prev.filter(o => o.id !== id))
  }

  const STATUT_CONFIG = {
    active:   { label: 'Active',   color: 'var(--teal)',   dot: 'var(--teal)' },
    inactive: { label: 'En pause', color: 'var(--muted)',  dot: 'var(--muted)' },
    archive:  { label: 'Archivée', color: '#9e9e9e',       dot: '#ccc' },
    pourvue:  { label: 'Pourvue',  color: 'var(--accent)', dot: 'var(--accent)' },
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  const activeCount = offres.filter(o => o.statut === 'active').length

  return (
    <>
      {!hideTopbar && (
        <div className="topbar">
          <div>
            <div className="page-title">Mes offres d'alternance</div>
            <div className="page-sub">{activeCount} offre{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
            <button className="btn-sm accent" onClick={() => { setShowForm(v => !v); setEditingId(null) }}><i className="ti ti-plus" /> Nouvelle offre</button>
          </div>
        </div>
      )}

      {hideTopbar && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{activeCount} offre{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 500 }}>{msg}</span>}
            <button className="btn-sm accent" onClick={() => { setShowForm(v => !v); setEditingId(null) }}><i className="ti ti-plus" /> Nouvelle offre</button>
          </div>
        </div>
      )}

      {!entrepriseId && (
        <div className="s-card">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Complétez d'abord votre fiche entreprise (SIRET) pour publier des offres.</div>
        </div>
      )}

      {/* ── Formulaire création ── */}
      {showForm && entrepriseId && (
        <div className="s-card">
          <div className="s-card-header" style={{ marginBottom: 16 }}>
            <div className="s-card-title"><i className="ti ti-plus" /> Nouvelle offre</div>
          </div>
          <OffreForm
            form={form} setForm={setForm}
            onSubmit={handleCreate} onCancel={() => setShowForm(false)}
            saving={saving} submitLabel="Publier l'offre"
          />
        </div>
      )}

      {/* ── Liste des offres ── */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-speakerphone" /> Toutes les offres</div>
        </div>
        {offres.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Aucune offre pour l'instant.</div>
        ) : offres.map(o => {
          const st     = STATUT_CONFIG[o.statut] || STATUT_CONFIG.inactive
          const typeCfg = TYPE_OFFRE_CONFIG[o.type_offre]
          const isEdit = editingId === o.id
          return (
            <div key={o.id} style={{ display: 'flex', gap: 0, padding: 0, overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10 }}>
              <div style={{ width: 4, flexShrink: 0, background: st.dot, borderRadius: '10px 0 0 10px' }} />
              <div style={{ flex: 1, padding: '14px 16px' }}>
                {isEdit ? (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 14 }}>Modifier l'offre</div>
                    <OffreForm
                      form={editForm} setForm={setEditForm}
                      onSubmit={handleUpdate} onCancel={() => setEditingId(null)}
                      saving={saving} submitLabel="Enregistrer"
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      {/* Badge type offre */}
                      {typeCfg && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: typeCfg.bg, color: typeCfg.color, marginBottom: 6 }}>
                          <i className={`ti ${typeCfg.icon}`} style={{ fontSize: 10 }} />{typeCfg.label}
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{o.titre}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.color + '18', padding: '2px 8px', borderRadius: 100 }}>{st.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {[niveauLabel(o.niveau), o.ville].filter(Boolean).join(' · ')}
                      </div>
                      {(o.type_contrat || []).length > 0 && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                          {o.type_contrat.map(t => <span key={t} className="pill accent" style={{ fontSize: 10 }}>{t}</span>)}
                        </div>
                      )}
                      {/* Contact */}
                      <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                        {o.email_contact && <span style={{ fontSize: 11, color: 'var(--teal)' }}><i className="ti ti-mail" style={{ marginRight: 3 }} />{o.email_contact}</span>}
                        {o.telephone_contact && <span style={{ fontSize: 11, color: 'var(--muted)' }}><i className="ti ti-phone" style={{ marginRight: 3 }} />{o.telephone_contact}</span>}
                        {o.url_candidature && <a href={o.url_candidature} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--teal)', textDecoration: 'none' }}><i className="ti ti-link" style={{ marginRight: 3 }} />Lien candidature</a>}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        {o.date_prise_poste && <span style={{ fontSize: 11, color: 'var(--muted)' }}><i className="ti ti-calendar" style={{ marginRight: 3 }} />{new Date(o.date_prise_poste).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                        {o.preference_ecole && <span style={{ fontSize: 11, color: 'var(--purple-mid)' }}><i className="ti ti-school" style={{ marginRight: 3 }} />Préférence école</span>}
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Actualisée le {new Date(o.updated_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => openEdit(o)} title="Modifier"><i className="ti ti-pencil" /></button>
                      <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => handleActualiser(o.id)} title="Actualiser"><i className="ti ti-refresh" /></button>
                      {o.statut !== 'active'  && <button className="btn-sm teal" style={{ fontSize: 11 }} onClick={() => handleStatut(o.id, 'active')}><i className="ti ti-player-play" /> Activer</button>}
                      {o.statut === 'active'  && <button className="btn-sm"      style={{ fontSize: 11 }} onClick={() => handleStatut(o.id, 'inactive')}><i className="ti ti-pause" /> Pause</button>}
                      {o.statut !== 'archive' && <button className="btn-sm"      style={{ fontSize: 11 }} onClick={() => handleStatut(o.id, 'archive')}><i className="ti ti-archive" /> Archiver</button>}
                      {o.statut !== 'pourvue' && <button className="btn-sm"      style={{ fontSize: 11 }} onClick={() => handleStatut(o.id, 'pourvue')}><i className="ti ti-check" /> Pourvue</button>}
                      <button className="btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => handleDelete(o.id)}><i className="ti ti-trash" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
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

const labelStyle = {
  fontSize: 11, fontWeight: 500, color: 'var(--muted)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px',
}
