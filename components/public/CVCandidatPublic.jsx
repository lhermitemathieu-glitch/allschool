'use client'

import { useRef } from 'react'
import { initialesNom, formatTel } from '../../lib/format'

/* ── helpers ─────────────────────────────────────────────────────────────── */
const MOIS_LABELS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
const MOIS_FULL   = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function formatDispo(p) {
  if (p.dispo_mois && p.dispo_annee) return `Disponible en ${MOIS_FULL[p.dispo_mois - 1]} ${p.dispo_annee}`
  return p.disponibilite || null
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
  return `${debut} – ${fin}`
}

function dureeExp(exp) {
  if (!exp.mois_debut || !exp.annee_debut) return null
  const debut = new Date(Number(exp.annee_debut), Number(exp.mois_debut) - 1)
  const fin   = exp.en_cours
    ? new Date()
    : exp.mois_fin && exp.annee_fin
      ? new Date(Number(exp.annee_fin), Number(exp.mois_fin) - 1)
      : null
  if (!fin || fin < debut) return null
  const mois = Math.max(1, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24 * 30.44)))
  if (mois >= 12) {
    const ans = Math.floor(mois / 12)
    const restant = mois % 12
    return restant ? `${ans} an${ans > 1 ? 's' : ''} ${restant} mois` : `${ans} an${ans > 1 ? 's' : ''}`
  }
  return `${mois} mois`
}

