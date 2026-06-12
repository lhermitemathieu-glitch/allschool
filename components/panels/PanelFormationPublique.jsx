'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import { verifier } from '../ui/Toaster'

const MODALITE_MAP = {
  presentiel: { label: 'Présentiel', icon: 'ti-building', bg: '#e0f2fe', color: '#0369a1' },
  distanciel: { label: 'Distanciel', icon: 'ti-wifi',     bg: '#dcfce7', color: '#166534' },
  hybride:    { label: 'Hybride',    icon: 'ti-refresh',  bg: '#fef9c3', color: '#854d0e' },
}

const NIVEAU_MAP = {
  cap:      { label: 'CAP',                bg: '#fef9c3', color: '#854d0e' },
  bac:      { label: 'Bac Pro',            bg: '#ffedd5', color: '#9a3412' },
  bts:      { label: 'BTS',               bg: '#e0f2fe', color: '#0369a1' },
  bts_agri: { label: 'BTS Agricole',      bg: '#d1fae5', color: '#065f46' },
  deust:    { label: 'DEUST',             bg: '#ede9fe', color: '#5b21b6' },
  afpa3:    { label: 'Niv 3 – AFPA',      bg: '#fce7f3', color: '#9d174d' },
  niv3:     { label: 'Niv 3 – Autre',     bg: '#f1f5f9', color: '#475569' },
  bach:     { label: 'Bachelor / Licence',bg: '#dcfce7', color: '#166534' },
  master:   { label: 'Master / Ingénieur',bg: '#fce7f3', color: '#9d174d' },
  autre:    { label: 'Autre',             bg: '#ede9fe', color: '#7c3aed' },
}

export const STATUTS = [
  { key: 'favori',            label: 'Favori',              icon: 'ti-star',      color: '#b45309', bg: '#fef9c3' },
  { key: 'candidature_faire', label: 'Candidature à faire', icon: 'ti-clipboard', color: 'var(--accent)', bg: '#fff3e0' },
  { key: 'postule',           label: 'Postulé',              icon: 'ti-send',      color: '#0d9488', bg: '#e0fdf4' },
  { key: 'en_attente',        label: 'En attente',           icon: 'ti-hourglass', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'accepte',           label: 'Accepté',              icon: 'ti-check',     color: '#166534', bg: '#dcfce7' },
  { key: 'pas_interesse',     label: 'Pas intéressé',        icon: 'ti-ban',       color: '#6b7280', bg: '#f3f4f6' },
]

