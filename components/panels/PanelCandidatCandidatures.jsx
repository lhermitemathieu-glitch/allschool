'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

const STATUTS = [
  { key: 'enregistre', label: 'Enregistré',           color: 'var(--muted)',   bg: '#f1f5f9' },
  { key: 'envoyee',    label: 'Candidature envoyée',   color: 'var(--teal)',    bg: 'var(--teal-soft)' },
  { key: 'entretien',  label: 'Entretien',              color: 'var(--accent)',  bg: '#fff3e0' },
  { key: 'archive',    label: 'Archivé',                color: '#9e9e9e',        bg: '#f5f5f5' },
]

const TYPES = [
  { key: 'externe',   label: 'Offre externe',          icon: 'ti-world',        hint: 'Indeed, WTJ, LinkedIn…' },
  { key: 'spontanee', label: 'Candidature spontanée',  icon: 'ti-mail-forward', hint: 'Page recrutement entreprise' },
  { key: 'physique',  label: 'Prospection physique',   icon: 'ti-map-pin',      hint: 'Visite directe en personne' },
  { key: 'allschool', label: 'Offre Allschool',        icon: 'ti-rosette',      hint: 'Offre publiée sur la plateforme' },
]

function statutInfo(key) { return STATUTS.find(s => s.key === key) || STATUTS[0] }
function typeInfo(key)   { return TYPES.find(t => t.key === key)   || TYPES[0] }

