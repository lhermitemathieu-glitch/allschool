'use client'

import { useEffect } from 'react'
import SuiviFormation from './SuiviFormation'

const NIVEAU_LABEL = {
  cap: 'CAP', bac: 'Bac Pro', bts: 'BTS', bach: 'Bachelor', master: 'Master', autre: 'Autre',
}

function niveauStyle(niveau) {
  const map = {
    cap:    { background: '#fef9c3', color: '#854d0e' },
    bac:    { background: '#ffedd5', color: '#9a3412' },
    bts:    { background: '#e0f2fe', color: '#0369a1' },
    bach:   { background: '#dcfce7', color: '#166534' },
    master: { background: '#fce7f3', color: '#9d174d' },
    autre:  { background: '#ede9fe', color: '#7c3aed' },
  }
  return map[niveau] || map.autre
}

function fmt(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function PanelFormationLBADrawer({ formation, onClose, onNavigateEcole, candidatId, onSuiviChange }) {
  const f = formation

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!f) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 300, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 560,
        background: 'white', zIndex: 301,
        boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'white', zIndex: 10,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {(f.diplome_label || f.niveau) && (
              <span style={{ ...niveauStyle(f.niveau), fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, display: 'inline-block', marginBottom: 6 }}>
                {f.diplome_label || NIVEAU_LABEL[f.niveau] || f.niveau}
              </span>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.4 }}>{f.nom}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, padding: 4, flexShrink: 0 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Contenu */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Mon suivi — pipeline de Mes candidatures (candidat connecté uniquement) */}
          <SuiviFormation
            candidatId={candidatId}
            lbaFormation={f}
            onSuiviChange={onSuiviChange}
            style={{ marginBottom: 0, padding: '12px 14px' }}
          />

          {/* École */}
          <div className="s-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              <i className="ti ti-school" style={{ marginRight: 4 }} /> École
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{f.ecole_nom}</div>
            {(f.ecole_adresse || f.adresse) && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                <i className="ti ti-map-pin" style={{ fontSize: 11 }} /> {f.ecole_adresse || f.adresse}{f.ecole_cp ? `, ${f.ecole_cp}` : ''} {f.ville}
              </div>
            )}
            {f.ecole_site_web && (
              <a href={f.ecole_site_web} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: 'var(--teal)', fontWeight: 500, textDecoration: 'none' }}>
                <i className="ti ti-world" style={{ fontSize: 12 }} /> {f.ecole_site_web.replace('https://', '').replace('www.', '')}
              </a>
            )}
          </div>

          {/* Infos clés */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {f.duree_annees && (
              <div className="s-card" style={{ marginBottom: 0, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Durée</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginTop: 2 }}>{f.duree_annees} an{f.duree_annees > 1 ? 's' : ''}</div>
              </div>
            )}
            <div className="s-card" style={{ marginBottom: 0, padding: '10px 12px', background: f.entierement_distance ? '#dcfce7' : 'white' }}>
              <div style={{ fontSize: 11, color: f.entierement_distance ? '#166534' : 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Modalité</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: f.entierement_distance ? '#166534' : 'var(--navy)', marginTop: 2 }}>
                {f.entierement_distance
                  ? <><i className="ti ti-wifi" /> 100% distanciel</>
                  : <><i className="ti ti-building" /> Présentiel</>
                }
              </div>
            </div>
            {f.rncp && (
              <div className="s-card" style={{ marginBottom: 0, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>RNCP</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginTop: 2 }}>{f.rncp}</div>
              </div>
            )}
            {f.region && (
              <div className="s-card" style={{ marginBottom: 0, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Région</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginTop: 2 }}>{f.region}</div>
              </div>
            )}
          </div>

          {/* Sessions */}
          {f.sessions?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
                <i className="ti ti-calendar" style={{ marginRight: 4 }} /> Sessions disponibles
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {f.sessions.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8,
                    background: i === 0 ? '#e0f2fe' : 'var(--light)',
                    fontSize: 12,
                  }}>
                    {i === 0 && <span style={{ background: '#0369a1', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>PROCHAINE</span>}
                    <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Début : {fmt(s.debut)}</span>
                    {s.fin && <span style={{ color: 'var(--muted)' }}>→ {fmt(s.fin)}</span>}
                    {s.capacite && <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{s.capacite} places</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objectif */}
          {f.objectif && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                <i className="ti ti-target" style={{ marginRight: 4 }} /> Objectifs
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line', maxHeight: 200, overflowY: 'auto', padding: '8px 12px', background: 'var(--light)', borderRadius: 8 }}>
                {f.objectif}
              </div>
            </div>
          )}

          {/* Contenu */}
          {f.contenu && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                <i className="ti ti-book" style={{ marginRight: 4 }} /> Programme
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line', maxHeight: 200, overflowY: 'auto', padding: '8px 12px', background: 'var(--light)', borderRadius: 8 }}>
                {f.contenu}
              </div>
            </div>
          )}

          {/* Liens */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {f.ecole_id && onNavigateEcole && (
              <button
                onClick={() => { onClose(); onNavigateEcole(f.ecole_id, 'candidat-formations') }}
                className="btn-sm"
                style={{ fontSize: 12, background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <i className="ti ti-school" /> Voir la fiche école
              </button>
            )}
            {f.url_onisep && (
              <a href={f.url_onisep} target="_blank" rel="noopener noreferrer" className="btn-sm teal" style={{ fontSize: 12, textDecoration: 'none' }}>
                <i className="ti ti-external-link" /> Fiche ONISEP
              </a>
            )}
            {f.ecole_site_web && (
              <a href={f.ecole_site_web} target="_blank" rel="noopener noreferrer" className="btn-sm" style={{ fontSize: 12, textDecoration: 'none' }}>
                <i className="ti ti-world" /> Site de l'école
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
