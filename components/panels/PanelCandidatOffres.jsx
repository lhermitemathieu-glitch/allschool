'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'
import { SECTEURS } from '../../lib/secteurs'
import { typeInfo, lbaTypeFromSource } from '../../lib/offre-types'

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

  const [resultats, setResultats] = useState([])   // liste unifiée
  const [loading,   setLoading]   = useState(false)
  const [lbaLoading, setLbaLoading] = useState(false)
  const [searched,  setSearched]  = useState(false)
  const [lbaError,  setLbaError]  = useState('')
  const [total,     setTotal]     = useState(null)

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
    setLbaLoading(false)
    setSearched(true)
    setLbaError('')
    setResultats([])

    // ── 1. Offres Allschool ────────────────────────────────────────────────
    let query = supabase
      .from('offres')
      .select(`
        id, titre, niveau, secteur, ville, description,
        type_contrat, competences, missions, recherche,
        date_prise_poste, preference_ecole, updated_at, type_offre,
        entreprises ( raison_sociale, ville )
      `)
      .eq('statut', 'active')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (q.trim())     query = query.ilike('titre',   `%${q.trim()}%`)
    if (secteur)      query = query.ilike('secteur', `%${secteur}%`)
    if (niveau)       query = query.eq('niveau', niveau)
    if (ville.trim()) query = query.ilike('ville',   `%${ville.trim()}%`)
    if (contrat)      query = query.contains('type_contrat', [contrat])

    const { data: allschoolData } = await query

    const allschoolOffres = (allschoolData || []).map(o => ({
      _id:         `allschool-${o.id}`,
      _source:     'allschool',
      tag:         o.type_offre || 'allschool',
      titre:       o.titre,
      entreprise:  o.entreprises?.raison_sociale || '',
      ville:       o.ville || '',
      contrat:     (o.type_contrat || []).join(', '),
      niveau:      o.niveau ? NIVEAUX[o.niveau] : '',
      description: o.description || '',
      missions:    o.missions || '',
      competences: o.competences || '',
      recherche:   o.recherche || '',
      date:        o.updated_at,
      url:         null,
      preference_ecole: o.preference_ecole,
      date_prise_poste: o.date_prise_poste,
      // données brutes pour la modale détail
      _raw: o,
    }))

    setResultats(allschoolOffres)
    setLoading(false)

    // ── 2. Offres La Bonne Alternance (si secteur + ville) ─────────────────
    if (secteur && ville.trim()) {
      setLbaLoading(true)
      try {
        const geo = await geocodeVille(ville.trim())
        if (!geo) {
          setLbaError('Ville introuvable pour la recherche nationale.')
          setLbaLoading(false)
          return
        }
        const params = new URLSearchParams({ secteur, latitude: geo.lat, longitude: geo.lng, radius: '30' })
        const res  = await fetch(`/api/alternance?${params}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erreur API')

        const lbaOffres = (json.jobs || []).map(o => ({
          _id:         `lba-${o.id || Math.random()}`,
          _source:     'lba',
          tag:         lbaTypeFromSource(o.source),
          titre:       o.titre,
          entreprise:  o.entreprise || '',
          ville:       o.ville || '',
          contrat:     o.contrat || '',
          niveau:      o.niveau || '',
          description: o.description || '',
          missions:    '',
          competences: '',
          recherche:   '',
          date:        o.date_creation,
          url:         o.url,
          preference_ecole: false,
          date_prise_poste: null,
        }))

        setResultats(prev => [...prev, ...lbaOffres])
      } catch (err) {
        setLbaError(err.message || 'Impossible de charger les offres nationales.')
      } finally {
        setLbaLoading(false)
      }
    }
  }, [q, secteur, niveau, ville, contrat])

  const nbResultats = resultats.length

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Offres d'alternance</div>
          <div className="page-sub">
            {searched
              ? (loading || lbaLoading)
                ? 'Recherche en cours…'
                : `${nbResultats} offre${nbResultats !== 1 ? 's' : ''} trouvée${nbResultats !== 1 ? 's' : ''}`
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
            Ajoutez un <strong>secteur</strong> et une <strong>ville</strong> pour inclure les offres nationales La Bonne Alternance.
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
      ) : (
        <>
          {/* Chargement LBA en cours */}
          {lbaLoading && (
            <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
              Recherche des offres nationales en cours…
            </div>
          )}

          {/* Erreur LBA */}
          {lbaError && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fff1f2', color: '#be123c', fontSize: 12, marginBottom: 10 }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{lbaError}
            </div>
          )}

          {/* Hint si pas secteur+ville */}
          {searched && (!secteur || !ville) && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--purple-soft)', fontSize: 12, color: 'var(--purple-mid)' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
              Ajoutez un <strong>secteur</strong> et une <strong>ville</strong> pour inclure les offres nationales La Bonne Alternance.
            </div>
          )}

          {/* Liste unifiée */}
          {resultats.length === 0 && !lbaLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              Aucune offre ne correspond à vos critères.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resultats.map((o, i) => <OffreCard key={o._id || i} offre={o} />)}
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Carte offre unifiée ────────────────────────────────────────────────────────
function OffreCard({ offre: o }) {
  const [open, setOpen] = useState(false)
  const tag = typeInfo(o.tag)

  const hasDetails = o.description || o.missions || o.competences || o.recherche

  return (
    <div style={{ display: 'flex', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: 'white' }}>
      {/* Barre colorée gauche selon tag */}
      <div style={{ width: 4, flexShrink: 0, background: tag.color, borderRadius: '10px 0 0 10px' }} />

      <div style={{ flex: 1, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Titre + tag */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                {o.titre}
              </span>
              {/* Tag type */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                background: tag.bg, color: tag.color,
              }}>
                <i className={`ti ${tag.icon}`} style={{ fontSize: 10 }} />
                {tag.label}
              </span>
              {/* Niveau si dispo */}
              {o.niveau && (
                <span className="pill teal" style={{ fontSize: 10 }}>{o.niveau}</span>
              )}
            </div>

            {/* Entreprise + ville */}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              <i className="ti ti-building" style={{ marginRight: 4 }} />
              {o.entreprise || 'Entreprise'}
              {o.ville ? ` · ${o.ville}` : ''}
            </div>

            {/* Contrat */}
            {o.contrat && (
              <div style={{ marginBottom: 6 }}>
                <span className="pill accent" style={{ fontSize: 10 }}>{o.contrat}</span>
              </div>
            )}

            {/* Infos bas */}
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
              {o.date && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {o._source === 'allschool' ? 'Actualisée' : 'Publiée'} le {new Date(o.date).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {hasDetails && (
              <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setOpen(v => !v)}>
                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} /> {open ? 'Moins' : 'Détails'}
              </button>
            )}
            {o.url ? (
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="btn-sm teal" style={{ fontSize: 11, textDecoration: 'none' }}>
                <i className="ti ti-external-link" /> Voir l'offre
              </a>
            ) : (
              <button className="btn-sm teal" style={{ fontSize: 11 }}>
                <i className="ti ti-send" /> Postuler
              </button>
            )}
          </div>
        </div>

        {/* Détails dépliables */}
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
