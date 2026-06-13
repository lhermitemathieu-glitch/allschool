'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import { verifier, notifierErreur } from '../ui/Toaster'
import { STATUTS_CANDIDATURE } from '../../lib/candidature-statuts'
import { ajouterCandidature } from '../../lib/candidatures'

/**
 * Bloc « Mon suivi » — pipeline unique de Mes candidatures (cf. migration 040).
 *
 * Utilisé par la fiche formation (PanelFormationPublique) ET le panneau
 * latéral LBA (PanelFormationLBADrawer). Deux modes :
 *   - formationId  : la formation existe en base (fiche formation)
 *   - lbaFormation : formation LBA pas forcément en base — la création du
 *     suivi passe alors par POST /api/formations-lba (snapshot + candidature)
 */
export default function SuiviFormation({ candidatId, formationId: formationIdProp, lbaFormation, insertDefaults, onSuiviChange, style }) {
  const supabase = createClient()

  const [formationId, setFormationId] = useState(formationIdProp || null)
  const [candidature, setCandidature] = useState(null)
  const [action,      setAction]      = useState(null)
  const [showModal,   setShowModal]   = useState(false)
  const [savingStatut, setSavingStatut] = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!candidatId) return
    if (!formationIdProp && !lbaFormation?.lba_id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      // Résout l'id interne : direct (fiche) ou via le snapshot LBA déjà enregistré
      let fid = formationIdProp || null
      if (!fid && lbaFormation?.lba_id) {
        const { data: snap } = await supabase
          .from('formations').select('id')
          .eq('lba_id', lbaFormation.lba_id)
          .maybeSingle()
        fid = snap?.id || null
      }
      if (cancelled) return
      setFormationId(fid)

      if (fid) {
        const { data: cand } = await supabase
          .from('candidat_candidatures').select('*')
          .eq('candidat_id', candidatId).eq('formation_id', fid)
          .maybeSingle()
        if (cancelled) return
        setCandidature(cand || null)
        if (cand) {
          const { data: a } = await supabase
            .from('candidature_actions').select('*')
            .eq('candidat_id', candidatId).eq('candidature_id', cand.id)
            .maybeSingle()
          if (cancelled) return
          setAction(a || null)
        } else {
          setAction(null)
        }
      } else {
        setCandidature(null)
        setAction(null)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [candidatId, formationIdProp, lbaFormation?.lba_id])

  // Crée la candidature si elle n'existe pas encore, sinon la met à jour.
  async function upsertCandidature(patch) {
    if (candidature) {
      const { data, error } = await supabase
        .from('candidat_candidatures')
        .update({ ...patch })
        .eq('id', candidature.id)
        .select().single()
      if (!verifier(error, 'La mise à jour du suivi a échoué.')) return null
      setCandidature(data)
      onSuiviChange?.({ saved: true })
      return data
    }

    // Formation LBA pas encore en base : le POST crée le snapshot + la candidature
    if (!formationId && lbaFormation?.lba_id) {
      const res = await fetch('/api/formations-lba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation: lbaFormation }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[suivi LBA] snapshot error:', json)
        notifierErreur('L\'ajout aux candidatures a échoué.')
        return null
      }
      setFormationId(json.formation_id)
      // Applique le statut/favori demandé sur la candidature fraîchement créée
      const hasPatch = patch && Object.keys(patch).length > 0
      const query = supabase.from('candidat_candidatures')
      const { data, error } = hasPatch
        ? await query.update({ ...patch }).eq('id', json.candidature_id).select().single()
        : await query.select('*').eq('id', json.candidature_id).single()
      if (!verifier(error, 'La mise à jour du suivi a échoué.')) return null
      setCandidature(data)
      onSuiviChange?.({ saved: true })
      return data
    }

    // Formation interne (fiche) : insertion directe
    const { data, error } = await ajouterCandidature(supabase, {
      candidat_id:    candidatId,
      type:           'formation',
      nom_entreprise: insertDefaults?.nom_entreprise || lbaFormation?.ecole_nom || 'École',
      poste:          insertDefaults?.poste || lbaFormation?.nom || 'Formation',
      formation_id:   formationId,
      ...patch,
    })
    if (!verifier(error, 'L\'ajout aux candidatures a échoué.')) return null
    setCandidature(data)
    onSuiviChange?.({ saved: true })
    return data
  }

  // finally garantit que les boutons sont TOUJOURS réactivés, même si
  // l'opération lève une exception (réseau, etc.).
  async function handleStatut(key) {
    if (!candidatId) return
    setSavingStatut(true)
    try {
      await upsertCandidature({ statut: key })
    } catch (err) {
      console.error('[suivi formation] statut', err)
      notifierErreur('La mise à jour du suivi a échoué (problème réseau ?).')
    } finally {
      setSavingStatut(false)
    }
  }

  async function toggleFavori() {
    if (!candidatId) return
    setSavingStatut(true)
    try {
      await upsertCandidature({ favori: !(candidature?.favori) })
    } catch (err) {
      console.error('[suivi formation] favori', err)
      notifierErreur('La mise à jour du favori a échoué (problème réseau ?).')
    } finally {
      setSavingStatut(false)
    }
  }

  async function retirerSuivi() {
    if (!candidature) return
    setSavingStatut(true)
    try {
      const { error } = await supabase.from('candidat_candidatures').delete().eq('id', candidature.id)
      if (verifier(error, 'Le retrait du suivi a échoué.')) {
        setCandidature(null)
        setAction(null) // le rappel est supprimé en cascade côté base
        onSuiviChange?.({ saved: false })
      }
    } catch (err) {
      console.error('[suivi formation] retrait', err)
      notifierErreur('Le retrait du suivi a échoué (problème réseau ?).')
    } finally {
      setSavingStatut(false)
    }
  }

  async function handleSaveAction(payload) {
    if (!candidatId) return
    if (!payload) {
      // Supprimer le rappel
      if (!candidature) return
      const { error } = await supabase.from('candidature_actions').delete()
        .eq('candidat_id', candidatId).eq('candidature_id', candidature.id)
      if (verifier(error, 'La suppression du rappel a échoué.')) setAction(null)
      return
    }
    // Un rappel nécessite une candidature : on la crée au besoin
    const cand = candidature || await upsertCandidature({})
    if (!cand) return
    const { data, error } = await supabase.from('candidature_actions')
      .upsert(
        { candidat_id: candidatId, candidature_id: cand.id, ...payload, fait: false, updated_at: new Date().toISOString() },
        { onConflict: 'candidat_id,candidature_id' }
      )
      .select().single()
    if (!verifier(error, 'L\'enregistrement du rappel a échoué.')) return
    setAction(data)
  }

  if (!candidatId) return null
  if (!formationIdProp && !lbaFormation?.lba_id) return null

  const statut = candidature?.statut || null

  return (
    <div className="s-card" style={{ marginBottom: '1rem', opacity: loading ? 0.6 : 1, ...style }}>

      {showModal && (
        <ActionModal
          action={action}
          onSave={handleSaveAction}
          onClose={() => setShowModal(false)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <i className="ti ti-bookmark" /> Mon suivi
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Favori */}
          <button
            disabled={savingStatut || loading}
            onClick={toggleFavori}
            title={candidature?.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${candidature?.favori ? '#b45309' : 'var(--border)'}`,
              background: candidature?.favori ? '#fef9c3' : 'white',
              color: candidature?.favori ? '#b45309' : 'var(--muted)',
              transition: 'all 0.15s',
            }}
          >
            <i className={`ti ${candidature?.favori ? 'ti-star-filled' : 'ti-star'}`} style={{ fontSize: 12 }} />
            Favori
          </button>
          {candidature && (
            <button
              disabled={savingStatut}
              onClick={retirerSuivi}
              title="Retirer cette formation de mes candidatures"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', textDecoration: 'underline' }}
            >
              Retirer du suivi
            </button>
          )}
        </div>
      </div>

      {/* Statuts — mêmes étapes que Mes candidatures */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          {candidature
            ? 'Statut — visible dans Mes candidatures'
            : 'Choisis un statut pour ajouter cette formation à tes candidatures'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STATUTS_CANDIDATURE.map(s => {
            const active = statut === s.key
            return (
              <button
                key={s.key}
                disabled={savingStatut || loading}
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
  )
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