function NiveauTag({ value }) {
  const n = NIVEAU_MAP[value] || NIVEAU_MAP.autre
  return (
    <span style={{ background: n.bg, color: n.color, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
      {n.label}
    </span>
  )
}

function sigle(nom) {
  return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

// ── Modale action ─────────────────────────────────────────────────────────────
function ActionModal({ action, onSave, onClose }) {
  const [texte, setTexte]       = useState(action?.texte || '')
  const [echeance, setEcheance] = useState(action?.echeance || '')
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    if (!texte.trim()) return
    setSaving(true)
    await onSave({ texte: texte.trim(), echeance: echeance || null })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--navy)', marginBottom: 16 }}>
          <i className="ti ti-bell" style={{ marginRight: 8 }} />
          {action ? 'Modifier l\'action' : 'Fixer une action'}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Prochaine action *</div>
          <input
            autoFocus
            value={texte}
            onChange={e => setTexte(e.target.value)}
            placeholder="Ex : Envoyer mon dossier, Appeler le secrétariat…"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Échéance</div>
          <input
            type="date"
            value={echeance}
            onChange={e => setEcheance(e.target.value)}
            style={{ ...inputStyle, width: 'auto' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm teal" onClick={handleSave} disabled={saving || !texte.trim()}>
            <i className="ti ti-check" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {action && (
            <button className="btn-sm" style={{ color: 'var(--red)' }} onClick={() => onSave(null)}>
              <i className="ti ti-trash" /> Supprimer
            </button>
          )}
          <button className="btn-sm" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default function PanelFormationPublique({ formationId, candidatId, onBack, onNavigateEcole }) {
  const supabase = createClient()
  const [formation, setFormation] = useState(null)
  const [ecole,     setEcole]     = useState(null)
  const [loading,   setLoading]   = useState(true)

  // Suivi candidat
  const [statut,      setStatut]      = useState(null)
  const [action,      setAction]      = useState(null)
  const [showModal,   setShowModal]   = useState(false)
  const [savingStatut, setSavingStatut] = useState(false)

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

      // Charger statut + action du candidat si connecté
      if (candidatId) {
        const [{ data: s }, { data: a }] = await Promise.all([
          supabase.from('formation_statuts').select('*').eq('candidat_id', candidatId).eq('formation_id', formationId).maybeSingle(),
          supabase.from('formation_actions').select('*').eq('candidat_id', candidatId).eq('formation_id', formationId).maybeSingle(),
        ])
        setStatut(s?.statut || null)
        setAction(a || null)
      }

      setLoading(false)
    }
    load()
  }, [formationId, candidatId])

  async function handleStatut(key) {
    if (!candidatId) return
    setSavingStatut(true)
    if (statut === key) {
      // Désélectionner
      const { error } = await supabase.from('formation_statuts').delete().eq('candidat_id', candidatId).eq('formation_id', formationId)
      if (verifier(error, 'Le retrait du statut a échoué.')) setStatut(null)
    } else {
      const { error } = await supabase.from('formation_statuts').upsert({ candidat_id: candidatId, formation_id: formationId, statut: key, updated_at: new Date().toISOString() })
      if (verifier(error, 'L\'enregistrement du statut a échoué.')) setStatut(key)
    }
    setSavingStatut(false)
  }

  async function handleSaveAction(payload) {
    if (!candidatId) return
    if (!payload) {
      // Supprimer
      const { error } = await supabase.from('formation_actions').delete().eq('candidat_id', candidatId).eq('formation_id', formationId)
      if (verifier(error, 'La suppression de l\'action a échoué.')) setAction(null)
      return
    }
    const { data, error } = await supabase.from('formation_actions')
      .upsert({ candidat_id: candidatId, formation_id: formationId, ...payload, fait: false, updated_at: new Date().toISOString() })
      .select().single()
    if (!verifier(error, 'L\'enregistrement de l\'action a échoué.')) return
    setAction(data)
  }

  if (loading) return <div style={{ padding: '2rem', fontSize: 13, color: 'var(--muted)' }}>Chargement…</div>
  if (!formation) return <div style={{ padding: '2rem', fontSize: 13, color: 'var(--muted)' }}>Formation introuvable.</div>

  const statutConfig = STATUTS.find(s => s.key === statut)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {showModal && (
        <ActionModal
          action={action}
          onSave={handleSaveAction}
          onClose={() => setShowModal(false)}
        />
      )}

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

      {/* ── Bloc suivi candidat ─────────────────────────────────────────────── */}
      {candidatId && (
        <div className="s-card" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            <i className="ti ti-bookmark" /> Mon suivi
          </div>

          {/* Statuts */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Statut</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STATUTS.map(s => {
                const active = statut === s.key
                return (
                  <button
                    key={s.key}
                    disabled={savingStatut}
                    onClick={() => handleStatut(s.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${active ? s.color : 'var(--border)'}`,
                      background: active ? s.bg : 'white',
                      color: active ? s.color : 'var(--muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <i className={`ti ${s.icon}`} style={{ fontSize: 11 }} />
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action */}
          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Prochaine action</div>
            {action ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--light)', border: '0.5px solid var(--border)' }}>
                <i className="ti ti-bell" style={{ fontSize: 14, color: 'var(--teal)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{action.texte}</div>
                  {action.echeance && (
                    <div style={{ fontSize: 11, color: isOverdue(action.echeance) ? 'var(--red, #e53e3e)' : 'var(--muted)', marginTop: 2 }}>
                      <i className="ti ti-calendar" style={{ marginRight: 3 }} />
                      {formatDate(action.echeance)}
                      {isOverdue(action.echeance) && ' — En retard'}
                    </div>
                  )}
                </div>
                <button className="btn-sm" style={{ fontSize: 11 }} onClick={() => setShowModal(true)}>
                  <i className="ti ti-pencil" />
                </button>
              </div>
            ) : (
              <button className="btn-sm" onClick={() => setShowModal(true)}>
                <i className="ti ti-plus" /> Fixer une action
              </button>
            )}
          </div>
        </div>
      )}

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
              {sigle(ecole.nom)}
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

function isOverdue(echeance) {
  if (!echeance) return false
  return new Date(echeance) < new Date(new Date().toDateString())
}

function formatDate(echeance) {
  return new Date(echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid var(--border)', background: 'white',
  fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5,
}
