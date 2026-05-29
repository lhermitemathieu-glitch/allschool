'use client'

import { useState } from 'react'

export default function PanelCandidatCandidatures() {
  const [candidatures, setCandidatures] = useState([
    { initiales: 'OGL', nom: 'Ogilvy Paris', poste: 'Chef de projet digital' },
    { initiales: 'HAV', nom: 'Havas Media', poste: 'Social media manager' },
    { initiales: 'VVN', nom: 'Vivendi', poste: 'Chargé de communication' },
  ])
  const [lien, setLien] = useState('')

  function ajouterCandidature() {
    if (!lien.trim()) return
    const domain = lien.replace(/https?:\/\//, '').split('/')[0].slice(0, 3).toUpperCase() || 'NEW'
    setCandidatures([...candidatures, { initiales: domain, nom: 'Nouvelle candidature', poste: lien.length > 45 ? lien.slice(0, 45) + '…' : lien }])
    setLien('')
  }

  const total = candidatures.length
  const pct = Math.min((total / 10) * 100, 100)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes candidatures entreprises</div>
          <div className="page-sub">{total} entreprises contactées · Badge à 10 !</div>
        </div>
      </div>

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-building" /> Entreprises</div>
          <span style={{ fontSize: 12, background: 'var(--teal-soft)', color: 'var(--teal-mid)', padding: '3px 8px', borderRadius: 100, fontWeight: 500 }}>{total} / 10</span>
        </div>

        {candidatures.map((c, i) => (
          <div className="entry-row" key={i}>
            <div className="e-av accent">{c.initiales}</div>
            <div style={{ flex: 1 }}>
              <div className="e-name">{c.nom}</div>
              <div className="e-meta">{c.poste}</div>
            </div>
            <button className="btn-sm" style={{ fontSize: 11 }}><i className="ti ti-external-link" /> Voir</button>
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

        {/* Ajout */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            type="text"
            value={lien}
            onChange={e => setLien(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ajouterCandidature()}
            placeholder="Coller un lien d'annonce…"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }}
          />
          <button className="btn-sm teal" onClick={ajouterCandidature}>
            <i className="ti ti-plus" /> Ajouter
          </button>
        </div>
      </div>
    </>
  )
}
