'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import SuiviFormation from './SuiviFormation'
import { NIVEAU_LABEL_LONG, NIVEAU_COULEURS } from '../../lib/niveaux'
import { initiales } from '../../lib/format'

const MODALITE_MAP = {
  presentiel: { label: 'Présentiel', icon: 'ti-building', bg: '#e0f2fe', color: '#0369a1' },
  distanciel: { label: 'Distanciel', icon: 'ti-wifi',     bg: '#dcfce7', color: '#166534' },
  hybride:    { label: 'Hybride',    icon: 'ti-refresh',  bg: '#fef9c3', color: '#854d0e' },
}

function NiveauTag({ value }) {
  const c = NIVEAU_COULEURS[value] || NIVEAU_COULEURS.autre
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
      {NIVEAU_LABEL_LONG[value] || NIVEAU_LABEL_LONG.autre}
    </span>
  )
}

export default function PanelFormationPublique({ formationId, candidatId, onBack, onNavigateEcole }) {
  const supabase = createClient()
  const [formation, setFormation] = useState(null)
  const [ecole,     setEcole]     = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!formationId) return
    async function load() {
      setLoading(true)
      const { data: f } = await supabase
        .from('formations')
        .select('id, nom, diplome, niveau, modalite, url_onisep, localite_formation, nb_apprentis, taux_presentation, taux_reussite, ecole_id')
        .eq('id', formationId)
        .single()
      setFormation(f)

      if (f?.ecole_id) {
        const { data: e } = await supabase
          .from('ecoles')
          .select('id, nom, ville, region, academie, site_web, email, telephone, avatar_url, modalites')
          .eq('id', f.ecole_id)
          .single()
        setEcole(e)
      }

      setLoading(false)
    }
    load()
  }, [formationId])

  if (loading) return <div style={{ padding: '2rem', fontSize: 13, color: 'var(--muted)' }}>Chargement…</div>
  if (!formation) return <div style={{ padding: '2rem', fontSize: 13, color: 'var(--muted)' }}>Formation introuvable.</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
        {onBack && (
          <button className="btn-sm" onClick={onBack}>
            <i className="ti ti-arrow-left" /> Retour
          </button>
        )}
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Fiche formation</div>
      </div>

      {/* Titre */}
      <div className="s-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          {formation.niveau && <NiveauTag value={formation.niveau} />}
          {(formation.modalite
            ? [formation.modalite]
            : (ecole?.modalites || [])
          ).map(val => {
            const m = MODALITE_MAP[val]
            return m ? (
              <span key={val} style={{ background: m.bg, color: m.color, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <i className={`ti ${m.icon}`} style={{ fontSize: 11 }} /> {m.label}
              </span>
            ) : null
          })}
          {formation.diplome && (
            <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--light)', padding: '3px 10px', borderRadius: 20 }}>
              {formation.diplome}
            </span>
          )}
        </div>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.3, marginBottom: 8 }}>
          {formation.nom}
        </div>

        {formation.localite_formation && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 12 }} /> {formation.localite_formation}
          </div>
        )}

        {/* Stats */}
        {(formation.nb_apprentis > 0 || formation.taux_reussite || formation.taux_presentation) && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {formation.nb_apprentis > 0 && (
              <div style={{ background: 'var(--light)', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{formation.nb_apprentis}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>apprentis</div>
              </div>
            )}
            {formation.taux_reussite && (
              <div style={{ background: '#dcfce7', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>{formation.taux_reussite} %</div>
                <div style={{ fontSize: 11, color: '#166534' }}>taux de réussite</div>
              </div>
            )}
            {formation.taux_presentation && (
              <div style={{ background: '#e0f2fe', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0369a1' }}>{formation.taux_presentation} %</div>
                <div style={{ fontSize: 11, color: '#0369a1' }}>taux de présentation</div>
              </div>
            )}
          </div>
        )}

        {formation.url_onisep && (
          <button
            className="btn-sm teal"
            style={{ marginTop: 16 }}
            onClick={() => window.open(formation.url_onisep, '_blank')}
          >
            <i className="ti ti-external-link" /> Voir la fiche ONISEP
          </button>
        )}
      </div>

      {/* ── Bloc suivi candidat — pipeline de Mes candidatures ──────────────── */}
      <SuiviFormation
        candidatId={candidatId}
        formationId={formationId}
        insertDefaults={{ nom_entreprise: ecole?.nom || 'École', poste: formation?.nom || 'Formation' }}
      />

      {/* École dispensatrice */}
      {ecole && (
        <div className="s-card" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            <i className="ti ti-school" /> École dispensatrice
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: onNavigateEcole ? 'pointer' : 'default', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--light)' }}
            onClick={() => onNavigateEcole?.(ecole.id)}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--purple-soft)', color: 'var(--purple)', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initiales(ecole.nom, 3)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{ecole.nom}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {[ecole.ville, ecole.region].filter(Boolean).join(' · ')}
                {ecole.academie && ` · Acad. ${ecole.academie}`}
              </div>
            </div>
            {onNavigateEcole && <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--teal)' }} />}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {ecole.email && (
              <a href={`mailto:${ecole.email}`} style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none' }}>
                <i className="ti ti-mail" /> {ecole.email}
              </a>
            )}
            {ecole.telephone && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                <i className="ti ti-phone" /> {ecole.telephone}
              </span>
            )}
            {ecole.site_web && (
              <a href={ecole.site_web.startsWith('http') ? ecole.site_web : 'https://' + ecole.site_web} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none' }}>
                <i className="ti ti-world" /> Site web
              </a>
            )}
          </div>
        </div>
      )}

      {/* Informations pratiques */}
      <div className="s-card" style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
          <i className="ti ti-calendar" /> Informations pratiques
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
          Dates d'inscription et informations complémentaires à venir.
        </div>
      </div>

    </div>
  )
}
