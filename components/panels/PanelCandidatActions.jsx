'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

function formatDate(echeance) {
  return new Date(echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function urgence(echeance) {
  if (!echeance) return 'normal'
  const today = new Date(new Date().toDateString())
  const date  = new Date(echeance)
  if (date < today) return 'retard'
  if (date.getTime() === today.getTime()) return 'aujourd_hui'
  const diff = (date - today) / (1000 * 60 * 60 * 24)
  if (diff <= 3) return 'proche'
  return 'normal'
}

const URGENCE_CONFIG = {
  retard:      { label: 'En retard',     color: '#dc2626', bg: '#fee2e2' },
  aujourd_hui: { label: "Aujourd'hui",   color: '#d97706', bg: '#fef3c7' },
  proche:      { label: 'Dans 3 jours',  color: '#0369a1', bg: '#e0f2fe' },
  normal:      { label: null,            color: 'var(--muted)', bg: 'transparent' },
}

export default function PanelCandidatActions({ onNavigateFormation }) {
  const supabase = createClient()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: formActs }, { data: candActs }] = await Promise.all([
      supabase.from('formation_actions')
        .select('*, formations(id, nom, niveau, ecole_id, ecoles(nom, ville))')
        .eq('candidat_id', user.id)
        .eq('fait', false)
        .order('echeance', { ascending: true, nullsFirst: false }),
      supabase.from('candidature_actions')
        .select('*, candidat_candidatures(id, nom_entreprise, poste, type)')
        .eq('candidat_id', user.id)
        .eq('fait', false)
        .order('echeance', { ascending: true, nullsFirst: false }),
    ])

    const formation  = (formActs  || []).map(r => ({ ...r, _type: 'formation' }))
    const candidature = (candActs || []).map(r => ({ ...r, _type: 'candidature' }))
    const all = [...formation, ...candidature].sort((a, b) => {
      if (!a.echeance && !b.echeance) return 0
      if (!a.echeance) return 1
      if (!b.echeance) return -1
      return new Date(a.echeance) - new Date(b.echeance)
    })
    setRows(all)
    setLoading(false)
  }

  async function handleMarquerFait(id, type) {
    setMarkingId(id)
    const table = type === 'candidature' ? 'candidature_actions' : 'formation_actions'
    await supabase.from(table).update({ fait: true, updated_at: new Date().toISOString() }).eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
    setMarkingId(null)
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>

  // Grouper : en retard / aujourd'hui / à venir / sans date
  const groupes = [
    { key: 'retard',      label: 'En retard',     items: rows.filter(r => urgence(r.echeance) === 'retard') },
    { key: 'aujourd_hui', label: "Aujourd'hui",   items: rows.filter(r => urgence(r.echeance) === 'aujourd_hui') },
    { key: 'proche',      label: 'Dans 3 jours',  items: rows.filter(r => urgence(r.echeance) === 'proche') },
    { key: 'normal',      label: 'À venir',        items: rows.filter(r => urgence(r.echeance) === 'normal' && r.echeance) },
    { key: 'sans_date',   label: 'Sans échéance',  items: rows.filter(r => !r.echeance) },
  ].filter(g => g.items.length > 0)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes actions</div>
          <div className="page-sub">
            {rows.length === 0
              ? 'Aucune action en cours'
              : `${rows.length} action${rows.length > 1 ? 's' : ''} à faire`}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="s-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <i className="ti ti-bell" style={{ fontSize: 32, color: 'var(--muted)', display: 'block', marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Aucune action à faire pour le moment.</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Fixe des actions depuis les fiches formation pour les retrouver ici.</div>
        </div>
      ) : (
        groupes.map(groupe => {
          const cfg = URGENCE_CONFIG[groupe.key] || URGENCE_CONFIG.normal
          return (
            <div key={groupe.key} style={{ marginBottom: '1.25rem' }}>
              {/* En-tête */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {cfg.bg !== 'transparent' ? (
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                    {groupe.label}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{groupe.label}</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{groupe.items.length}</span>
              </div>

              <div className="s-card" style={{ padding: 0, overflow: 'hidden' }}>
                {groupe.items.map((row, i) => {
                  const u = urgence(row.echeance)
                  const ucfg = URGENCE_CONFIG[u]
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                        borderBottom: i < groupe.items.length - 1 ? '0.5px solid var(--border)' : 'none',
                      }}
                    >
                      {/* Icone */}
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: ucfg.bg !== 'transparent' ? ucfg.bg : 'var(--light)', color: ucfg.bg !== 'transparent' ? ucfg.color : 'var(--muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <i className="ti ti-bell" />
                      </div>

                      {/* Contenu */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{row.texte}</div>
                        {row._type === 'formation' ? (
                          <div
                            style={{ fontSize: 12, color: 'var(--teal)', cursor: 'pointer', marginTop: 2 }}
                            onClick={() => onNavigateFormation?.(row.formation_id)}
                          >
                            {row.formations?.nom || 'Formation'}{row.formations?.ecoles?.nom ? ` · ${row.formations.ecoles.nom}` : ''}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-certificate" style={{ fontSize: 11 }} />
                            {row.candidat_candidatures?.nom_entreprise || 'Candidature'}
                            {row.candidat_candidatures?.poste ? ` · ${row.candidat_candidatures.poste}` : ''}
                          </div>
                        )}
                        {row.echeance && (
                          <div style={{ fontSize: 11, color: ucfg.color, marginTop: 3, fontWeight: u !== 'normal' ? 600 : 400 }}>
                            <i className="ti ti-calendar" style={{ marginRight: 3 }} />
                            {formatDate(row.echeance)}
                          </div>
                        )}
                      </div>

                      {/* Bouton fait */}
                      <button
                        className="btn-sm teal"
                        style={{ fontSize: 11, flexShrink: 0 }}
                        disabled={markingId === row.id}
                        onClick={() => handleMarquerFait(row.id, row._type)}
                      >
                        <i className="ti ti-check" /> {markingId === row.id ? '…' : 'Fait'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </>
  )
}
