'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

const STATUTS = [
  { value: 'admis',           label: 'Admis !',         cls: 'teal' },
  { value: 'en_process',      label: 'En process',      cls: 'accent' },
  { value: 'dossier_envoye',  label: 'Dossier envoyé',  cls: 'gold' },
  { value: 'a_contacter',     label: 'À contacter',     cls: '' },
]

const ETAPES = [
  'Dossier de candidature envoyé',
  'Entretien de motivation passé',
  'En attente de réponse école',
  'Trouver une entreprise',
  'Signature du contrat',
]

const ETAPE_PAR_STATUT = {
  a_contacter:    0,
  dossier_envoye: 1,
  en_process:     2,
  admis:          4,
}

function sigle(nom) {
  return nom.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

export default function PanelCandidatEcoles() {
  const supabase = createClient()

  const [ecoles, setEcoles]       = useState([])
  const [selected, setSelected]   = useState(null)
  const [adding, setAdding]       = useState(false)
  const [form, setForm]           = useState({ nom: '', formation: '', statut: 'a_contacter' })
  const [saving, setSaving]       = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('candidat_ecoles')
      .select('*')
      .eq('candidat_id', user.id)
      .order('created_at', { ascending: true })
    if (data) {
      setEcoles(data)
      if (data.length) setSelected(data[0].id)
    }
  }

  async function handleAdd() {
    if (!form.nom.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('candidat_ecoles')
      .insert({ candidat_id: user.id, nom: form.nom, formation: form.formation, statut: form.statut })
      .select()
      .single()
    if (!error && data) {
      setEcoles((prev) => [...prev, data])
      setSelected(data.id)
      setAdding(false)
      setForm({ nom: '', formation: '', statut: 'a_contacter' })
    }
    setSaving(false)
  }

  async function handleStatut(id, statut) {
    await supabase.from('candidat_ecoles').update({ statut }).eq('id', id)
    setEcoles((prev) => prev.map((e) => e.id === id ? { ...e, statut } : e))
  }

  async function handleDelete(id) {
    await supabase.from('candidat_ecoles').delete().eq('id', id)
    setEcoles((prev) => prev.filter((e) => e.id !== id))
    setSelected((s) => s === id ? null : s)
  }

  const ecoleSelectionnee = ecoles.find((e) => e.id === selected)
  const etapeActuelle = ecoleSelectionnee ? (ETAPE_PAR_STATUT[ecoleSelectionnee.statut] ?? 0) : 0

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes écoles</div>
          <div className="page-sub">Suivi de vos candidatures scolaires</div>
        </div>
        <button className="btn-sm teal" onClick={() => setAdding(true)}>
          <i className="ti ti-plus" /> Ajouter une école
        </button>
      </div>

      {/* Formulaire ajout */}
      {adding && (
        <div className="s-card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input
            placeholder="Nom de l'école"
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            style={inputStyle}
          />
          <input
            placeholder="Formation visée"
            value={form.formation}
            onChange={(e) => setForm((f) => ({ ...f, formation: e.target.value }))}
            style={inputStyle}
          />
          <select
            value={form.statut}
            onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
            style={{ ...inputStyle, width: 'auto' }}
          >
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn-sm teal" onClick={handleAdd} disabled={saving}>
            {saving ? 'Ajout…' : 'Confirmer'}
          </button>
          <button className="btn-sm" onClick={() => setAdding(false)}>Annuler</button>
        </div>
      )}

      {/* Liste écoles */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-school" /> Écoles cibles & avancement</div>
        </div>
        {ecoles.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '0.5rem 0' }}>Aucune école ajoutée pour l'instant.</p>
        )}
        {ecoles.map((e) => {
          const s = STATUTS.find((st) => st.value === e.statut) || STATUTS[3]
          return (
            <div
              key={e.id}
              className="entry-row"
              style={{ cursor: 'pointer', background: selected === e.id ? 'var(--light)' : 'transparent', borderRadius: 8, padding: '6px 4px' }}
              onClick={() => setSelected(e.id)}
            >
              <div className="e-av purple">{sigle(e.nom)}</div>
              <div style={{ flex: 1 }}>
                <div className="e-name">{e.nom}</div>
                <div className="e-meta">{e.formation}</div>
              </div>
              <select
                value={e.statut}
                onChange={(ev) => { ev.stopPropagation(); handleStatut(e.id, ev.target.value) }}
                onClick={(ev) => ev.stopPropagation()}
                style={{ fontSize: 12, border: 'none', background: 'transparent', color: 'var(--navy)', cursor: 'pointer' }}
              >
                {STATUTS.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
              </select>
              <button
                className="btn-sm"
                style={{ fontSize: 11, color: 'var(--red)' }}
                onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Avancement école sélectionnée */}
      {ecoleSelectionnee && (
        <div className="s-card">
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-list-check" /> Avancement — {ecoleSelectionnee.nom}</div>
          </div>
          {ETAPES.map((etape, i) => {
            const done    = i < etapeActuelle
            const current = i === etapeActuelle
            return (
              <div key={i}>
                {i > 0 && <div className="step-line" />}
                <div className="step-row">
                  <div className={`step-dot ${done ? 'done' : current ? 'current' : 'todo'}`}>
                    <i className={`ti ${done ? 'ti-check' : current ? 'ti-clock' : 'ti-circle'}`} />
                  </div>
                  <span style={{ fontSize: 13, color: done ? 'var(--navy)' : current ? 'var(--accent)' : 'var(--muted)', fontWeight: current ? 500 : 400 }}>
                    {etape}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

const inputStyle = {
  flex: 1,
  minWidth: 140,
  padding: '8px 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--navy)',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}
