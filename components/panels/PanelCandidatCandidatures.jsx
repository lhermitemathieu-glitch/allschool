'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import { TYPES, typeInfo } from '../../lib/offre-types'

const STATUTS = [
  { key: 'a_faire',   label: 'À faire',             color: '#0369a1',       bg: '#e0f2fe' },
  { key: 'envoyee',   label: 'Candidature envoyée', color: 'var(--teal)',   bg: 'var(--teal-soft)' },
  { key: 'entretien', label: 'Entretien',            color: 'var(--accent)', bg: '#fff3e0' },
  { key: 'admis',     label: 'Admis',               color: '#15803d',       bg: '#dcfce7' },
  { key: 'archive',   label: 'Archivé',              color: '#9e9e9e',       bg: '#f5f5f5' },
]

function statutInfo(key) { return STATUTS.find(s => s.key === key) || STATUTS[0] }

function sigle(nom) {
  return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const TYPES_OFFRES     = TYPES.filter(t => t.key !== 'formation' && t.key !== 'ecole')
const TYPES_FORMATIONS = TYPES.filter(t => t.key === 'formation')

const EMPTY_FORM = { nom_entreprise: '', poste: '', url: '', type: 'externe', statut: 'a_faire', notes: '' }

function isOverdue(echeance) {
  if (!echeance) return false
  return new Date(echeance) < new Date(new Date().toDateString())
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ActionModal({ action, onSave, onClose }) {
  const [texte,    setTexte]    = useState(action?.texte || '')
  const [echeance, setEcheance] = useState(action?.echeance || '')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    if (!texte.trim()) return
    setSaving(true)
    await onSave({ texte: texte.trim(), echeance: echeance || null })
    setSaving(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,27,46,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 24, width: 360, boxShadow: '0 8px 40px rgba(14,27,46,0.15)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>
          <i className="ti ti-bell" style={{ marginRight: 8, color: 'var(--teal)' }} />
          {action ? 'Modifier le rappel' : 'Fixer un rappel'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Prochaine action *</div>
        <input
          autoFocus
          value={texte}
          onChange={e => setTexte(e.target.value)}
          placeholder="Ex : Relancer l'école, préparer un dossier…"
          style={{ ...inputStyle, width: '100%', marginBottom: 12, boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Échéance (optionnelle)</div>
        <input
          type="date"
          value={echeance}
          onChange={e => setEcheance(e.target.value)}
          style={{ ...inputStyle, width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm teal" onClick={handleSave} disabled={saving || !texte.trim()} style={{ flex: 1 }}>
            {saving ? '…' : action ? 'Mettre à jour' : 'Enregistrer'}
          </button>
          <button className="btn-sm" onClick={onClose}>Annuler</button>
          {action && (
            <button className="btn-sm" style={{ color: 'var(--red)' }} onClick={() => onSave(null)}>
              <i className="ti ti-trash" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PanelCandidatCandidatures({ onNavigateEcole, onNavigateFormation }) {
  const supabase = createClient()

  const [items,       setItems]       = useState([])
  const [actions,     setActions]     = useState({}) // { candidature_id: action }
  const [onglet,      setOnglet]      = useState('offres')
  const [view,        setView]        = useState('liste')
  const [adding,      setAdding]      = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [filterSt,    setFilterSt]    = useState('all')
  const [actionModal, setActionModal] = useState(null) // candidature_id en cours

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: candidatures }, { data: acts }] = await Promise.all([
      supabase.from('candidat_candidatures')
        .select('*, formations(id, nom, ecoles(id, nom, ville, region))')
        .eq('candidat_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('candidature_actions')
        .select('*')
        .eq('candidat_id', user.id)
        .eq('fait', false),
    ])
    if (candidatures) setItems(candidatures)
    if (acts) {
      const map = {}
      acts.forEach(a => { map[a.candidature_id] = a })
      setActions(map)
    }
  }

  async function handleSaveAction(candidatureId, payload) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (payload === null) {
      // Supprimer
      await supabase.from('candidature_actions').delete().eq('candidat_id', user.id).eq('candidature_id', candidatureId)
      setActions(prev => { const n = { ...prev }; delete n[candidatureId]; return n })
    } else {
      const existing = actions[candidatureId]
      if (existing) {
        const { data } = await supabase.from('candidature_actions').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single()
        if (data) setActions(prev => ({ ...prev, [candidatureId]: data }))
      } else {
        const { data } = await supabase.from('candidature_actions').insert({ ...payload, candidat_id: user.id, candidature_id: candidatureId }).select().single()
        if (data) setActions(prev => ({ ...prev, [candidatureId]: data }))
      }
    }
    setActionModal(null)
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, type: onglet === 'formations' ? 'formation' : 'externe' })
    setAdding(true)
  }

  function openEdit(item) {
    setEditing(item.id)
    setForm({ nom_entreprise: item.nom_entreprise, poste: item.poste || '', url: item.url || '', type: item.type, statut: item.statut, notes: item.notes || '' })
    setAdding(true)
  }

  async function handleSave() {
    if (!form.nom_entreprise.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editing) {
      const { data, error } = await supabase.from('candidat_candidatures').update({ ...form }).eq('id', editing).select().single()
      if (!error && data) setItems(prev => prev.map(i => i.id === editing ? data : i))
    } else {
      const { data, error } = await supabase.from('candidat_candidatures').insert({ ...form, candidat_id: user.id }).select().single()
      if (!error && data) setItems(prev => [data, ...prev])
    }
    setAdding(false); setEditing(null); setForm(EMPTY_FORM); setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('candidat_candidatures').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function quickStatut(id, statut) {
    const { data } = await supabase.from('candidat_candidatures').update({ statut }).eq('id', id).select().single()
    if (data) setItems(prev => prev.map(i => i.id === id ? data : i))
  }

  const itemsOffres     = items.filter(i => i.type !== 'formation' && i.type !== 'ecole')
  const itemsFormations = items.filter(i => i.type === 'formation' || i.type === 'ecole')
  const activeItems     = onglet === 'offres' ? itemsOffres : itemsFormations
  const visible         = filterSt === 'all' ? activeItems : activeItems.filter(i => i.statut === filterSt)

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="page-title">Mes candidatures</div>
          <div className="page-sub">{itemsOffres.length} offre{itemsOffres.length !== 1 ? 's' : ''} · {itemsFormations.length} formation{itemsFormations.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setView('liste')}  style={{ ...toggleBtn, background: view === 'liste'  ? 'var(--navy)' : 'white', color: view === 'liste'  ? 'white' : 'var(--muted)' }}><i className="ti ti-list" /> Liste</button>
            <button onClick={() => setView('kanban')} style={{ ...toggleBtn, background: view === 'kanban' ? 'var(--navy)' : 'white', color: view === 'kanban' ? 'white' : 'var(--muted)', borderLeft: '1.5px solid var(--border)' }}><i className="ti ti-layout-columns" /> Kanban</button>
          </div>
          <button className="btn-sm teal" onClick={openAdd}><i className="ti ti-plus" /> Ajouter</button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
        {[
          { key: 'offres',     label: 'Offres',     icon: 'ti-briefcase', count: itemsOffres.length },
          { key: 'formations', label: 'Formations', icon: 'ti-certificate', count: itemsFormations.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setOnglet(tab.key); setFilterSt('all') }}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none', fontFamily: 'DM Sans, sans-serif',
              color: onglet === tab.key ? 'var(--navy)' : 'var(--muted)',
              borderBottom: onglet === tab.key ? '2px solid var(--navy)' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 100,
              background: onglet === tab.key ? 'var(--navy)' : 'var(--border)',
              color: onglet === tab.key ? 'white' : 'var(--muted)',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Formulaire ajout / édition */}
      {adding && (
        <div className="s-card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 12 }}>
            {editing ? 'Modifier la candidature' : 'Nouvelle candidature'}
          </div>

          {onglet === 'offres' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {TYPES_OFFRES.map(t => (
                <button key={t.key} onClick={() => setForm(f => ({ ...f, type: t.key }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: '1.5px solid ' + (form.type === t.key ? 'var(--navy)' : 'var(--border)'),
                    background: form.type === t.key ? 'var(--navy)' : 'white',
                    color: form.type === t.key ? 'white' : 'var(--muted)',
                  }}
                >
                  <i className={`ti ${t.icon}`} /> {t.label}
                </button>
              ))}
            </div>
          )}

          {(() => {
            const editingItem = editing ? items.find(i => i.id === editing) : null
            const lieeFormation = editingItem?.formations?.id
            return (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {lieeFormation ? (
                  <div style={{ ...inputStyle, flex: '2 1 160px', color: 'var(--muted)', background: 'var(--light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-lock" style={{ fontSize: 12, color: 'var(--muted)' }} />
                    {form.nom_entreprise}
                  </div>
                ) : (
                  <input
                    placeholder={onglet === 'formations' ? 'Nom de la formation *' : "Nom de l'entreprise *"}
                    value={form.nom_entreprise}
                    onChange={e => setForm(f => ({ ...f, nom_entreprise: e.target.value }))}
                    style={{ ...inputStyle, flex: '2 1 160px' }}
                  />
                )}
                <input
                  placeholder={onglet === 'formations' ? 'École' : 'Poste visé'}
                  value={form.poste}
                  onChange={e => setForm(f => ({ ...f, poste: e.target.value }))}
                  style={{ ...inputStyle, flex: '1 1 120px' }}
                />
              </div>
            )
          })()}

          {onglet === 'offres' && form.type !== 'prospection' && (
            <input
              placeholder={form.type === 'allschool' ? "URL de l'offre Allschool" : 'URL de l\'annonce ou de la page recrutement'}
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              style={{ ...inputStyle, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
            />
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={{ ...inputStyle, flex: '1 1 160px' }}>
              {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <input placeholder="Notes (optionnel)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, flex: '2 1 200px' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn-sm teal" onClick={handleSave} disabled={saving || !form.nom_entreprise.trim()}>
              {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Ajouter'}
            </button>
            <button className="btn-sm" onClick={() => { setAdding(false); setEditing(null) }}>Annuler</button>
          </div>
        </div>
      )}

      {/* VUE LISTE */}
      {view === 'liste' && (
        <div className="s-card">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {[{ key: 'all', label: 'Toutes' }, ...STATUTS].map(s => (
              <button key={s.key} onClick={() => setFilterSt(s.key)}
                style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: '1.5px solid ' + (filterSt === s.key ? 'var(--navy)' : 'var(--border)'),
                  background: filterSt === s.key ? 'var(--navy)' : 'white',
                  color: filterSt === s.key ? 'white' : 'var(--muted)',
                }}
              >
                {s.label}{s.key === 'all' ? ` (${activeItems.length})` : ` (${activeItems.filter(i => i.statut === s.key).length})`}
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>
              {onglet === 'formations' ? 'Aucune formation. Enregistrez des formations depuis la page Formations.' : 'Aucune candidature.'}
            </p>
          )}

          {visible.map(item => (
            <ListRow key={item.id} item={item} onglet={onglet}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
              onStatut={s => quickStatut(item.id, s)}
              onNavigateEcole={onNavigateEcole}
              onNavigateFormation={onNavigateFormation}
              action={actions[item.id] || null}
              onAction={() => setActionModal(item.id)}
            />
          ))}
        </div>
      )}

      {/* Modale action */}
      {actionModal && (
        <ActionModal
          action={actions[actionModal] || null}
          onSave={payload => handleSaveAction(actionModal, payload)}
          onClose={() => setActionModal(null)}
        />
      )}

      {/* VUE KANBAN */}
      {view === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {STATUTS.map(s => {
            const col = activeItems.filter(i => i.statut === s.key)
            return (
              <div key={s.key} style={{ background: s.bg, borderRadius: 12, padding: 12, minHeight: 120 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                  <span style={{ fontSize: 11, background: 'white', color: s.color, padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>{col.length}</span>
                </div>
                {col.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: '20px 0' }}>—</p>}
                {col.map(item => (
                  <KanbanCard key={item.id} item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    onStatut={st => quickStatut(item.id, st)}
                    onNavigateEcole={onNavigateEcole}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function ListRow({ item, onglet, onEdit, onDelete, onStatut, onNavigateEcole, onNavigateFormation, action, onAction }) {
  const st = statutInfo(item.statut)
  const ty = typeInfo(item.type)
  const isFormation = item.type === 'formation' || item.type === 'ecole'
  // Données enrichies via join
  const formationNom = item.formations?.nom || item.poste || ''
  const ecole        = item.formations?.ecoles || null
  const ecoleId      = ecole?.id || null
  const ecoleNom     = ecole?.nom || item.nom_entreprise || ''
  const ecoleVille   = ecole?.ville || ''

  return (
    <div className="entry-row" style={{ alignItems: 'center', gap: 10, padding: '10px 0' }}>
      {/* Avatar */}
      {isFormation ? (
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--purple-soft)', color: 'var(--purple)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {sigle(ecoleNom)}
        </div>
      ) : (
        <div className="e-av accent" style={{ flexShrink: 0 }}>{sigle(item.nom_entreprise)}</div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {isFormation ? (
          <>
            <div
              className="e-name"
              style={{ marginBottom: 2, cursor: item.formations?.id && onNavigateFormation ? 'pointer' : 'default', color: item.formations?.id && onNavigateFormation ? 'var(--teal)' : undefined }}
              onClick={() => item.formations?.id && onNavigateFormation?.(item.formations.id)}
            >{formationNom || ecoleNom}</div>
            {ecoleNom && (
              <div
                onClick={() => ecoleId && onNavigateEcole?.(ecoleId)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, background: 'var(--light)', fontSize: 11, color: 'var(--navy)', fontWeight: 500, cursor: ecoleId && onNavigateEcole ? 'pointer' : 'default' }}
                onMouseEnter={e => { if (ecoleId && onNavigateEcole) e.currentTarget.style.background = 'var(--border)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--light)'}
              >
                <i className="ti ti-school" style={{ fontSize: 10, color: 'var(--purple)' }} />
                {ecoleNom}{ecoleVille ? ` · ${ecoleVille}` : ''}
                {ecoleId && onNavigateEcole && <i className="ti ti-chevron-right" style={{ fontSize: 9, color: 'var(--muted)' }} />}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="e-name">{item.nom_entreprise}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}><i className={`ti ${ty.icon}`} style={{ marginRight: 3 }} />{ty.label}</span>
            </div>
            {item.poste && <div className="e-meta">{item.poste}</div>}
          </>
        )}
        {item.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.notes}</div>}
      </div>

      <select value={item.statut} onChange={e => onStatut(e.target.value)}
        style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 100, border: 'none', background: st.bg, color: st.color, cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
      >
        {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      {isFormation && (
        <button
          onClick={onAction}
          title={action ? `Rappel : ${action.texte}${action.echeance ? ' — ' + formatDate(action.echeance) : ''}` : 'Fixer un rappel'}
          style={{
            background: action ? (isOverdue(action.echeance) ? '#fee2e2' : 'var(--teal-soft)') : 'var(--light)',
            color: action ? (isOverdue(action.echeance) ? '#dc2626' : 'var(--teal)') : 'var(--muted)',
            border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontSize: 13, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <i className={`ti ${action ? 'ti-bell-ringing' : 'ti-bell'}`} />
          {action && <span style={{ fontSize: 10, fontWeight: 600 }}>{action.echeance ? formatDate(action.echeance).split(' ').slice(0,2).join(' ') : '!'}</span>}
        </button>
      )}
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-sm" style={{ fontSize: 11, textDecoration: 'none', flexShrink: 0 }}>
          <i className="ti ti-external-link" />
        </a>
      )}
      <button className="btn-sm" style={{ fontSize: 11 }} onClick={onEdit}><i className="ti ti-pencil" /></button>
      <button className="btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={onDelete}><i className="ti ti-trash" /></button>
    </div>
  )
}

function KanbanCard({ item, onEdit, onDelete, onStatut, onNavigateEcole }) {
  const ty = typeInfo(item.type)
  const [open, setOpen] = useState(false)
  const isFormation = item.type === 'formation' || item.type === 'ecole'
  const formationNom = item.formations?.nom || item.poste || ''
  const ecole        = item.formations?.ecoles || null
  const ecoleId      = ecole?.id || null
  const ecoleNom     = ecole?.nom || item.nom_entreprise || ''
  const ecoleVille   = ecole?.ville || ''
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', lineHeight: 1.3 }}>
            {isFormation ? formationNom || ecoleNom : item.nom_entreprise}
          </div>
          {isFormation && ecoleNom && (
            <div
              onClick={() => ecoleId && onNavigateEcole?.(ecoleId)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3, padding: '2px 7px', borderRadius: 5, background: 'var(--light)', fontSize: 10, color: 'var(--navy)', cursor: ecoleId && onNavigateEcole ? 'pointer' : 'default' }}
            >
              <i className="ti ti-school" style={{ fontSize: 9, color: 'var(--purple)' }} />
              {ecoleNom}{ecoleVille ? ` · ${ecoleVille}` : ''}
              {ecoleId && onNavigateEcole && <i className="ti ti-chevron-right" style={{ fontSize: 9, color: 'var(--muted)' }} />}
            </div>
          )}
          {!isFormation && item.poste && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.poste}</div>}
        </div>
        <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
          <i className="ti ti-dots-vertical" style={{ fontSize: 14 }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}><i className={`ti ${ty.icon}`} style={{ marginRight: 3 }} />{ty.label}</span>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--teal)', textDecoration: 'none', marginLeft: 'auto' }}>
            <i className="ti ti-external-link" />
          </a>
        )}
      </div>
      {item.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>{item.notes}</div>}
      {open && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>Déplacer vers</div>
          {STATUTS.map(s => (
            <button key={s.key} onClick={() => { onStatut(s.key); setOpen(false) }}
              style={{ textAlign: 'left', background: s.bg, color: s.color, border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
              {s.label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button className="btn-sm" style={{ fontSize: 11, flex: 1 }} onClick={() => { onEdit(); setOpen(false) }}><i className="ti ti-pencil" /> Modifier</button>
            <button className="btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={onDelete}><i className="ti ti-trash" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

const toggleBtn = {
  padding: '6px 12px', fontSize: 12, fontWeight: 500, border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  fontFamily: 'DM Sans, sans-serif',
}

const inputStyle = {
  padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)',
  background: 'white', outline: 'none', boxSizing: 'border-box',
}
