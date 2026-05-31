'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

function sigle(nom) {
  return nom.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3) || '?'
}

export default function PanelCandidatCandidatures() {
  const supabase = createClient()

  const [candidatures, setCandidatures] = useState([])
  const [lien, setLien]                 = useState('')
  const [nom, setNom]                   = useState('')
  const [poste, setPoste]               = useState('')
  const [adding, setAdding]             = useState(false)
  const [saving, setSaving]             = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('candidat_candidatures')
      .select('*')
      .eq('candidat_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setCandidatures(data)
  }

  async function handleAdd() {
    if (!nom.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('candidat_candidatures')
      .insert({ candidat_id: user.id, nom, poste, lien })
      .select()
      .single()
    if (!error && data) {
      setCandidatures((prev) => [...prev, data])
      setNom(''); setPoste(''); setLien(''); setAdding(false)
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('candidat_candidatures').delete().eq('id', id)
    setCandidatures((prev) => prev.filter((c) => c.id !== id))
  }

  const total = candidatures.length
  const pct   = Math.min((total / 10) * 100, 100)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes candidatures entreprises</div>
          <div className="page-sub">{total} entreprise{total > 1 ? 's' : ''} contactée{total > 1 ? 's' : ''} · Badge à 10 !</div>
        </div>
        <button className="btn-sm teal" onClick={() => setAdding((v) => !v)}>
          <i className="ti ti-plus" /> Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {adding && (
        <div className="s-card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input
            placeholder="Nom de l'entreprise *"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Poste visé"
            value={poste}
            onChange={(e) => setPoste(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Lien de l'annonce (optionnel)"
            value={lien}
            onChange={(e) => setLien(e.target.value)}
            style={inputStyle}
          />
          <button className="btn-sm teal" onClick={handleAdd} disabled={saving || !nom.trim()}>
            {saving ? 'Ajout…' : 'Confirmer'}
          </button>
          <button className="btn-sm" onClick={() => setAdding(false)}>Annuler</button>
        </div>
      )}

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-building" /> Entreprises</div>
          <span style={{ fontSize: 12, background: 'var(--teal-soft)', color: 'var(--teal-mid)', padding: '3px 8px', borderRadius: 100, fontWeight: 500 }}>
            {total} / 10
          </span>
        </div>

        {candidatures.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '0.5rem 0' }}>Aucune candidature pour l'instant.</p>
        )}

        {candidatures.map((c) => (
          <div className="entry-row" key={c.id}>
            <div className="e-av accent">{sigle(c.nom)}</div>
            <div style={{ flex: 1 }}>
              <div className="e-name">{c.nom}</div>
              <div className="e-meta">{c.poste || '—'}</div>
            </div>
            {c.lien && (
              <a href={c.lien} target="_blank" rel="noopener noreferrer" className="btn-sm" style={{ fontSize: 11, textDecoration: 'none' }}>
                <i className="ti ti-external-link" /> Voir
              </a>
            )}
            <button
              className="btn-sm"
              style={{ fontSize: 11, color: 'var(--red)' }}
              onClick={() => handleDelete(c.id)}
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        ))}

        {/* Barre de progression */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Prochain badge à 10 candidatures</span>
            <span style={{ fontWeight: 500, color: 'var(--gold)' }}>{total}/10</span>
          </div>
          <div className="prog-bar-wrap">
            <div className="prog-bar-fill" style={{ width: `${pct}%`, background: 'var(--gold)' }} />
          </div>
        </div>
      </div>
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
