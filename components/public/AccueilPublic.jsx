'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { initiales } from '../../lib/format'

/* ── Design tokens (identité propre à la page publique) ─────────────────────── */
const C = {
  bg:        '#F7F8FA',
  white:     '#FFFFFF',
  orange:    '#FF5C2B',
  green:     '#1D9E75',
  greenSoft: '#E1F5EE',
  ink:       '#0D1117',
  sub:       '#6B7280',
  border:    '#E5E7EB',
}

const CHIPS = [
  { metier: 'Développeur web', ville: 'Paris' },
  { metier: 'Marketing',       ville: 'Lyon' },
  { metier: 'Comptabilité',    ville: 'Bordeaux' },
  { metier: 'Commerce',        ville: 'Marseille' },
  { metier: 'RH',              ville: 'Nantes' },
  { metier: 'Graphisme',       ville: 'Toulouse' },
]

const PAINS = [
  { icon: 'ti-clock-hour-4', titre: 'Des semaines sans réponse', texte: "Tu postules et c'est le silence radio. Impossible de savoir ce que deviennent tes candidatures." },
  { icon: 'ti-layers-subtract', titre: 'Des dizaines de candidatures', texte: 'Éparpillées entre mails, sites et tableurs — tu finis par perdre le fil de qui t\'a répondu.' },
  { icon: 'ti-mood-sad', titre: 'Une motivation qui s\'effrite', texte: 'À force de chercher sans résultat, on baisse les bras. Tu mérites un vrai coup de pouce.' },
]

const FEATURES = [
  { icon: 'ti-checklist',  label: 'Suivi des candidatures' },
  { icon: 'ti-bell',       label: 'Alertes offres' },
  { icon: 'ti-school',     label: 'Visible des écoles' },
  { icon: 'ti-chart-line', label: 'Suivi de progression' },
]

// Plafond d'affichage : sans métier précis, une ville comme Paris remonte
// plusieurs milliers d'offres — on n'en rend qu'un nombre raisonnable.
const MAX_AFFICHES = 60

// Date de publication → timestamp ; 0 si absente (candidatures spontanées) → en bas du tri.
function tsPublication(d) {
  const t = d ? new Date(d).getTime() : 0
  return Number.isNaN(t) ? 0 : t
}

