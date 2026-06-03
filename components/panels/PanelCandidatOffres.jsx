'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase/client'

const NIVEAUX = { cap: 'CAP', bts: 'BTS / BUT', bach: 'Bachelor', master: 'Master' }

const SECTEURS = [
  'Agriculture & Environnement', 'Alimentation & Restauration', 'Arts & Culture',
  'BTP & Immobilier', 'Commerce & Vente', 'Communication & Marketing',
  'Finance & Comptabilité', 'Hôtellerie & Tourisme', 'Industrie & Production',
  'Informatique & Numérique', 'Juridique & Droit', 'Logistique & Transport',
  'Ressources Humaines', 'Santé & Social', 'Sport & Animation',
]

export default function PanelCandidatOffres() {
  const supabase = createClient()

  const [offres,   setOffres]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [total,    setTotal]    = useState(null)

  const [q,        setQ]        = useState('')
  const [secteur,  setSecteur]  = useState('')
  const [niveau,   setNiveau]   = useState('')
  const [ville,    setVille]    = useState('')
  const [contrat,  setContrat]  = useState('')

  useEffect(() => {
    supabase.from('offres').select('id', { count: 'exact', head: true })
      .eq('statut', 'active')
      .then(({ count }) => setTotal(count))
  }, [])

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)

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

    if (q.trim())   query = query.ilike('titre', `%${q.trim()}%`)
    if (secteur)    query = query.ilike('secteur', `%${secteur}%`)
    if (niveau)     query = query.eq('niveau', niveau)
    if (ville.trim()) query = query.ilike('ville', `%${ville.trim()}%`)
    if (contrat)    query = query.contains('type_contrat', [contrat])

    const { data } = await query
    setOffres(data || [])
    setLoading(false)
  }, [q, secteur, niveau, ville, contrat])

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Offres d'alternance</div>
          <div className="page-sub">
            {searched
              ? loading ? 'Recherche…' : `${offres.length} offre${offres.length !== 1 ? 's' : ''} trouvée${offres.length !== 1 ? 's' : ''}`
              : total !== null ? `${total} offre${total !== 1 ? 's' : ''} disponible${total !== 1 ? 's' : ''} — utilisez les filtres pour rechercher` : 'Chargement…'}
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

      {/* Résultats */}
      {!searched ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <i className="ti ti-briefcase" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
          Utilisez les filtres et cliquez sur <strong>Rechercher</strong> pour voir les offres.
        </div>
      ) : loading ? (
        <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
      ) : offres.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          Aucune offre ne correspond à vos critères.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {offres.map(o => (
            <OffreCard key={o.id} offre={o} />
          ))}
        </div>
      )}
    </>
  )
}

function OffreCard({ offre: o }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="s-card" style={{ marginBottom: 0, borderLeft: '3px solid var(--teal)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* En-tête */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{o.titre}</span>
            {o.niveau && <span className="pill teal" style={{ fontSize: 10 }}>{NIVEAUX[o.niveau]}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            <i className="ti ti-building" style={{ marginRight: 4 }} />
            {o.entreprises?.raison_sociale || 'Entreprise'}
            {o.ville ? ` · ${o.ville}` : ''}
          </div>

          {/* Types de contrat */}
          {(o.type_contrat || []).length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              {o.type_contrat.map(t => <span key={t} className="pill accent" style={{ fontSize: 10 }}>{t}</span>)}
            </div>
          )}

          {/* Infos rapides */}
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setOpen(v => !v)}>
            <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} /> {open ? 'Moins' : 'Détails'}
          </button>
          <button className="btn-sm teal" style={{ fontSize: 11 }}>
            <i className="ti ti-send" /> Postuler
          </button>
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
