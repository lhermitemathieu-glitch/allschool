'use client'

import { useState } from 'react'

// ── COMPOSANT RÉUTILISABLE : Import CSV ───────────────────────────────────────
function ImportCSV({ titre, sub, colonnes, preview, barColor, btnCls }) {
  const [showPreview, setShowPreview] = useState(false)
  const [progress, setProgress] = useState(null)
  const [pct, setPct] = useState(0)

  function handleFile() { setShowPreview(true); setProgress(null); setPct(0) }

  function runImport() {
    setProgress(0)
    let p = 0
    const iv = setInterval(() => {
      p += Math.floor(Math.random() * 12) + 5
      if (p >= 100) { p = 100; clearInterval(iv) }
      setPct(p)
      setProgress(p)
    }, 160)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">{titre}</div>
          <div className="page-sub">{sub}</div>
        </div>
        <button className={`btn-sm ${btnCls}`}><i className="ti ti-download" /> Modèle CSV</button>
      </div>

      <div className="s-card">
        {/* Colonnes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {colonnes.map((c, i) => (
            <span key={i} className={`csv-col ${c.req ? 'req' : 'opt'}`}>{c.label}{c.req ? ' *' : ''}</span>
          ))}
        </div>

        {/* Dropzone */}
        <label className="dropzone">
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
          <i className="ti ti-file-spreadsheet" />
          <p>Glissez votre CSV ici ou cliquez</p>
          <span>CSV uniquement · max 10 Mo</span>
        </label>

        {/* Preview */}
        {showPreview && (
          <div>
            <div style={{ background: 'var(--light)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{preview.lignes} lignes détectées</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {preview.ok && <span className="row-ok">{preview.ok} OK</span>}
                {preview.warn && <span className="row-warn">{preview.warn} avert.</span>}
                {preview.err && <span className="row-err">{preview.err}</span>}
              </div>
            </div>

            {progress !== null && (
              <div style={{ background: 'white', borderRadius: 10, padding: 12, border: '0.5px solid var(--border)', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>Import en cours…</span>
                  <span>{progress >= 100 ? 'Terminé !' : pct + '%'}</span>
                </div>
                <div className="prog-bar-wrap">
                  <div className="prog-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-sm danger" onClick={() => { setShowPreview(false); setProgress(null) }}>
                <i className="ti ti-x" /> Annuler
              </button>
              <button className={`btn-sm ${btnCls}`} onClick={runImport}>
                <i className="ti ti-check" /> Confirmer l'import
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── VUE D'ENSEMBLE ────────────────────────────────────────────────────────────
export function PanelBackOverview({ onNavigate }) {
  const stats = [
    { num: '14 320', label: 'Apprentis',         color: 'var(--teal)',   trend: '+284 cette semaine', trendColor: 'var(--teal)' },
    { num: '218',    label: 'Écoles',             color: 'var(--purple)', trend: '+6 ce mois',         trendColor: 'var(--teal)' },
    { num: '1 042',  label: 'Entreprises',        color: 'var(--accent)', trend: '+38 ce mois',        trendColor: 'var(--teal)' },
    { num: '3',      label: 'Imports en attente', color: 'var(--gold)',   trend: 'À valider',           trendColor: 'var(--gold)' },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Vue d'ensemble</div>
          <div className="page-sub">État de la base de données Allschool</div>
        </div>
        <button className="btn-sm"><i className="ti ti-refresh" /> Actualiser</button>
      </div>

      <div className="grid4" style={{ marginBottom: '1.25rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
            <span className="stat-num" style={{ color: s.color }}>{s.num}</span>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 11, color: s.trendColor, marginTop: 4 }}>{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid3">
        {/* Apprentis */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-users" /> Derniers apprentis</div>
            <button className="btn-sm teal" style={{ fontSize: 11 }} onClick={() => onNavigate('back-apprentis')}>Importer</button>
          </div>
          {[['TM', 'Thomas Martin', 'Bachelor · Paris'], ['SL', 'Sofia Leblanc', 'BTS · Lyon']].map(([av, nom, meta]) => (
            <div key={nom} className="entry-row">
              <div className="e-av teal">{av}</div>
              <div style={{ flex: 1 }}><div className="e-name">{nom}</div><div className="e-meta">{meta}</div></div>
              <span className="pill gold" style={{ fontSize: 10 }}>CSV</span>
            </div>
          ))}
        </div>

        {/* Écoles */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-school" /> Dernières écoles</div>
            <button className="btn-sm purple" style={{ fontSize: 11 }} onClick={() => onNavigate('back-ecoles')}>Importer</button>
          </div>
          {[['ESG', 'ESG Lyon', 'CFA privé · Lyon'], ['CMA', 'CMA Bordeaux', 'CMA · Bordeaux']].map(([av, nom, meta]) => (
            <div key={nom} className="entry-row">
              <div className="e-av purple">{av}</div>
              <div style={{ flex: 1 }}><div className="e-name">{nom}</div><div className="e-meta">{meta}</div></div>
              <span className="pill gold" style={{ fontSize: 10 }}>CSV</span>
            </div>
          ))}
        </div>

        {/* Entreprises */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-building" /> Dernières entreprises</div>
            <button className="btn-sm accent" style={{ fontSize: 11 }} onClick={() => onNavigate('back-entreprises')}>Importer</button>
          </div>
          {[['OGL', 'Ogilvy Paris', 'Marketing · SIRET ✓', 'gold', 'CSV'], ['BLR', 'Boulangerie Leroux', 'Artisanat · SIRET ✓', '', 'Manuel']].map(([av, nom, meta, pillCls, pill]) => (
            <div key={nom} className="entry-row">
              <div className="e-av accent">{av}</div>
              <div style={{ flex: 1 }}><div className="e-name">{nom}</div><div className="e-meta">{meta}</div></div>
              <span className={`pill ${pillCls}`} style={{ fontSize: 10 }}>{pill}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── IMPORT APPRENTIS ──────────────────────────────────────────────────────────
export function PanelBackApprentis() {
  return (
    <ImportCSV
      titre="Import — Apprentis"
      sub="Importez en masse via CSV"
      btnCls="teal"
      barColor="var(--teal)"
      colonnes={[
        { label: 'nom', req: true }, { label: 'prenom', req: true }, { label: 'email', req: true },
        { label: 'diplome', req: true }, { label: 'ville', req: true },
        { label: 'telephone', req: false }, { label: 'date_naissance', req: false },
        { label: 'ecole_rattachee', req: false }, { label: 'disponibilite', req: false },
        { label: 'secteur', req: false }, { label: 'teletravail', req: false },
      ]}
      preview={{ lignes: '284 lignes', ok: '279 OK', warn: '4 avert.', err: '1 erreur' }}
    />
  )
}

// ── IMPORT ÉCOLES ─────────────────────────────────────────────────────────────
export function PanelBackEcoles() {
  return (
    <ImportCSV
      titre="Import — Écoles"
      sub="Importez en masse via CSV"
      btnCls="purple"
      barColor="var(--purple)"
      colonnes={[
        { label: 'nom_ecole', req: true }, { label: 'type', req: true },
        { label: 'ville', req: true }, { label: 'email_contact', req: true },
        { label: 'siret', req: false }, { label: 'site_web', req: false },
        { label: 'linkedin', req: false }, { label: 'formations', req: false },
        { label: 'qualiopi', req: false }, { label: 'plan', req: false },
      ]}
      preview={{ lignes: '9 lignes', ok: '6 OK', warn: '3 avert.', err: null }}
    />
  )
}

// ── IMPORT ENTREPRISES ────────────────────────────────────────────────────────
export function PanelBackEntreprises() {
  return (
    <ImportCSV
      titre="Import — Entreprises"
      sub="SIRET vérifié automatiquement via l'API INSEE"
      btnCls="accent"
      barColor="var(--accent)"
      colonnes={[
        { label: 'nom_entreprise', req: true }, { label: 'siret', req: true },
        { label: 'email_contact', req: true }, { label: 'ville', req: true },
        { label: 'secteur', req: true },
        { label: 'telephone', req: false }, { label: 'taille', req: false },
        { label: 'contact_nom', req: false }, { label: 'contact_poste', req: false },
      ]}
      preview={{ lignes: '38 lignes', ok: '35 OK', warn: '2 avert.', err: '1 SIRET invalide' }}
    />
  )
}

// ── JOURNAL DES IMPORTS ───────────────────────────────────────────────────────
export function PanelBackLogs() {
  const logs = [
    { type: 'ok',   time: '14 jan. 09:42', msg: 'Import apprentis', file: 'apprentis_jan2025.csv', detail: 'Succès complet',                    badge: '+284',  badgeColor: 'var(--teal)' },
    { type: 'warn', time: '13 jan. 14:15', msg: 'Import écoles',    file: 'ecoles_new.csv',        detail: '3 avertissements (emails manquants)', badge: '+6/9',  badgeColor: 'var(--gold)' },
    { type: 'ok',   time: '12 jan. 11:08', msg: 'Import entreprises', file: 'entreprises_Q1.csv',  detail: 'Succès complet',                    badge: '+38',   badgeColor: 'var(--teal)' },
    { type: 'err',  time: '10 jan. 16:33', msg: 'Import apprentis', file: 'test.csv',              detail: 'Colonnes obligatoires manquantes',   badge: '0/120', badgeColor: 'var(--red)' },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Journal des imports</div>
          <div className="page-sub">Historique de toutes les opérations</div>
        </div>
        <button className="btn-sm danger"><i className="ti ti-trash" /> Vider les logs</button>
      </div>

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-history" /> Activité récente</div>
        </div>
        {logs.map((l, i) => (
          <div key={i} className="log-item">
            <div className={`log-dot ${l.type}`} />
            <div className="log-time">{l.time}</div>
            <div style={{ flex: 1, color: 'var(--navy)' }}>
              {l.msg} — <strong>{l.file}</strong> · {l.detail}
            </div>
            <span style={{ color: l.badgeColor, fontWeight: 500, fontSize: 11 }}>{l.badge}</span>
          </div>
        ))}
      </div>
    </>
  )
}
