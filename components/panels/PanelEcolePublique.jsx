'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

function initiales(str) {
  return (str || '').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const NIVEAUX = [
  { value: 'cap',    label: 'CAP / Bac Pro' },
  { value: 'bts',    label: 'BTS / DEUST' },
  { value: 'bach',   label: 'Bachelor / Licence' },
  { value: 'master', label: 'Master / Ingénieur' },
  { value: 'autre',  label: 'Autre' },
]

function DiploTag({ value }) {
  const found = NIVEAUX.find(n => n.value === value)
  const label = found?.label || value
  const l = label.toLowerCase()
  let bg = '#ede9fe', color = '#7c3aed'
  if (l.includes('bts') || l.includes('deust'))                { bg = '#e0f2fe'; color = '#0369a1' }
  else if (l.includes('cap') || l.includes('bac'))             { bg = '#fef9c3'; color = '#854d0e' }
  else if (l.includes('bachelor') || l.includes('licence'))    { bg = '#dcfce7'; color = '#166534' }
  else if (l.includes('master') || l.includes('ingénieur'))    { bg = '#fce7f3'; color = '#9d174d' }
  return (
    <span style={{ background: bg, color, fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function PanelEcolePublique({ ecoleId, onBack, isAdmin = false }) {
  const supabase = createClient()

  const [ecole, setEcole]         = useState(null)
  const [formations, setFormations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [toggling, setToggling]   = useState(false)
  const [niveau, setNiveau]       = useState('')

  useEffect(() => {
    if (!ecoleId) return
    async function load() {
      const [{ data: e }, { data: f }] = await Promise.all([
        supabase.from('ecoles').select('*').eq('id', ecoleId).single(),
        supabase.from('formations').select('id, nom, diplome, niveau, url_onisep, localite_formation').eq('ecole_id', ecoleId).order('nom'),
      ])
      setEcole(e)
      setFormations(f || [])
      setLoading(false)
    }
    load()
  }, [ecoleId])

  async function handleToggle() {
    if (!isAdmin || !ecole) return
    setToggling(true)
    const { data } = await supabase
      .from('ecoles')
      .update({ publiee: !ecole.publiee })
      .eq('id', ecole.id)
      .select()
      .single()
    if (data) setEcole(data)
    setToggling(false)
  }

  const formationsFiltrees = niveau
    ? formations.filter(f => f.niveau === niveau)
    : formations

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
  if (!ecole)  return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>École introuvable.</div>

  const enLigne = ecole.publiee === true

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button className="btn-sm" onClick={onBack} style={{ fontSize: 11 }}>
              <i className="ti ti-arrow-left" /> Retour
            </button>
          )}
          <div>
            <div className="page-title">Page publique · {ecole.nom}</div>
            <div className="page-sub">Visible par les candidats et les entreprises</div>
          </div>
        </div>

        {isAdmin && (
          <button
            className={`btn-sm ${enLigne ? 'teal' : ''}`}
            onClick={handleToggle}
            disabled={toggling}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: enLigne ? 'var(--teal-soft)' : 'var(--light)',
              color: enLigne ? 'var(--teal)' : 'var(--muted)',
              border: `1px solid ${enLigne ? 'var(--teal)' : 'var(--border)'}`,
              fontWeight: 600, fontSize: 12, padding: '6px 14px', borderRadius: 20,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: enLigne ? 'var(--teal)' : '#9ca3af',
              display: 'inline-block',
            }} />
            {toggling ? '…' : enLigne ? 'En ligne' : 'Hors ligne'}
          </button>
        )}
      </div>

      {/* Header école */}
      <div className="s-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: 12, flexShrink: 0,
            background: 'var(--purple-soft)', color: 'var(--purple)',
            fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {initiales(ecole.nom)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>
              {ecole.nom}
            </div>
            {ecole.raison_sociale && ecole.raison_sociale !== ecole.nom && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{ecole.raison_sociale}</div>
            )}

            {/* Pills localisation */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {ecole.ville    && <span className="pill"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {ecole.ville}</span>}
              {ecole.region   && <span className="pill">{ecole.region}</span>}
              {ecole.academie && <span className="pill">Acad. {ecole.academie}</span>}
              {ecole.type_ecole && <span className="pill purple">{ecole.type_ecole}</span>}
              {ecole.qualiopi && <span className="pill teal">Qualiopi</span>}
              {ecole.uai      && <span className="pill" style={{ fontSize: 10, color: 'var(--muted)' }}>UAI {ecole.uai}</span>}
            </div>

            {/* Contacts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
              {ecole.adresse && (
                <span>
                  <i className="ti ti-map" style={{ fontSize: 11 }} /> {ecole.adresse}
                  {ecole.code_postal ? ', ' + ecole.code_postal : ''}
                </span>
              )}
              {ecole.telephone && (
                <span><i className="ti ti-phone" style={{ fontSize: 11 }} /> {ecole.telephone}</span>
              )}
              {ecole.email && (
                <a href={`mailto:${ecole.email}`} style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                  <i className="ti ti-mail" style={{ fontSize: 11 }} /> {ecole.email}
                </a>
              )}
              {ecole.site_web && (
                <span
                  style={{ color: 'var(--purple)', cursor: 'pointer' }}
                  onClick={() => window.open(ecole.site_web.startsWith('http') ? ecole.site_web : 'https://' + ecole.site_web, '_blank')}
                >
                  <i className="ti ti-world" style={{ fontSize: 11 }} /> {ecole.site_web}
                </span>
              )}
            </div>

            {ecole.description && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--navy)', lineHeight: 1.65 }}>
                {ecole.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formations */}
      <div className="s-card">
        <div className="s-card-header" style={{ marginBottom: 12 }}>
          <div className="s-card-title">
            <i className="ti ti-certificate" /> Formations ({formationsFiltrees.length}
            {niveau ? ` sur ${formations.length}` : ''})
          </div>
          <select
            value={niveau}
            onChange={e => setNiveau(e.target.value)}
            style={{
              padding: '5px 10px', borderRadius: 8, border: '0.5px solid var(--border)',
              background: 'var(--light)', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
              color: 'var(--navy)', outline: 'none',
            }}
          >
            <option value="">Tous les niveaux</option>
            {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>

        {formationsFiltrees.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '1rem 0' }}>Aucune formation pour ce filtre.</div>
        ) : formationsFiltrees.map((f, i) => (
          <div
            key={f.id}
            style={{
              padding: '10px 0',
              borderBottom: i < formationsFiltrees.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{f.nom}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              {f.niveau  && <DiploTag value={f.niveau} />}
              {f.diplome && f.diplome !== f.nom && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.diplome}</span>
              )}
              {f.localite_formation && (
                <span className="pill" style={{ fontSize: 10 }}>
                  <i className="ti ti-map-pin" style={{ fontSize: 9 }} /> {f.localite_formation}
                </span>
              )}
              {f.url_onisep && (
                <span
                  className="pill teal"
                  style={{ fontSize: 10, cursor: 'pointer' }}
                  onClick={() => window.open(f.url_onisep, '_blank')}
                >
                  <i className="ti ti-external-link" style={{ fontSize: 9 }} /> ONISEP
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
