'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import PanelFormationLBADrawer from './PanelFormationLBADrawer'
import { NIVEAU_COULEURS } from '../../lib/niveaux'
import { sigle } from '../../lib/format'

export default function PanelEcoleLBAPublique({ ecole: ecoleInit, onBack, candidatId }) {
  const supabase = createClient()

  // Données enrichies depuis Supabase (si UAI matche)
  const [enrichi,  setEnrichi]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [drawer,   setDrawer]   = useState(null)

  const e = ecoleInit || {}

  useEffect(() => {
    async function loadEnrichissement() {
      if (!e.uai) { setLoading(false); return }
      const { data } = await supabase
        .from('ecoles')
        .select('id, nom, description, site_web, linkedin, logo_url, cover_url, email_contact, telephone, secteurs, nb_etudiants, initiatives, source, publiee')
        .eq('uai', e.uai)
        .maybeSingle()
      setEnrichi(data || null)
      setLoading(false)
    }
    loadEnrichissement()
  }, [e.uai])

  const isPartenaire = enrichi?.source === 'partenaire'
  const siteWeb      = enrichi?.site_web || e.ecole_site_web || null
  const email        = enrichi?.email_contact || e.email || null
  const description  = enrichi?.description || null
  const logoUrl      = enrichi?.logo_url || null
  const coverUrl     = enrichi?.cover_url || null
  const initiatives  = enrichi?.initiatives || []

  const formations   = e.formations || []

  return (
    <>
      {drawer && <PanelFormationLBADrawer formation={drawer} onClose={() => setDrawer(null)} candidatId={candidatId} />}

      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-sm" onClick={onBack} style={{ flexShrink: 0 }}>
            <i className="ti ti-arrow-left" /> Retour
          </button>
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {e.nom || 'École'}
              {e.qualiopi && (
                <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  <i className="ti ti-rosette" style={{ fontSize: 10, marginRight: 3 }} />Qualiopi
                </span>
              )}
              {isPartenaire && (
                <span style={{ fontSize: 10, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  <i className="ti ti-star" style={{ fontSize: 10, marginRight: 3 }} />Partenaire Allschool
                </span>
              )}
            </div>
            <div className="page-sub">{[e.ville, e.departement, e.region].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      </div>

      {/* Cover partenaire */}
      {coverUrl && (
        <div style={{ height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: '1rem', background: '#f1f5f9' }}>
          <img src={coverUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'start' }}>

        {/* Colonne gauche — infos école */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="s-card" style={{ marginBottom: 0 }}>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'contain', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--purple-soft)', color: 'var(--purple-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 }}>
                  {sigle(e.nom)}
                </div>
              )}
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{e.nom}</div>
                {e.uai && <div style={{ fontSize: 11, color: 'var(--muted)' }}>UAI {e.uai}</div>}
              </div>
            </div>

            {/* Coordonnées */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              {(e.ecole_adresse || e.adresse) && (
                <span>
                  <i className="ti ti-map-pin" style={{ marginRight: 6, fontSize: 11 }} />
                  {e.ecole_adresse || e.adresse}{e.ecole_cp ? `, ${e.ecole_cp}` : ''}
                </span>
              )}
              {e.academie && (
                <span><i className="ti ti-building" style={{ marginRight: 6, fontSize: 11 }} />Académie {e.academie}</span>
              )}
              {email && (
                <a href={`mailto:${email}`} style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                  <i className="ti ti-mail" style={{ marginRight: 6, fontSize: 11 }} />{email}
                </a>
              )}
              {enrichi?.telephone && (
                <span><i className="ti ti-phone" style={{ marginRight: 6, fontSize: 11 }} />{enrichi.telephone}</span>
              )}
              {siteWeb && (
                <a href={siteWeb.startsWith('http') ? siteWeb : `https://${siteWeb}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                  <i className="ti ti-world" style={{ marginRight: 6, fontSize: 11 }} />
                  {siteWeb.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              )}
              {enrichi?.linkedin && (
                <a href={enrichi.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0a66c2', textDecoration: 'none' }}>
                  <i className="ti ti-brand-linkedin" style={{ marginRight: 6, fontSize: 11 }} />LinkedIn
                </a>
              )}
            </div>

            {/* Stats partenaire */}
            {enrichi?.nb_etudiants && (
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--light)', fontSize: 12, color: 'var(--navy)' }}>
                <i className="ti ti-users" style={{ marginRight: 6 }} />
                <strong>{enrichi.nb_etudiants.toLocaleString('fr-FR')}</strong> étudiants
              </div>
            )}

            {/* Secteurs */}
            {enrichi?.secteurs?.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {enrichi.secteurs.map(s => (
                  <span key={s} className="pill purple" style={{ fontSize: 10 }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Description partenaire */}
          {description && (
            <div className="s-card" style={{ marginBottom: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                <i className="ti ti-info-circle" style={{ marginRight: 5 }} />À propos
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{description}</div>
            </div>
          )}

          {/* Initiatives partenaire */}
          {initiatives.length > 0 && (
            <div className="s-card" style={{ marginBottom: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                <i className="ti ti-stars" style={{ marginRight: 5 }} />Initiatives
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {initiatives.map((init, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'var(--purple-soft)', color: 'var(--purple-mid)', fontWeight: 500 }}>
                    {init}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite — formations */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            <i className="ti ti-certificate" style={{ marginRight: 5 }} />
            {formations.length} formation{formations.length > 1 ? 's' : ''} disponible{formations.length > 1 ? 's' : ''}
          </div>

          {formations.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune formation trouvée pour cette recherche.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {formations.map((f, i) => (
                <FormationRow key={f.lba_id || i} formation={f} onClick={() => setDrawer(f)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Ligne formation ───────────────────────────────────────────────────────────
function FormationRow({ formation: f, onClick }) {
  // Fallback gris (= niv3) pour les formations sans niveau identifié
  const nc = NIVEAU_COULEURS[f.niveau] || NIVEAU_COULEURS.niv3

  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderRadius: 8, cursor: 'pointer', borderBottom: '0.5px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--light)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>
          {f.nom}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {f.diplome_label && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: nc.bg, color: nc.color }}>
              {f.diplome_label}
            </span>
          )}
          {f.entierement_distance && (
            <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
              <i className="ti ti-wifi" style={{ fontSize: 9, marginRight: 2 }} />Distanciel
            </span>
          )}
          {f.prochaine_rentree && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              <i className="ti ti-calendar" style={{ fontSize: 10, marginRight: 3 }} />
              Prochaine rentrée : {new Date(f.prochaine_rentree).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
          )}
          {f.duree_annees && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              <i className="ti ti-clock" style={{ fontSize: 10, marginRight: 3 }} />{f.duree_annees} an{f.duree_annees > 1 ? 's' : ''}
            </span>
          )}
          {f.ville && !f.entierement_distance && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              <i className="ti ti-map-pin" style={{ fontSize: 10, marginRight: 3 }} />{f.ville}
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 500, flexShrink: 0 }}>
        Voir le détail <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
      </span>
    </div>
  )
}
