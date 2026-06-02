'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

// ── Parseur CSV léger ─────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}

// ── COMPOSANT RÉUTILISABLE : Import CSV ───────────────────────────────────────
function ImportCSV({ titre, sub, type, colonnes, barColor, btnCls, onImported }) {
  const [showPreview, setShowPreview] = useState(false)
  const [progress, setProgress]       = useState(null)
  const [pct, setPct]                 = useState(0)
  const [parsedRows, setParsedRows]   = useState([])
  const [filename, setFilename]       = useState('')
  const [result, setResult]           = useState(null)
  const [importing, setImporting]     = useState(false)

  const required = colonnes.filter(c => c.req).map(c => c.label)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFilename(file.name)
    setResult(null)
    setProgress(null)
    setPct(0)
    const reader = new FileReader()
    reader.onload = ev => {
      const { rows } = parseCSV(ev.target.result)
      setParsedRows(rows)
      setShowPreview(true)
    }
    reader.readAsText(file)
  }

  function countStats() {
    let ok = 0, warn = 0, errors = 0
    for (const row of parsedRows) {
      const missing = required.filter(k => !row[k]?.trim())
      if (missing.length > 0) errors++
      else if (colonnes.filter(c => !c.req).some(c => !row[c.label]?.trim())) warn++
      else ok++
    }
    return { ok, warn, errors }
  }

  async function runImport() {
    setImporting(true)
    setProgress(0)
    // Animation pendant la requête
    let p = 0
    const iv = setInterval(() => {
      p = Math.min(p + 8, 85)
      setPct(p)
    }, 150)

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, filename, rows: parsedRows }),
      })
      clearInterval(iv)
      setPct(100)
      setProgress(100)
      const data = await res.json()
      if (!res.ok) {
        setResult({ error: data.error })
      } else {
        setResult(data)
        onImported?.()
      }
    } catch (err) {
      clearInterval(iv)
      setResult({ error: err.message })
    }
    setImporting(false)
  }

  const stats = showPreview ? countStats() : null

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {colonnes.map((c, i) => (
            <span key={i} className={`csv-col ${c.req ? 'req' : 'opt'}`}>{c.label}{c.req ? ' *' : ''}</span>
          ))}
        </div>

        <label className="dropzone">
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
          <i className="ti ti-file-spreadsheet" />
          <p>Glissez votre CSV ici ou cliquez</p>
          <span>CSV uniquement · max 10 Mo</span>
        </label>

        {showPreview && stats && (
          <div>
            <div style={{ background: 'var(--light)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{parsedRows.length} lignes détectées — {filename}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {stats.ok    > 0 && <span className="row-ok">{stats.ok} OK</span>}
                {stats.warn  > 0 && <span className="row-warn">{stats.warn} avert.</span>}
                {stats.errors > 0 && <span className="row-err">{stats.errors} erreur{stats.errors > 1 ? 's' : ''}</span>}
              </div>
            </div>

            {progress !== null && (
              <div style={{ background: 'white', borderRadius: 10, padding: 12, border: '0.5px solid var(--border)', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>{result?.error ? 'Erreur' : pct < 100 ? 'Import en cours…' : 'Terminé !'}</span>
                  <span>{pct}%</span>
                </div>
                <div className="prog-bar-wrap">
                  <div className="prog-bar-fill" style={{ width: `${pct}%`, background: result?.error ? 'var(--red, #e53e3e)' : barColor }} />
                </div>
                {result?.error && <div style={{ fontSize: 12, color: 'var(--red, #e53e3e)', marginTop: 6 }}>{result.error}</div>}
                {result && !result.error && (
                  <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 6 }}>
                    {result.inserted} ligne{result.inserted !== 1 ? 's' : ''} insérée{result.inserted !== 1 ? 's' : ''} · {result.warn} avertissement{result.warn !== 1 ? 's' : ''} · {result.errors} ignorée{result.errors !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            {!result && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-sm danger" onClick={() => { setShowPreview(false); setProgress(null); setParsedRows([]) }}>
                  <i className="ti ti-x" /> Annuler
                </button>
                <button className={`btn-sm ${btnCls}`} onClick={runImport} disabled={importing || stats.ok + stats.warn === 0}>
                  <i className="ti ti-check" /> Confirmer l'import ({stats.ok + stats.warn} lignes)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── VUE D'ENSEMBLE ────────────────────────────────────────────────────────────
export function PanelBackOverview({ onNavigate }) {
  const supabase = createClient()
  const [counts, setCounts]   = useState({ candidats: 0, ecoles: 0, entreprises: 0, logsEnAttente: 0 })
  const [recent, setRecent]   = useState({ candidats: [], ecoles: [], entreprises: [] })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [
      { count: cCand },
      { count: cEcol },
      { count: cEntr },
      { data: lastCand },
      { data: lastEcol },
      { data: lastEntr },
      { data: lastLogs },
    ] = await Promise.all([
      supabase.from('candidats').select('*', { count: 'exact', head: true }),
      supabase.from('ecoles').select('*', { count: 'exact', head: true }),
      supabase.from('entreprises').select('*', { count: 'exact', head: true }),
      supabase.from('candidats').select('prenom, nom, formation, ville').order('updated_at', { ascending: false }).limit(3),
      supabase.from('ecoles').select('nom, type_ecole, ville').order('created_at', { ascending: false }).limit(3),
      supabase.from('entreprises').select('raison_sociale, secteur, ville, source').order('created_at', { ascending: false }).limit(3),
      supabase.from('import_logs').select('id').order('created_at', { ascending: false }).limit(10),
    ])
    setCounts({ candidats: cCand ?? 0, ecoles: cEcol ?? 0, entreprises: cEntr ?? 0, logsEnAttente: lastLogs?.length ?? 0 })
    setRecent({ candidats: lastCand || [], ecoles: lastEcol || [], entreprises: lastEntr || [] })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function initiales(str) {
    return (str || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?'
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Vue d'ensemble</div>
          <div className="page-sub">État de la base de données Allschool</div>
        </div>
        <button className="btn-sm" onClick={load}><i className="ti ti-refresh" /> Actualiser</button>
      </div>

      <div className="grid4" style={{ marginBottom: '1.25rem' }}>
        {[
          { num: loading ? '…' : counts.candidats.toLocaleString('fr-FR'),   label: 'Candidats',          color: 'var(--teal)'   },
          { num: loading ? '…' : counts.ecoles.toLocaleString('fr-FR'),      label: 'Écoles',             color: 'var(--purple)' },
          { num: loading ? '…' : counts.entreprises.toLocaleString('fr-FR'), label: 'Entreprises',        color: 'var(--accent)' },
          { num: loading ? '…' : counts.logsEnAttente,                       label: 'Derniers imports',   color: 'var(--gold)'   },
        ].map((s, i) => (
          <div key={i} className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
            <span className="stat-num" style={{ color: s.color }}>{s.num}</span>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid3">
        {/* Candidats */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-users" /> Derniers candidats</div>
            <button className="btn-sm teal" style={{ fontSize: 11 }} onClick={() => onNavigate('back-apprentis')}>Importer</button>
          </div>
          {recent.candidats.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Aucun candidat.</div>
            : recent.candidats.map((c, i) => (
              <div key={i} className="entry-row">
                <div className="e-av teal">{initiales(`${c.prenom} ${c.nom}`)}</div>
                <div style={{ flex: 1 }}>
                  <div className="e-name">{c.prenom} {c.nom}</div>
                  <div className="e-meta">{[c.formation, c.ville].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Écoles */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-school" /> Dernières écoles</div>
            <button className="btn-sm purple" style={{ fontSize: 11 }} onClick={() => onNavigate('back-ecoles')}>Importer</button>
          </div>
          {recent.ecoles.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Aucune école.</div>
            : recent.ecoles.map((e, i) => (
              <div key={i} className="entry-row">
                <div className="e-av purple">{initiales(e.nom)}</div>
                <div style={{ flex: 1 }}>
                  <div className="e-name">{e.nom}</div>
                  <div className="e-meta">{[e.type_ecole, e.ville].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Entreprises */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-building" /> Dernières entreprises</div>
            <button className="btn-sm accent" style={{ fontSize: 11 }} onClick={() => onNavigate('back-entreprises')}>Importer</button>
          </div>
          {recent.entreprises.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Aucune entreprise.</div>
            : recent.entreprises.map((e, i) => (
              <div key={i} className="entry-row">
                <div className="e-av accent">{initiales(e.raison_sociale)}</div>
                <div style={{ flex: 1 }}>
                  <div className="e-name">{e.raison_sociale}</div>
                  <div className="e-meta">{[e.secteur, e.ville].filter(Boolean).join(' · ')}</div>
                </div>
                {e.source === 'csv' && <span className="pill gold" style={{ fontSize: 10 }}>CSV</span>}
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}

// ── IMPORT APPRENTIS ──────────────────────────────────────────────────────────
export function PanelBackApprentis({ onImported }) {
  return (
    <ImportCSV
      titre="Import — Candidats"
      sub="Importez des profils en masse via CSV"
      type="apprentis"
      btnCls="teal"
      barColor="var(--teal)"
      onImported={onImported}
      colonnes={[
        { label: 'nom', req: true }, { label: 'prenom', req: true }, { label: 'email', req: true },
        { label: 'diplome', req: true }, { label: 'ville', req: true },
        { label: 'telephone', req: false }, { label: 'date_naissance', req: false },
        { label: 'ecole_rattachee', req: false }, { label: 'disponibilite', req: false },
        { label: 'secteur', req: false }, { label: 'teletravail', req: false },
      ]}
    />
  )
}

// ── IMPORT ÉCOLES ─────────────────────────────────────────────────────────────
export function PanelBackEcoles({ onImported }) {
  return (
    <ImportCSV
      titre="Import — Écoles"
      sub="Importez des établissements en masse via CSV"
      type="ecoles"
      btnCls="purple"
      barColor="var(--purple)"
      onImported={onImported}
      colonnes={[
        { label: 'nom_ecole', req: true }, { label: 'type', req: true },
        { label: 'ville', req: true }, { label: 'email_contact', req: true },
        { label: 'siret', req: false }, { label: 'site_web', req: false },
        { label: 'linkedin', req: false }, { label: 'formations', req: false },
        { label: 'qualiopi', req: false }, { label: 'plan', req: false },
      ]}
    />
  )
}

// ── IMPORT ENTREPRISES ────────────────────────────────────────────────────────
export function PanelBackEntreprises({ onImported }) {
  return (
    <ImportCSV
      titre="Import — Entreprises"
      sub="SIRET vérifié automatiquement via l'API INSEE"
      type="entreprises"
      btnCls="accent"
      barColor="var(--accent)"
      onImported={onImported}
      colonnes={[
        { label: 'nom_entreprise', req: true }, { label: 'siret', req: true },
        { label: 'email_contact', req: true }, { label: 'ville', req: true },
        { label: 'secteur', req: true },
        { label: 'telephone', req: false }, { label: 'taille', req: false },
        { label: 'contact_nom', req: false }, { label: 'contact_poste', req: false },
      ]}
    />
  )
}

// ── JOURNAL DES IMPORTS ───────────────────────────────────────────────────────
export function PanelBackLogs() {
  const supabase = createClient()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('import_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleClear() {
    await supabase.from('import_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setLogs([])
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function logType(l) {
    if (l.errors_count > 0 && l.ok === 0) return 'err'
    if (l.warn > 0 || l.errors_count > 0)  return 'warn'
    return 'ok'
  }

  const LABEL = { apprentis: 'Import candidats', ecoles: 'Import écoles', entreprises: 'Import entreprises' }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Journal des imports</div>
          <div className="page-sub">Historique de toutes les opérations</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn-sm" onClick={load}><i className="ti ti-refresh" /></button>
          <button className="btn-sm danger" onClick={handleClear}><i className="ti ti-trash" /> Vider les logs</button>
        </div>
      </div>

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-history" /> Activité récente</div>
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chargement…</div>
        ) : logs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun import enregistré.</div>
        ) : logs.map((l, i) => {
          const type = logType(l)
          const badge = l.ok + l.warn > 0 ? `+${l.ok + l.warn}/${l.total}` : `0/${l.total}`
          const badgeColor = type === 'err' ? 'var(--red, #e53e3e)' : type === 'warn' ? 'var(--gold)' : 'var(--teal)'
          return (
            <div key={l.id} className="log-item">
              <div className={`log-dot ${type}`} />
              <div className="log-time">{fmtDate(l.created_at)}</div>
              <div style={{ flex: 1, color: 'var(--navy)' }}>
                {LABEL[l.type] || l.type} — <strong>{l.filename || 'fichier inconnu'}</strong>
                {l.errors_count > 0 && ` · ${l.errors_count} ignorée${l.errors_count > 1 ? 's' : ''}`}
                {l.warn        > 0 && ` · ${l.warn} avert.`}
              </div>
              <span style={{ color: badgeColor, fontWeight: 500, fontSize: 11 }}>{badge}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}