export default function AccueilPublic() {
  const [metier, setMetier]   = useState('')
  const [ville,  setVille]    = useState('')
  const [coords, setCoords]   = useState(null)   // {lat, lng, nom} si choisi dans la liste
  const [suggestions, setSuggestions] = useState([])

  const [status,  setStatus]  = useState('idle') // idle | loading | done | error
  const [results, setResults] = useState([])
  const [error,   setError]   = useState('')
  const [searchedCity, setSearchedCity] = useState('')

  const resultsRef = useRef(null)

  // ── Autocomplétion ville (API gouv) ────────────────────────────────────────
  async function fetchVilleSuggestions(val) {
    if (val.trim().length < 2) { setSuggestions([]); return }
    try {
      const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(val.trim())}&fields=nom,centre,codeDepartement&boost=population&limit=6`)
      const data = await res.json()
      setSuggestions((data || [])
        .filter(c => c.centre)
        .map(c => ({ nom: c.nom, lat: c.centre.coordinates[1], lng: c.centre.coordinates[0] })))
    } catch { setSuggestions([]) }
  }

  function pickSuggestion(s) {
    setVille(s.nom)
    setCoords(s)
    setSuggestions([])
  }

  // ── Recherche ───────────────────────────────────────────────────────────────
  async function rechercher(metierVal = metier, villeVal = ville, coordsArg = coords) {
    if (!villeVal.trim()) { setStatus('error'); setError('Indique une ville pour lancer la recherche.'); return }
    setStatus('loading'); setError(''); setResults([]); setSuggestions([])

    // 1. Géocodage (sauf si la ville a été choisie dans la liste)
    let geo = coordsArg && coordsArg.nom?.toLowerCase() === villeVal.trim().toLowerCase() ? coordsArg : null
    if (!geo) {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(villeVal.trim())}&fields=nom,centre&boost=population&limit=1`)
        const [commune] = await res.json()
        if (commune?.centre) geo = { nom: commune.nom, lat: commune.centre.coordinates[1], lng: commune.centre.coordinates[0] }
      } catch { /* géocodage indisponible */ }
    }
    if (!geo) { setStatus('error'); setError(`Ville « ${villeVal.trim()} » introuvable — vérifie l'orthographe.`); return }

    // 2. Offres La Bonne Alternance via le proxy interne (token géré côté serveur)
    try {
      const res  = await fetch(`/api/alternance?latitude=${geo.lat}&longitude=${geo.lng}&radius=30`)
      const data = await res.json()
      if (!res.ok || data.error) { setStatus('error'); setError(data.error || 'La recherche d\'offres a échoué.'); return }

      let jobs = data.jobs || []
      const kw = metierVal.trim().toLowerCase()
      if (kw) {
        jobs = jobs.filter(j => `${j.titre || ''} ${j.entreprise || ''} ${j.description || ''}`.toLowerCase().includes(kw))
      }
      jobs.sort((a, b) => tsPublication(b.date_creation) - tsPublication(a.date_creation))

      setResults(jobs)
      setSearchedCity(geo.nom)
      setStatus('done')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch {
      setStatus('error'); setError('Impossible de joindre le service d\'offres (problème réseau).')
    }
  }

  function lancerChip(c) {
    setMetier(c.metier); setVille(c.ville); setCoords(null)
    rechercher(c.metier, c.ville, null)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{styleSheet}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }} className="acc-nav">
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px' }}>
          All<span style={{ color: C.orange }}>school</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/login" className="acc-btn-ghost">Se connecter</Link>
          <Link href="/login" className="acc-btn-primary acc-nav-cta">Créer un compte</Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px 40px', textAlign: 'center', maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.greenSoft, color: C.green, fontWeight: 600, fontSize: 13, padding: '6px 14px', borderRadius: 100 }}>
          <i className="ti ti-bolt" style={{ fontSize: 14 }} /> Offres en temps réel · La Bonne Alternance
        </span>

        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', margin: '24px 0 16px' }}>
          Trouve ton alternance sans <span style={{ color: C.orange }}>galère</span>.
        </h1>
        <p style={{ fontSize: 18, color: C.sub, lineHeight: 1.5, maxWidth: 620, margin: '0 auto 32px' }}>
          Toutes les offres disponibles au même endroit. Recherche, compare, postule — sans créer de compte.
        </p>

        {/* Barre de recherche */}
        <div className="acc-search">
          <div className="acc-search-field" style={{ position: 'relative' }}>
            <i className="ti ti-briefcase acc-field-icon" />
            <input
              className="acc-input"
              placeholder="Métier, secteur, compétence…"
              value={metier}
              onChange={e => setMetier(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && rechercher()}
            />
          </div>

          <div className="acc-sep" />

          <div className="acc-search-field" style={{ position: 'relative' }}>
            <i className="ti ti-map-pin acc-field-icon" />
            <input
              className="acc-input"
              placeholder="Ville ou code postal"
              value={ville}
              onChange={e => { setVille(e.target.value); setCoords(null); fetchVilleSuggestions(e.target.value) }}
              onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); rechercher() } if (e.key === 'Escape') setSuggestions([]) }}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            />
            {suggestions.length > 0 && (
              <div className="acc-suggest">
                {suggestions.map((s, i) => (
                  <div key={i} className="acc-suggest-item" onMouseDown={() => pickSuggestion(s)}>
                    <i className="ti ti-map-pin" style={{ fontSize: 12, color: C.sub }} /> {s.nom}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="acc-btn-search" onClick={() => rechercher()}>
            <i className="ti ti-search" style={{ fontSize: 16 }} /> Rechercher
          </button>
        </div>

        {/* Chips de suggestions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 18 }}>
          {CHIPS.map((c, i) => (
            <button key={i} className="acc-chip" onClick={() => lancerChip(c)}>
              {c.metier} · {c.ville}
            </button>
          ))}
        </div>
      </section>

      {/* ── RÉSULTATS ───────────────────────────────────────────────────────── */}
      <section ref={resultsRef} style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '8px 24px 56px', flex: 1 }}>
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.sub }}>
            <span className="acc-spinner" />
            <div style={{ marginTop: 14, fontSize: 14 }}>Recherche des offres en cours…</div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: C.sub }}>
            <i className="ti ti-wifi-off" style={{ fontSize: 40, color: C.orange, opacity: 0.8 }} />
            <div style={{ marginTop: 12, fontSize: 15, color: C.ink, fontWeight: 600 }}>Oups, ça n'a pas marché</div>
            <div style={{ marginTop: 4, fontSize: 14 }}>{error}</div>
          </div>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: '8px 0 16px' }}>
              {results.length} offre{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''} autour de {searchedCity}
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: C.sub }}>
                <i className="ti ti-search-off" style={{ fontSize: 40, opacity: 0.4 }} />
                <div style={{ marginTop: 12, fontSize: 15, color: C.ink, fontWeight: 600 }}>Aucune offre trouvée</div>
                <div style={{ marginTop: 4, fontSize: 14 }}>Essaie d'élargir ta recherche : un métier plus large, ou une autre ville.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.slice(0, MAX_AFFICHES).map((o, i) => <OffreCard key={o.id || i} offre={o} />)}
                </div>
                {results.length > MAX_AFFICHES && (
                  <div style={{ textAlign: 'center', fontSize: 13, color: C.sub, marginTop: 18 }}>
                    Affichage des {MAX_AFFICHES} premières offres — précise un métier pour affiner ta recherche.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* ── CONVERSION (sombre) ─────────────────────────────────────────────── */}
      <section style={{ background: C.ink, padding: '72px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.2 }}>
            Pas assez d'offres ?<br />Fatigué de chercher sans résultats ?
          </h2>

          <div className="acc-pains">
            {PAINS.map((p, i) => (
              <div key={i} className="acc-pain-card">
                <i className={`ti ${p.icon} acc-pain-icon`} />
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '12px 0 6px' }}>{p.titre}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.5 }}>{p.texte}</div>
              </div>
            ))}
          </div>

          <Link href="/login" className="acc-btn-primary acc-btn-lg">Créer mon espace candidat — c'est gratuit</Link>

          <div className="acc-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="acc-feature">
                <i className={`ti ${f.icon}`} /> {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAND ──────────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '48px 24px' }}>
        <div className="acc-stats">
          {[
            { num: '608 000+', label: 'candidatures envoyées en 2025' },
            { num: '3,5M',     label: 'visiteurs sur La Bonne Alternance' },
            { num: '44%',      label: 'des candidats galèrent à trouver' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.ink, letterSpacing: '-1px' }}>{s.num}</div>
              <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: '48px 40px 24px' }}>
        <div className="acc-footer-cols">
          {/* Marque */}
          <div>
            <span style={{ fontWeight: 800, fontSize: 20 }}>All<span style={{ color: C.orange }}>school</span></span>
            <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.5, marginTop: 10, maxWidth: 260 }}>
              La plateforme qui simplifie la recherche d'alternance en France.
            </p>
          </div>

          {/* Ressources */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ressources</div>
            <Link href="/blog" className="acc-foot-link">Blog &amp; conseils alternance</Link>
            <Link href="/" className="acc-foot-link">Offres d'alternance</Link>
          </div>

          {/* Informations légales */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Informations légales</div>
            <div className="acc-foot-static">
              Mentions légales <span className="acc-badge">À venir</span>
            </div>
            <div className="acc-foot-static">
              Politique de confidentialité
              <div className="acc-foot-note">Ce site ne collecte aucune donnée personnelle.</div>
            </div>
            <div className="acc-foot-static">
              Cookies
              <div className="acc-foot-note">Ce site n'utilise pas de cookies.</div>
            </div>
            <div className="acc-foot-static">
              CGU / CGV <span className="acc-badge">Non applicable</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 32, paddingTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', fontSize: 13, color: C.sub }}>
          <span>© 2026 Allschool — Tous droits réservés</span>
          <span>contact@allschool.app</span>
        </div>
      </footer>
    </div>
  )
}