function sigle(nom) {
  return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const EMPTY_FORM = { nom_entreprise: '', poste: '', url: '', type: 'externe', statut: 'enregistre', notes: '' }

export default function PanelCandidatCandidatures() {
  const supabase = createClient()

  const [items,    setItems]    = useState([])
  const [view,     setView]     = useState('liste')   // 'liste' | 'kanban'
  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState(null)       // id en cours d'édition
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [filterSt, setFilterSt] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('candidat_candidatures')
      .select('*')
      .eq('candidat_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setAdding(true)
  }

  function openEdit(item) {
    setEditing(item.id)
    setForm({
      nom_entreprise: item.nom_entreprise,
      poste:          item.poste  || '',
      url:            item.url    || '',
      type:           item.type,
      statut:         item.statut,
      notes:          item.notes  || '',
    })
    setAdding(true)
  }

  async function handleSave() {
    if (!form.nom_entreprise.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editing) {
      const { data, error } = await supabase
        .from('candidat_candidatures')
        .update({ ...form })
        .eq('id', editing)
        .select().single()
      if (!error && data) setItems(prev => prev.map(i => i.id === editing ? data : i))
    } else {
      const { data, error } = await supabase
        .from('candidat_candidatures')
        .insert({ ...form, candidat_id: user.id })
        .select().single()
      if (!error && data) setItems(prev => [data, ...prev])
    }
    setAdding(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('candidat_candidatures').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function quickStatut(id, statut) {
    const { data } = await supabase
      .from('candidat_candidatures')
      .update({ statut })
      .eq('id', id)
      .select().single()
    if (data) setItems(prev => prev.map(i => i.id === id ? data : i))
  }

  const visible = filterSt === 'all' ? items : items.filter(i => i.statut === filterSt)

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="page-title">Mes candidatures</div>
          <div className="page-sub">{items.length} entreprise{items.length !== 1 ? 's' : ''} suivie{items.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Toggle vue */}
          <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setView('liste')}
              style={{ ...toggleBtn, background: view === 'liste' ? 'var(--navy)' : 'white', color: view === 'liste' ? 'white' : 'var(--muted)' }}
            >
              <i className="ti ti-list" /> Liste
            </button>
            <button
              onClick={() => setView('kanban')}
              style={{ ...toggleBtn, background: view === 'kanban' ? 'var(--navy)' : 'white', color: view === 'kanban' ? 'white' : 'var(--muted)', borderLeft: '1.5px solid var(--border)' }}
            >
              <i className="ti ti-layout-columns" /> Kanban
            </button>
          </div>
          <button className="btn-sm teal" onClick={openAdd}>
            <i className="ti ti-plus" /> Ajouter
          </button>
        </div>
      </div>

      {/* Formulaire ajout / édition */}
      {adding && (
        <div className="s-card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 12 }}>
            {editing ? 'Modifier la candidature' : 'Nouvelle candidature'}
          </div>

          {/* Type */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setForm(f => ({ ...f, type: t.key }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: '1.5px solid ' + (form.type === t.key ? 'var(--navy)' : 'var(--border)'),
                  background: form.type === t.key ? 'var(--navy)' : 'white',
                  color: form.type === t.key ? 'white' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                <i className={`ti ${t.icon}`} /> {t.label}
              </button>
            ))}
          </div>

          {/* Champs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <input
              placeholder="Nom de l'entreprise *"
              value={form.nom_entreprise}
              onChange={e => setForm(f => ({ ...f, nom_entreprise: e.target.value }))}
              style={{ ...inputStyle, flex: '2 1 160px' }}
            />
            <input
              placeholder="Poste visé"
              value={form.poste}
              onChange={e => setForm(f => ({ ...f, poste: e.target.value }))}
              style={{ ...inputStyle, flex: '1 1 120px' }}
            />
          </div>

          {form.type !== 'physique' && (
            <input
              placeholder={form.type === 'allschool' ? 'URL de l\'offre Allschool' : 'URL de l\'annonce ou de la page recrutement'}
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              style={{ ...inputStyle, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
            />
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <select
              value={form.statut}
              onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
              style={{ ...inputStyle, flex: '1 1 160px' }}
            >
              {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <input
              placeholder="Notes (optionnel)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ ...inputStyle, flex: '2 1 200px' }}
            />
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
          {/* Filtres statut */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {[{ key: 'all', label: 'Toutes' }, ...STATUTS].map(s => (
              <button
                key={s.key}
                onClick={() => setFilterSt(s.key)}
                style={{
                  padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                  border: '1.5px solid ' + (filterSt === s.key ? 'var(--navy)' : 'var(--border)'),
                  background: filterSt === s.key ? 'var(--navy)' : 'white',
                  color: filterSt === s.key ? 'white' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                {s.label}{s.key === 'all' ? ` (${items.length})` : ` (${items.filter(i => i.statut === s.key).length})`}
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Aucune candidature.</p>
          )}

          {visible.map(item => (
            <ListRow
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
              onStatut={(s) => quickStatut(item.id, s)}
            />
          ))}
        </div>
      )}

      {/* VUE KANBAN */}
      {view === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {STATUTS.map(s => {
            const col = items.filter(i => i.statut === s.key)
            return (
              <div key={s.key} style={{ background: s.bg, borderRadius: 12, padding: 12, minHeight: 120 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 11, background: 'white', color: s.color, padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                    {col.length}
                  </span>
                </div>
                {col.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: '20px 0' }}>—</p>
                )}
                {col.map(item => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    onStatut={(st) => quickStatut(item.id, st)}
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

function ListRow({ item, onEdit, onDelete, onStatut }) {
  const st = statutInfo(item.statut)
  const ty = typeInfo(item.type)
  return (
    <div className="entry-row" style={{ alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
      <div className="e-av accent" style={{ flexShrink: 0 }}>{sigle(item.nom_entreprise)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="e-name">{item.nom_entreprise}</span>
          <span style={{ fontSize: 11, color: ty.icon ? 'var(--muted)' : undefined }}>
            <i className={`ti ${ty.icon}`} style={{ marginRight: 3 }} />{ty.label}
          </span>
        </div>
        {item.poste && <div className="e-meta">{item.poste}</div>}
        {item.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.notes}</div>}
      </div>
      {/* Sélecteur statut rapide */}
      <select
        value={item.statut}
        onChange={e => onStatut(e.target.value)}
        style={{
          fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 100, border: 'none',
          background: st.bg, color: st.color, cursor: 'pointer', outline: 'none',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
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

function KanbanCard({ item, onEdit, onDelete, onStatut }) {
  const ty = typeInfo(item.type)
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      background: 'white', borderRadius: 10, padding: '10px 12px', marginBottom: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', lineHeight: 1.3 }}>{item.nom_entreprise}</div>
          {item.poste && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.poste}</div>}
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
        >
          <i className="ti ti-dots-vertical" style={{ fontSize: 14 }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <i className={`ti ${ty.icon}`} style={{ marginRight: 3 }} />{ty.label}
        </span>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--teal)', textDecoration: 'none', marginLeft: 'auto' }}>
            <i className="ti ti-external-link" />
          </a>
        )}
      </div>
      {item.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>{item.notes}</div>}

      {/* Menu contextuel */}
      {open && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>Déplacer vers</div>
          {STATUTS.map(s => (
            <button
              key={s.key}
              onClick={() => { onStatut(s.key); setOpen(false) }}
              style={{
                textAlign: 'left', background: s.bg, color: s.color,
                border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button className="btn-sm" style={{ fontSize: 11, flex: 1 }} onClick={() => { onEdit(); setOpen(false) }}>
              <i className="ti ti-pencil" /> Modifier
            </button>
            <button className="btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={onDelete}>
              <i className="ti ti-trash" />
            </button>
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
