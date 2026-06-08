'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'
import { SECTEURS } from '../../lib/secteurs'

const NIVEAUX = { cap: 'CAP', bts: 'BTS / BUT', bach: 'Bachelor', master: 'Master' }

// Géocode une ville → { lat, lng } via api-adresse.data.gouv.fr
async function geocodeVille(nom) {
  try {
    const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(nom)}&type=municipality&limit=1`)
    const json = await res.json()
    const feat = json?.features?.[0]
    if (!feat) return null
    const [lng, lat] = feat.geometry.coordinates
    return { lat, lng }
  } catch { return null }
}

export default function PanelCandidatOffres() {
  const supabase = createClient()

  // Offres Allschool
  const [offres,   setOffres]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [total,    setTotal]    = useState(null)

  // Offres La Bonne Alternance
  const [lbaOffres,  setLbaOffres]  = useState([])
  const [lbaLoading, setLbaLoading] = useState(false)
  const [lbaError,   setLbaError]   = useState('')

  // Filtres
  const [q,       setQ]       = useState('')
  const [secteur, setSecteur] = useState('')
  const [niveau,  setNiveau]  = useState('')
  const [ville,   setVille]   = useState('')
  const [contrat, setContrat] = useState('')

  useEffect(() => {
    supabase.from('offres').select('id', { count: 'exact', head: true })
      .eq('statut', 'active')
      .then(({ count }) => setTotal(count))
  }, [])

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    setLbaOffres([])
    setLbaError('')

    // ── 1. Offres Allschool ────────────────────────────────────────────────
    let query = supabase
      .from('offres')
      .select(`
        id, titre, niveau, secteur, ville, description,
        type_contrat, competences, missions, recherche,
        date_prise_poste, preference_ecole, updated_at,
        entreprises ( raison_sociale, ville )
      `)
      .eq('statut', 'active')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (q.trim())    query = query.ilike('titre',   `%${q.trim()}%`)
    if (secteur)     query = query.ilike('secteur', `%${secteur}%`)
    if (niveau)      query = query.eq('niveau', niveau)
    if (ville.trim()) query = query.ilike('ville',  `%${ville.trim()}%`)
    if (contrat)     query = query.contains('type_contrat', [contrat])

    const { data } = await query
    setOffres(data || [])
    setLoading(false)

    // ── 2. Offres La Bonne Alternance (si secteur + ville renseignés) ──────
    if (secteur && ville.trim()) {
      setLbaLoading(true)
      try {
        const geo = await geocodeVille(ville.trim())
        if (!geo) {
          setLbaError('Ville introuvable pour La Bonne Alternance.')
          setLbaLoading(false)
          return
        }
        const params = new URLSearchParams({
          secteur,
          latitude:  geo.lat,
          longitude: geo.lng,
          radius:    '30',
        })
        const res  = await fetch(`/api/alternance?${params}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erreur API')
        setLbaOffres(json.jobs || [])
      } catch (err) {
        setLbaError(err.message || 'Impossible de charger les offres nationales.')
      } finally {
        setLbaLoading(false)
      }
    }
  }, [q, secteur, niveau, ville, contrat])

  const totalLba = lbaOffres.length

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Offres d'alternance</div>
          <div className="page-sub">
            {searched
              ? loading
                ? 'Recherche…'
                : `${offres.length} offre${offres.length !== 1 ? 's' : ''} Allschool`
                  + (secteur && ville ? ` · ${lbaLoading ? '…' : totalLba + ' offre' + (totalLba !== 1 ? 's' : '') + ' nationales'}` : '')
              : total !== null
                ? `${total} offre${total !== 1 ? 's' : ''} disponible${total !== 1 ? 's' : ''} — utilisez les filtres pour rechercher`
                : 'Chargement…'}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="fbar">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 160px' }}>
            <div style={labelStyle}>Poste</div>
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Ex : Marketing, RH…" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: '2 1 160px' }}>
            <div style={labelStyle}>Secteur</div>
            <select value={secteur} onChange={e => setSecteur(e.target.value)} style={{ width: '100%' }}>
              <option value="">Tous secteurs</option>
              {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <div style={labelStyle}>Niveau</div>
            <select value={niveau} onChange={e => setNiveau(e.target.value)} style={{ width: '100%' }}>
              <option value="">Tous niveaux</option>
              {Object.entries(NIVEAUX).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <div style={labelStyle}>Ville</div>
            <input value={ville} onChange={e => setVille(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Paris, Lyon…" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <div style={labelStyle}>Type de contrat</div>
            <select value={contrat} onChange={e => setContrat(e.target.value)} style={{ width: '100%' }}>
              <option value="">Tous types</option>
              <option value="Contrat d'apprentissage">Apprentissage</option>
              <option value="Contrat de professionnalisation">Professionnalisation</option>
            </select>
          </div>
          <button className="btn-sm teal" onClick={search} style={{ flexShrink: 0 }}>
            <i className="ti ti-search" /> Rechercher
          </button>
        </div>
      </div>

      {/* État initial */}
      {!searched ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <i className="ti ti-briefcase" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
          Utilisez les filtres et cliquez sur <strong>Rechercher</strong> pour voir les offres.
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            Ajoutez un <strong>secteur</strong> et une <strong>ville</strong> pour voir aussi les offres nationales La Bonne Alternance.
          </div>
        </div>
      ) : (
        <>
          {/* ── Offres Allschool ── */}
          <SectionHeader
            icon="ti-building"
            label="Offres Allschool"
            count={loading ? null : offres.length}
            color="var(--teal)"
          />
          {loading ? (
            <div style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
          ) : offres.length === 0 ? (
            <div style={{ padding: '1rem 0', color: 'var(--muted)', fontSize: 13 }}>
              Aucune offre Allschool ne correspond à vos critères.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {offres.map(o => <OffreCard key={o.id} offre={o} />)}
            </div>
          )}

          {/* ── Offres La Bonne Alternance ── */}
          {(secteur && ville) && (
            <>
              <SectionHeader
                icon="ti-world"
                label="Offres nationales · La Bonne Alternance"
                count={lbaLoading ? null : totalLba}
                color="var(--purple-mid)"
                sublabel="Offres issues de France Travail et partenaires, dans un rayon de 30 km"
              />
              {lbaLoading ? (
                <div style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: 14 }}>Chargement des offres nationales…</div>
              ) : lbaError ? (
                <div style={{ padding: '1rem 0', color: 'var(--red, #e05)', fontSize: 13 }}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{lbaError}
                </div>
              ) : lbaOffres.length === 0 ? (
                <div style={{ padding: '1rem 0', color: 'var(--muted)', fontSize: 13 }}>
                  Aucune offre nationale trouvée pour ce secteur et cette ville.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {lbaOffres.map((o, i) => <LbaOffreCard key={o.id || i} offre={o} />)}
                </div>
              )}
            </>
          )}

          {/* Hint si pas de ville/secteur */}
          {searched && (!secteur || !ville) && (
            <div style={{ marginTop: 24, padding: '12px 16px', borderRadius: 10, background: 'var(--purple-soft)', fontSize: 12, color: 'var(--purple-mid)' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
              Ajoutez un <strong>secteur</strong> et une <strong>ville</strong> pour afficher aussi les offres nationales La Bonne Alternance.
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, count, color, sublabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${color}` }}>
      <i className={`ti ${icon}`} style={{ fontSize: 16, color }} />
      <div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        {count !== null && (
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>
            {count} résultat{count !== 1 ? 's' : ''}
          </span>
        )}
        {sublabel && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{sublabel}</div>
        )}
      </div>
    </div>
  )
}

// ── Carte offre Allschool ──────────────────────────────────────────────────────
function OffreCard({ offre: o }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 0, overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: 'white' }}>
      <div style={{ width: 4, flexShrink: 0, background: 'var(--teal)', borderRadius: '10px 0 0 10px' }} />
      <div style={{ flex: 1, padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{o.titre}</span>
              {o.niveau && <span className="pill teal" style={{ fontSize: 10 }}>{NIVEAUX[o.niveau]}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              <i className="ti ti-building" style={{ marginRight: 4 }} />
              {o.entreprises?.raison_sociale || 'Entreprise'}
              {o.ville ? ` · ${o.ville}` : ''}
            </div>
            {(o.type_contrat || []).length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                {o.type_contrat.map(t => <span key={t} className="pill accent" style={{ fontSize: 10 }}>{t}</span>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {o.date_prise_poste && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  <i className="ti ti-calendar" style={{ marginRight: 3 }} />
                  {new Date(o.date_prise_poste).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {o.preference_ecole && (
                <span style={{ fontSize: 11, color: 'var(--purple-mid)' }}>
                  <i className="ti ti-school" style={{ marginRight: 3 }} />Préférence école
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Actualisée le {new Date(o.updated_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setOpen(v => !v)}>
              <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} /> {open ? 'Moins' : 'Détails'}
            </button>
            <button className="btn-sm teal" style={{ fontSize: 11 }}>
              <i className="ti ti-send" /> Postuler
            </button>
          </div>
        </div>

        {open && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {o.missions && (
              <div>
                <div style={sectionLabel}>Missions</div>
                <div style={sectionText}>{o.missions}</div>
              </div>
            )}
            {o.competences && (
              <div>
                <div style={sectionLabel}>Compétences attendues</div>
                <div style={sectionText}>{o.competences}</div>
              </div>
            )}
            {o.recherche && (
              <div>
                <div style={sectionLabel}>Ce que nous recherchons</div>
                <div style={sectionText}>{o.recherche}</div>
              </div>
            )}
            {o.description && (
              <div>
                <div style={sectionLabel}>Description</div>
                <div style={sectionText}>{o.description}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Carte offre La Bonne Alternance ───────────────────────────────────────────
function LbaOffreCard({ offre: o }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 0, overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: 'white' }}>
      <div style={{ width: 4, flexShrink: 0, background: 'var(--purple-mid)', borderRadius: '10px 0 0 10px' }} />
      <div style={{ flex: 1, padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{o.titre}</span>
              {o.niveau && <span className="pill purple" style={{ fontSize: 10 }}>{o.niveau}</span>}
              <span style={{ fontSize: 10, color: 'var(--purple-mid)', background: 'var(--purple-soft)', borderRadius: 6, padding: '2px 7px', fontWeight: 500 }}>
                {o.source === 'offres_emploi' ? 'France Travail' : 'La Bonne Alternance'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              <i className="ti ti-building" style={{ marginRight: 4 }} />
              {o.entreprise || 'Entreprise'}
              {o.ville ? ` · ${o.ville}` : ''}
            </div>
            {o.contrat && (
              <div style={{ marginBottom: 6 }}>
                <span className="pill accent" style={{ fontSize: 10 }}>{o.contrat}</span>
              </div>
            )}
            {o.date_creation && (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                <i className="ti ti-calendar" style={{ marginRight: 3 }} />
                Publiée le {new Date(o.date_creation).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {o.description && (
              <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setOpen(v => !v)}>
                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} /> {open ? 'Moins' : 'Détails'}
              </button>
            )}
            {o.url ? (
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="btn-sm teal" style={{ fontSize: 11, textDecoration: 'none' }}>
                <i className="ti ti-external-link" /> Voir l'offre
              </a>
            ) : (
              <button className="btn-sm teal" style={{ fontSize: 11 }} disabled>
                <i className="ti ti-send" /> Postuler
              </button>
            )}
          </div>
        </div>

        {open && o.description && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={sectionLabel}>Description</div>
            <div style={sectionText}>{o.description}</div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 11, fontWeight: 500, color: 'var(--muted)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px',
}

const sectionLabel = {
  fontSize: 11, fontWeight: 700, color: 'var(--navy)',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
}

const sectionText = {
  fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
}