/* ── Carte offre ────────────────────────────────────────────────────────────── */
function OffreCard({ offre }) {
  const clickable = !!offre.url
  const datePub = offre.date_creation
    ? new Date(offre.date_creation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div
      className={`acc-card${clickable ? ' acc-card-click' : ''}`}
      onClick={() => clickable && window.open(offre.url, '_blank', 'noopener,noreferrer')}
      role={clickable ? 'link' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={e => { if (clickable && e.key === 'Enter') window.open(offre.url, '_blank', 'noopener,noreferrer') }}
    >
      <div className="acc-card-av">{initiales(offre.entreprise || offre.titre || '?', 2)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{offre.titre || 'Offre sans titre'}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
          {[offre.entreprise, offre.ville].filter(Boolean).join(' · ') || 'Entreprise non précisée'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {offre.contrat && (
            <span style={{ background: C.greenSoft, color: C.green, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100 }}>
              {offre.contrat}
            </span>
          )}
          {datePub && (
            <span style={{ background: '#FFF1EC', color: C.orange, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100 }}>
              Publiée le {datePub}
            </span>
          )}
        </div>
      </div>
      {clickable && <i className="ti ti-external-link" style={{ color: C.sub, fontSize: 16, flexShrink: 0 }} />}
    </div>
  )
}

/* ── Styles (classes + responsive) ─────────────────────────────────────────── */
const styleSheet = `
.acc-btn-ghost { font-size: 14px; font-weight: 600; color: ${C.ink}; text-decoration: none; padding: 9px 16px; border-radius: 8px; border: 1px solid ${C.border}; background: ${C.white}; }
.acc-btn-ghost:hover { background: ${C.bg}; }
.acc-btn-primary { font-size: 14px; font-weight: 600; color: #fff; text-decoration: none; padding: 9px 16px; border-radius: 8px; background: ${C.orange}; border: none; cursor: pointer; display: inline-block; }
.acc-btn-primary:hover { background: #e8501f; }
.acc-btn-lg { padding: 14px 28px; font-size: 16px; }

.acc-search { display: flex; align-items: center; gap: 0; background: ${C.white}; border: 1px solid ${C.border}; border-radius: 12px; padding: 6px; box-shadow: 0 4px 20px rgba(13,17,23,0.05); max-width: 720px; margin: 0 auto; }
.acc-search-field { flex: 1; display: flex; align-items: center; }
.acc-field-icon { color: ${C.sub}; font-size: 17px; padding: 0 6px 0 12px; }
.acc-input { flex: 1; border: none; outline: none; font-size: 15px; padding: 12px 8px; background: transparent; color: ${C.ink}; font-family: inherit; width: 100%; }
.acc-sep { width: 1px; align-self: stretch; background: ${C.border}; margin: 6px 0; }
.acc-btn-search { display: inline-flex; align-items: center; gap: 7px; background: ${C.orange}; color: #fff; border: none; border-radius: 8px; padding: 12px 22px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }
.acc-btn-search:hover { background: #e8501f; }

.acc-suggest { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff; border: 1px solid ${C.border}; border-radius: 10px; box-shadow: 0 8px 24px rgba(13,17,23,0.10); overflow: hidden; z-index: 50; text-align: left; }
.acc-suggest-item { padding: 10px 14px; font-size: 14px; color: ${C.ink}; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.acc-suggest-item:hover { background: ${C.bg}; }

.acc-chip { background: ${C.white}; border: 1px solid ${C.border}; border-radius: 100px; padding: 7px 14px; font-size: 13px; font-weight: 500; color: ${C.ink}; cursor: pointer; font-family: inherit; }
.acc-chip:hover { border-color: ${C.orange}; color: ${C.orange}; }

.acc-card { display: flex; align-items: flex-start; gap: 14px; background: ${C.white}; border: 1px solid ${C.border}; border-radius: 12px; padding: 16px 18px; transition: box-shadow .15s, border-color .15s; }
.acc-card-click { cursor: pointer; }
.acc-card-click:hover { border-color: ${C.orange}; box-shadow: 0 4px 16px rgba(13,17,23,0.06); }
.acc-card-av { width: 44px; height: 44px; border-radius: 10px; background: ${C.greenSoft}; color: ${C.green}; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.acc-spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid ${C.greenSoft}; border-top-color: ${C.orange}; border-radius: 50%; animation: acc-spin .7s linear infinite; }
@keyframes acc-spin { to { transform: rotate(360deg); } }

.acc-pains { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 40px 0; text-align: left; }
.acc-pain-card { background: #161B22; border: 1px solid #232A33; border-radius: 12px; padding: 22px; }
.acc-pain-icon { color: ${C.orange}; font-size: 26px; }
.acc-features { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px 28px; margin-top: 36px; }
.acc-feature { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.78); font-size: 14px; font-weight: 500; }
.acc-feature i { color: ${C.green}; font-size: 18px; }

.acc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 720px; margin: 0 auto; }
.acc-footer-cols { display: grid; grid-template-columns: 1.4fr 1fr 1.4fr; gap: 32px; max-width: 980px; margin: 0 auto; }
.acc-foot-link { display: block; font-size: 14px; color: ${C.sub}; text-decoration: none; margin-bottom: 10px; }
.acc-foot-link:hover { color: ${C.orange}; }
.acc-foot-static { font-size: 14px; color: ${C.ink}; margin-bottom: 14px; }
.acc-foot-note { font-size: 12px; color: ${C.sub}; margin-top: 3px; }
.acc-badge { display: inline-block; font-size: 11px; font-weight: 600; color: ${C.sub}; background: ${C.bg}; border: 1px solid ${C.border}; border-radius: 100px; padding: 1px 8px; margin-left: 6px; }

@media (max-width: 720px) {
  .acc-nav { padding: 16px 20px; }
  .acc-search { flex-direction: column; align-items: stretch; gap: 6px; }
  .acc-sep { display: none; }
  .acc-btn-search { justify-content: center; }
  .acc-stats { grid-template-columns: 1fr; gap: 28px; }
  .acc-footer-cols { grid-template-columns: 1fr; gap: 28px; }
  .acc-pains { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .acc-nav-cta { display: none; }
}
`
