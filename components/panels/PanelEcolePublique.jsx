'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

// ── helpers ───────────────────────────────────────────────────────────────────
function initiales(str) {
  return (str || '').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const NIVEAUX = [
  { value: 'cap',    label: 'CAP',                 bg: '#fef9c3', color: '#854d0e' },
  { value: 'bac',    label: 'Bac Pro',             bg: '#ffedd5', color: '#9a3412' },
  { value: 'bts',    label: 'BTS / DEUST',         bg: '#e0f2fe', color: '#0369a1' },
  { value: 'bach',   label: 'Bachelor / Licence',  bg: '#dcfce7', color: '#166534' },
  { value: 'master', label: 'Master / Ingénieur',  bg: '#fce7f3', color: '#9d174d' },
  { value: 'autre',  label: 'Autre',               bg: '#ede9fe', color: '#7c3aed' },
]

function NiveauTag({ value }) {
  const n = NIVEAUX.find(x => x.value === value) || NIVEAUX[4]
  return (
    <span style={{ background: n.bg, color: n.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {n.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── composant principal ───────────────────────────────────────────────────────
export default function PanelEcolePublique({ ecoleId, onBack, onEdit, onNavigateFormation, isAdmin = false, isEntreprise = false }) {
  const supabase = createClient()

  const [ecole, setEcole]           = useState(null)
  const [formations, setFormations] = useState([])
  const [actus, setActus]           = useState([])
  const [topProfils, setTopProfils] = useState([])
  const [loading, setLoading]       = useState(true)
  const [toggling, setToggling]     = useState(false)
  const [niveauFilter, setNiveauFilter] = useState('')

  useEffect(() => {
    if (!ecoleId) return
    async function load() {
      const [{ data: e }, { data: f }, { data: a }] = await Promise.all([
        supabase.from('ecoles').select('*').eq('id', ecoleId).single(),
        supabase.from('formations').select('id,nom,diplome,niveau,modalite,url_onisep,localite_formation').eq('ecole_id', ecoleId).order('nom'),
        supabase.from('ecole_actus').select('*').eq('ecole_id', ecoleId).order('created_at', { ascending: false }).limit(6),
      ])
      setEcole(e)
      setFormations(f || [])
      setActus(a || [])

      // Top profils : seulement si entreprise
      if (isEntreprise || isAdmin) {
        const { data: tp } = await supabase
          .from('ecole_apprentis')
          .select('*, candidat:candidats(prenom, nom, formation, disponibilite)')
          .eq('ecole_id', ecoleId)
          .eq('top_profil', true)
          .limit(6)
        setTopProfils(tp || [])
      }
      setLoading(false)
    }
    load()
  }, [ecoleId])

  async function handleToggle() {
    if (!isAdmin || !ecole) return
    setToggling(true)
    const { data } = await supabase.from('ecoles').update({ publiee: !ecole.publiee }).eq('id', ecole.id).select().single()
    if (data) setEcole(data)
    setToggling(false)
  }

  // diplômes uniques déduits des formations
  const niveauxUniques = [...new Set(formations.map(f => f.niveau).filter(Boolean))]
  const formsFiltrees  = niveauFilter ? formations.filter(f => f.niveau === niveauFilter) : formations

  const BG_COLORS = ['var(--teal-soft)', 'var(--purple-soft)', 'var(--accent-soft)', '#fef9c3']
  const FG_COLORS = ['var(--teal)',      'var(--purple)',      'var(--accent)',       '#92400e']

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
  if (!ecole)  return <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>École introuvable.</div>

  const enLigne = ecole.publiee === true

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── Topbar ── */}
      <div className="topbar" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button className="btn-sm" onClick={onBack}>
              <i className="ti ti-arrow-left" /> Retour
            </button>
          )}
          <div>
            <div className="page-title">Page publique</div>
            <div className="page-sub">{ecole.nom}</div>
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onEdit && (
              <button className="btn-sm purple" onClick={onEdit} style={{ fontSize: 12 }}>
                <i className="ti ti-edit" /> Éditer
              </button>
            )}
            <button
              onClick={handleToggle}
            disabled={toggling}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12,
              background: enLigne ? 'var(--teal-soft)' : '#f1f5f9',
              color:      enLigne ? 'var(--teal)'      : 'var(--muted)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: enLigne ? 'var(--teal)' : '#9ca3af', display: 'inline-block', flexShrink: 0 }} />
            {toggling ? '…' : enLigne ? 'En ligne' : 'Hors ligne'}
          </button>
          </div>
        )}
      </div>

      {/* ── Cover + Avatar ── */}
      <div style={{ position: 'relative', marginBottom: '3.5rem', borderRadius: 16, overflow: 'visible' }}>
        {/* Cover */}
        <div style={{
          height: 200, borderRadius: 16, overflow: 'hidden',
          background: ecole.cover_url
            ? `url(${ecole.cover_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, var(--navy) 0%, var(--purple) 100%)',
        }} />

        {/* Avatar centré sur la cover */}
        <div style={{
          position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)',
          width: 80, height: 80, borderRadius: 20,
          border: '3px solid white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          background: ecole.avatar_url ? `url(${ecole.avatar_url}) center/cover no-repeat` : 'var(--purple-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--purple)',
        }}>
          {!ecole.avatar_url && initiales(ecole.nom)}
        </div>
      </div>

      {/* ── Identité ── */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>
          {ecole.nom}
        </div>
        {ecole.raison_sociale && ecole.raison_sociale !== ecole.nom && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{ecole.raison_sociale}</div>
        )}

        {/* Localisation & contacts */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          {ecole.ville    && <span><i className="ti ti-map-pin" style={{ fontSize: 11 }} /> {ecole.ville}{ecole.region ? ` · ${ecole.region}` : ''}</span>}
          {ecole.telephone && <span><i className="ti ti-phone" style={{ fontSize: 11 }} /> {ecole.telephone}</span>}
          {ecole.email    && <a href={`mailto:${ecole.email}`} style={{ color: 'var(--teal)', textDecoration: 'none' }}><i className="ti ti-mail" style={{ fontSize: 11 }} /> {ecole.email}</a>}
        </div>

        {/* Boutons site + LinkedIn */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {ecole.site_web && (
            <button className="btn-sm" onClick={() => window.open(ecole.site_web.startsWith('http') ? ecole.site_web : 'https://' + ecole.site_web, '_blank')}
              style={{ fontSize: 12 }}>
              <i className="ti ti-world" /> Site web
            </button>
          )}
          {ecole.linkedin && (
            <button className="btn-sm" onClick={() => window.open(ecole.linkedin.startsWith('http') ? ecole.linkedin : 'https://' + ecole.linkedin, '_blank')}
              style={{ fontSize: 12, background: '#e8f0fe', color: '#1d4ed8', border: 'none' }}>
              <i className="ti ti-brand-linkedin" /> LinkedIn
            </button>
          )}
        </div>

        {/* Diplômes proposés */}
        {niveauxUniques.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
            {niveauxUniques.map(n => <NiveauTag key={n} value={n} />)}
            {ecole.qualiopi && (
              <span style={{ background: 'var(--teal-soft)', color: 'var(--teal)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                <i className="ti ti-rosette" style={{ fontSize: 10 }} /> Qualiopi
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Description ── */}
      {ecole.description && (
        <div className="s-card" style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.7, margin: 0 }}>{ecole.description}</p>
        </div>
      )}

      {/* ── Formations + Actualités (2 colonnes) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Formations */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header" style={{ marginBottom: 10 }}>
            <div className="s-card-title"><i className="ti ti-certificate" /> Formations ({formsFiltrees.length})</div>
            <select value={niveauFilter} onChange={e => setNiveauFilter(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }}>
              <option value="">Tous</option>
              {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
            {formsFiltrees.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune formation.</div>
              : formsFiltrees.map((f, i) => (
                <div key={f.id} style={{ padding: '8px 0', borderBottom: i < formsFiltrees.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: onNavigateFormation ? 'var(--teal)' : 'var(--navy)', marginBottom: 3, cursor: onNavigateFormation ? 'pointer' : 'default' }}
                    onClick={() => onNavigateFormation?.(f.id)}
                  >
                    {f.nom}
                    {onNavigateFormation && <i className="ti ti-chevron-right" style={{ fontSize: 11, marginLeft: 4 }} />}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    {f.niveau && <NiveauTag value={f.niveau} />}
                    {f.localite_formation && <span style={{ fontSize: 10, color: 'var(--muted)' }}><i className="ti ti-map-pin" style={{ fontSize: 9 }} /> {f.localite_formation}</span>}
                    {f.modalite && (() => { const MMAP = { presentiel: { label: 'Présentiel', bg: '#e0f2fe', color: '#0369a1', icon: 'ti-building' }, distanciel: { label: 'Distanciel', bg: '#dcfce7', color: '#166534', icon: 'ti-wifi' }, hybride: { label: 'Hybride', bg: '#fef9c3', color: '#854d0e', icon: 'ti-refresh' } }; const m = MMAP[f.modalite]; return m ? <span style={{ background: m.bg, color: m.color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}><i className={`ti ${m.icon}`} style={{ fontSize: 9 }} />{m.label}</span> : null })()}
                    {f.url_onisep && (
                      <span onClick={e => { e.stopPropagation(); window.open(f.url_onisep, '_blank') }}
                        style={{ fontSize: 10, color: 'var(--teal)', cursor: 'pointer', fontWeight: 600 }}>
                        <i className="ti ti-external-link" style={{ fontSize: 9 }} /> ONISEP
                      </span>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Actualités */}
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header" style={{ marginBottom: 10 }}>
            <div className="s-card-title"><i className="ti ti-news" /> Actualités</div>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
            {actus.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune actualité pour le moment.</div>
              : actus.map((a, i) => (
                <div key={a.id} style={{ padding: '10px 0', borderBottom: i < actus.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.4 }}>{a.titre}</div>
                    <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(a.created_at)}</span>
                  </div>
                  {a.contenu && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{a.contenu}</div>}
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Initiatives ── */}
      {ecole.initiatives?.length > 0 && (
        <div className="s-card" style={{ marginBottom: '1rem' }}>
          <div className="s-card-title" style={{ marginBottom: 12 }}><i className="ti ti-stars" /> Initiatives & engagements</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ecole.initiatives.map((init, i) => (
              <div key={i} style={{
                padding: '8px 16px', borderRadius: 12,
                background: BG_COLORS[i % BG_COLORS.length],
                color: FG_COLORS[i % FG_COLORS.length],
                fontSize: 13, fontWeight: 500,
              }}>
                {init}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tops profils (entreprise uniquement) ── */}
      {(isEntreprise || isAdmin) && topProfils.length > 0 && (
        <div className="s-card" style={{ marginBottom: '1rem' }}>
          <div className="s-card-header" style={{ marginBottom: 12 }}>
            <div className="s-card-title"><i className="ti ti-star" style={{ color: 'var(--gold)' }} /> Tops profils</div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Candidats mis en avant par l'école</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {topProfils.map((tp, i) => {
              const c = tp.candidat
              const bg = BG_COLORS[i % BG_COLORS.length]
              const fg = FG_COLORS[i % FG_COLORS.length]
              return (
                <div key={tp.id} style={{ background: 'var(--light)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: bg, color: fg, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {initiales(`${c?.prenom} ${c?.nom}`)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{c?.prenom} {c?.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{c?.formation || '—'}</div>
                  {tp.statut === 'cherche' && (
                    <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20 }}>En recherche</span>
                  )}
                  <button className="btn-sm accent" style={{ fontSize: 11, width: '100%', marginTop: 2 }}>
                    <i className="ti ti-send" /> Contacter
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