function qrUrl(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=0E1B2E&margin=2`
}

/* ── composant principal ─────────────────────────────────────────────────── */
export default function CVCandidatPublic({ profil, publicUrl }) {
  const cvRef = useRef(null)
  const wrapperRef = useRef(null)

  const dispo = formatDispo(profil)
  const exps  = profil.masquer_experiences ? [] : (profil.experiences || []).filter(e => e.poste || e.entreprise)
  const hasSoftSkills = (profil.competences_soft || []).length > 0 && !profil.cv_masquer_soft_skills
  const hasHardSkills = !!profil.competences_hard?.trim() && !profil.cv_masquer_competences_hard
  const hasLangues    = (profil.langues || []).length > 0 && !profil.cv_masquer_langues
  const hasInterets   = ((profil.passions || []).length > 0) && !profil.cv_masquer_interets

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .cv-no-print { display: none !important; }
          .cv-wrapper { padding: 0 !important; margin: 0 !important; display: block !important; }
          .cv-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: unset !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            transform-origin: top left !important;
          }
        }
        @page { size: A4 portrait; margin: 0; }
        @media screen { .cv-page { max-width: 210mm; } }
      `}</style>

      {/* ── Barre actions (non imprimée) ── */}
      <div className="cv-no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--navy, #0E1B2E)', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem',
      }}>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 20, color: 'white', letterSpacing: '-0.5px' }}>
          all<span style={{ color: '#FF6B35' }}>school</span>
        </span>
        <button
          onClick={handlePrint}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#1D9E75', color: 'white',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
          }}
        >
          <i className="ti ti-download" style={{ fontSize: 15 }} />
          Télécharger en PDF
        </button>
      </div>

      {/* ── Fond page ── */}
      <div ref={wrapperRef} className="cv-wrapper" style={{ background: '#F7F5F0', minHeight: '100vh', paddingTop: 70, paddingBottom: 40, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* ── CV A4 ── */}
        <div
          ref={cvRef}
          className="cv-page"
          style={{
            width: '100%',
            background: 'white',
            boxShadow: '0 4px 32px rgba(14,27,46,0.12)',
            borderRadius: 4,
            display: 'flex',
            fontFamily: 'DM Sans, sans-serif',
            overflow: 'hidden',
            minHeight: '297mm',
            printColorAdjust: 'exact',
          }}
        >
          {/* ══ COLONNE GAUCHE ══ */}
          <div style={{
            width: 200,
            flexShrink: 0,
            background: '#0E1B2E',
            color: 'white',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {/* Photo + identité */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              {profil.photo_url ? (
                <img
                  src={profil.photo_url}
                  alt=""
                  style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)' }}
                />
              ) : (
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: 'rgba(29,158,117,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 28, color: '#1D9E75',
                }}>
                  {initialesNom(profil.prenom, profil.nom)}
                </div>
              )}
              <div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 16, lineHeight: 1.2, marginBottom: 4 }}>
                  {profil.prenom || ''} {profil.nom || ''}
                </div>
                {profil.formation && (
                  <div style={{ fontSize: 11, color: '#FF6B35', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {profil.formation}
                  </div>
                )}
              </div>
            </div>

            {/* Infos de contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <SideTitle>Contact</SideTitle>
              {profil.email && (
                <SideItem icon="ti-mail">
                  <a href={`mailto:${profil.email}`} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, wordBreak: 'break-all', textDecoration: 'none' }}>
                    {profil.email}
                  </a>
                </SideItem>
              )}
              {profil.telephone && <SideItem icon="ti-phone">{formatTel(profil.telephone)}</SideItem>}
              {profil.ville && <SideItem icon="ti-map-pin">{profil.ville}</SideItem>}
              {dispo && <SideItem icon="ti-calendar">{dispo}</SideItem>}
              {profil.linkedin_url && (
                <SideItem icon="ti-brand-linkedin">
                  <a href={profil.linkedin_url} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, wordBreak: 'break-all', textDecoration: 'none' }}>
                    LinkedIn
                  </a>
                </SideItem>
              )}
            </div>

            {/* Infos pratiques */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <SideTitle>Infos</SideTitle>
              {profil.niveau_etudes && <SideItem icon="ti-school">{profil.niveau_etudes}</SideItem>}
              <SideItem icon="ti-car">{profil.permis ? 'Permis B' : 'Pas de permis'}</SideItem>
            </div>

            {/* Langues */}
            {hasLangues && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <SideTitle>Langues</SideTitle>
                {profil.langues.map((l, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{l.langue}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{l.niveau}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Soft skills */}
            {hasSoftSkills && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SideTitle>Soft skills</SideTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {profil.competences_soft.map(s => (
                    <span key={s} style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 20,
                      background: 'rgba(29,158,117,0.2)', color: '#4ade80', fontWeight: 500,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <img
                src={qrUrl(publicUrl)}
                alt="QR Code profil"
                style={{ width: 80, height: 80, borderRadius: 6, background: 'white', padding: 4 }}
              />
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.4 }}>
                Profil en ligne
              </div>
            </div>
          </div>

          {/* ══ COLONNE DROITE ══ */}
          <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {/* En-tête nom + trait */}
            <div>
              <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 26, color: '#0E1B2E', lineHeight: 1.1, marginBottom: 6 }}>
                {profil.prenom || ''} <span style={{ color: '#1D9E75' }}>{profil.nom || ''}</span>
              </h1>
              {profil.formation && (
                <div style={{ fontSize: 13, color: '#6B7A8D', fontWeight: 500, marginBottom: 8 }}>{profil.formation}</div>
              )}
              <div style={{ height: 3, width: 48, background: '#FF6B35', borderRadius: 2 }} />
            </div>

            {/* Bio */}
            {profil.bio && !profil.cv_masquer_apropos && (
              <Section title="À propos" icon="ti-user">
                <p style={{ fontSize: 12.5, color: '#3a4557', lineHeight: 1.75, margin: 0 }}>{profil.bio}</p>
              </Section>
            )}

            {/* Expériences */}
            {exps.length > 0 && (
              <Section title="Expériences professionnelles" icon="ti-briefcase">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {exps.map((exp, i) => {
                    const duree = dureeExp(exp)
                    return (
                      <div key={i} style={{ display: 'flex', gap: 14 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className="ti ti-building" style={{ fontSize: 15, color: '#085041' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0E1B2E', lineHeight: 1.3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <span>{exp.poste || '—'}{exp.entreprise && <span style={{ fontWeight: 500, color: '#6B7A8D' }}> · {exp.entreprise}</span>}</span>
                            {exp.contrat && <span style={{ fontSize: 10, fontWeight: 600, color: '#085041', background: '#E1F5EE', padding: '1px 6px', borderRadius: 4 }}>{exp.contrat}</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#6B7A8D', marginTop: 2 }}>
                            {formatPeriode(exp)}{duree ? ` (${duree})` : ''}{exp.ville ? ` · ${exp.ville}` : ''}
                          </div>
                          {(exp.missions || []).filter(Boolean).length > 0 && (
                            <ul style={{ margin: '5px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {exp.missions.filter(Boolean).map((m, mi) => (
                                <li key={mi} style={{ fontSize: 11, color: '#0E1B2E', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                                  <span style={{ color: '#085041', flexShrink: 0 }}>•</span>{m}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Compétences techniques */}
            {hasHardSkills && (
              <Section title="Compétences techniques" icon="ti-tool">
                <p style={{ fontSize: 12.5, color: '#3a4557', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {profil.competences_hard}
                </p>
              </Section>
            )}

            {/* Centres d'intérêt */}
            {hasInterets && (
              <Section title="Centres d'intérêt" icon="ti-heart">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(profil.passions || []).map((t, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: '#F7F5F0', color: '#0E1B2E', border: '1px solid rgba(14,27,46,0.09)',
                    }}>{t}</span>
                  ))}
                </div>
              </Section>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

/* ── Sous-composants ─────────────────────────────────────────────────────── */
function SideTitle({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '0.5px solid rgba(255,255,255,0.1)', paddingBottom: 4, marginBottom: 2 }}>
      {children}
    </div>
  )
}

function SideItem({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12, marginTop: 1, flexShrink: 0, color: '#1D9E75' }} />
      <span>{children}</span>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: '#1D9E75' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0E1B2E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(14,27,46,0.09)', marginLeft: 4 }} />
      </div>
      {children}
    </div>
  )
}
