'use client'

import { useState } from 'react'

// ── SIRET ────────────────────────────────────────────────────────────────────
export function PanelEntrepriseSiret() {
  const [siret, setSiret] = useState('')
  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Créer mon compte entreprise</div>
          <div className="page-sub">Vérification SIRET obligatoire</div>
        </div>
      </div>
      <div className="siret-wrap">
        <div className="siret-icon"><i className="ti ti-building" /></div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>Entrez votre numéro SIRET</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>Le SIRET garantit que vous êtes bien une entreprise réelle et vous donne accès aux coordonnées des candidats.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={siret}
            onChange={e => setSiret(e.target.value)}
            placeholder="Ex : 381 658 820 00038"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }}
          />
          <button className="btn-sm accent" style={{ padding: '10px 18px', fontSize: 13 }}>
            <i className="ti ti-check" /> Valider
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '1rem 0', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ flex: 1, height: 0.5, background: 'var(--border)' }} />
          Je ne connais pas mon SIRET
          <div style={{ flex: 1, height: 0.5, background: 'var(--border)' }} />
        </div>
        <div className="siret-help" onClick={() => window.open('https://www.pappers.fr', '_blank')}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'white', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-search" style={{ fontSize: 16, color: 'var(--navy)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>Retrouver mon SIRET sur Pappers</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Recherche gratuite · pappers.fr</div>
          </div>
          <i className="ti ti-external-link" style={{ fontSize: 15, color: 'var(--muted)', marginLeft: 'auto' }} />
        </div>
      </div>
    </>
  )
}

// ── RECHERCHE ────────────────────────────────────────────────────────────────
export function PanelEntrepriseRecherche({ onNavigate }) {
  const [toggles, setToggles] = useState({ teletravail: true, rqth: false, dispo: false })

  const toggle = key => setToggles(t => ({ ...t, [key]: !t[key] }))

  const profils = [
    { initiales: 'TM', bg: 'var(--teal-soft)', color: 'var(--teal-mid)', nom: 'Thomas Martin', lieu: 'Paris 11e · 2km · Bachelor Marketing', tags: ['Dispo sept. 2025', 'Télétravail OK'], tag2: ['23 ans'], locked: false },
    { initiales: 'SL', bg: 'var(--purple-soft)', color: 'var(--purple-mid)', nom: 'Sofia Leblanc', lieu: 'Montreuil · 8km · Bachelor Com.', tags: ['Dispo sept. 2025', 'Content strategy'], tag2: ['22 ans'], locked: false },
    { initiales: 'AR', bg: 'var(--accent-soft)', color: '#993C1D', nom: 'A. Rousseau', lieu: 'Vincennes · 12km · Bachelor', tags: [], tag2: [], locked: true },
    { initiales: 'JD', bg: 'var(--teal-soft)', color: 'var(--teal-mid)', nom: 'J. Dupont', lieu: 'Paris 15e · 5km · BTS Commerce', tags: [], tag2: [], locked: true },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Rechercher un alternant</div>
          <div className="page-sub">47 profils correspondent à vos critères</div>
        </div>
        <button className="btn-sm accent" onClick={() => onNavigate('entreprise-offres')}>
          <i className="ti ti-plus" /> Déposer une offre
        </button>
      </div>

      {/* Filtres */}
      <div className="fbar">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px auto', gap: 8, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diplôme</div>
            <select style={{ width: '100%' }}>
              <option>Bachelor (Bac+3)</option>
              <option>BTS / BUT (Bac+2)</option>
              <option>Master (Bac+5)</option>
              <option>CAP</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secteur</div>
            <select style={{ width: '100%' }}>
              <option>Marketing & Communication</option>
              <option>Informatique & Dev</option>
              <option>Commerce & Vente</option>
              <option>Artisanat alimentaire</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ville</div>
            <input type="text" defaultValue="Paris" style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rayon</div>
            <input type="number" defaultValue="30" style={{ width: '100%' }} />
          </div>
          <button className="btn-sm accent"><i className="ti ti-search" /> Filtrer</button>
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {[['teletravail', '100% télétravail'], ['rqth', 'RQTH / Handicap'], ['dispo', 'Dispo immédiate']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className={`toggle ${toggles[key] ? 'on' : ''}`} onClick={() => toggle(key)} />
              <span style={{ fontSize: 12, color: 'var(--navy)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--border)' }}>
          {['Bachelor', 'Marketing', 'Paris · 30km'].map(tag => (
            <span key={tag} className="pill accent" style={{ cursor: 'pointer' }}>{tag} <i className="ti ti-x" style={{ fontSize: 10 }} /></span>
          ))}
        </div>
      </div>

      {/* Profils */}
      <div className="grid2">
        {profils.map((p, i) => (
          <div key={i} className="p-card" style={{ minHeight: p.locked ? 140 : 'auto' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, filter: p.locked ? 'blur(4px)' : 'none', pointerEvents: p.locked ? 'none' : 'auto' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: p.color, flexShrink: 0 }}>{p.initiales}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{p.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.lieu}</div>
              </div>
            </div>
            {!p.locked && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {p.tags.map(t => <span key={t} className="tag hi">{t}</span>)}
                  {p.tag2.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button className="btn-sm teal" style={{ fontSize: 11 }}><i className="ti ti-download" /> CV</button>
                  <button className="btn-sm" style={{ fontSize: 11 }}><i className="ti ti-mail" /> Email</button>
                  <button className="btn-sm accent" style={{ fontSize: 11 }}><i className="ti ti-send" /> Contacter</button>
                </div>
              </>
            )}
            {p.locked && (
              <div className="lock-ov">
                <i className="ti ti-lock" />
                <p>Compte candidat requis pour voir les coordonnées</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ── ÉCOLES ───────────────────────────────────────────────────────────────────
export function PanelEntrepriseEcoles() {
  const ecoles = [
    { initiales: 'CFA', nom: 'CFA des Métiers du Rhône', lieu: 'Lyon 7e · 3km', type: 'CFA public', typeCls: 'teal', reussite: '94%', apprentis: '320', avis: '4.2' },
    { initiales: 'ISEG', nom: 'ISEG Marketing Lyon', lieu: 'Lyon 2e · 4km', type: 'CFA privé', typeCls: 'purple', reussite: '91%', apprentis: '480', avis: '4.0' },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Écoles près de moi</div>
          <div className="page-sub">18 établissements dans votre zone</div>
        </div>
      </div>

      <div className="fbar" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {[['Ville', 'text', 'Lyon', '140px'], ['Rayon km', 'number', '20', '70px']].map(([label, type, val, w]) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <input type={type} defaultValue={val} style={{ width: w }} />
          </div>
        ))}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secteur</div>
          <select style={{ width: 180 }}><option>Tous secteurs</option><option>Marketing</option><option>Commerce</option><option>Bâtiment</option></select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</div>
          <select style={{ width: 150 }}><option>Tous types</option><option>CFA public</option><option>CFA privé</option><option>CMA</option></select>
        </div>
        <button className="btn-sm accent"><i className="ti ti-search" /> Rechercher</button>
      </div>

      <div className="grid2">
        {ecoles.map((e, i) => (
          <div key={i} className="s-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--light)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 800, color: 'var(--navy)', flexShrink: 0 }}>{e.initiales}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{e.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.lieu}</div>
              </div>
              <span className={`pill ${e.typeCls}`}>{e.type}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[['Réussite', e.reussite], ['Apprentis', e.apprentis], ['Avis', e.avis]].map(([label, val]) => (
                <div key={label} className="stat-mini" style={{ flex: 1, padding: 8 }}>
                  <span className="stat-num" style={{ fontSize: 18 }}>{val}</span>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button className="btn-sm"><i className="ti ti-eye" /> Voir</button>
              <button className="btn-sm accent"><i className="ti ti-send" /> Contacter</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── OFFRES ───────────────────────────────────────────────────────────────────
export function PanelEntrepriseOffres() {
  const offres = [
    { titre: 'Alternant chef de projet digital — Ogilvy', meta: 'Bachelor Bac+3 · Paris 8e · 14 candidatures' },
    { titre: 'Alternant social media — Havas Lyon', meta: 'BTS Bac+2 · Lyon 3e · 10 candidatures' },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes offres d'alternance</div>
          <div className="page-sub">Gérez vos annonces</div>
        </div>
        <button className="btn-sm accent"><i className="ti ti-plus" /> Nouvelle offre</button>
      </div>

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-speakerphone" /> Offres actives</div>
        </div>
        {offres.map((o, i) => (
          <div key={i} className="offre-card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div className="status-dot" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{o.titre}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{o.meta}</div>
              </div>
              <button className="btn-sm" style={{ fontSize: 11 }}><i className="ti ti-edit" /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── SIMULATEUR ───────────────────────────────────────────────────────────────
export function PanelEntrepriseSimulateur() {
  const [niv, setNiv] = useState('bach')
  const [age, setAge] = useState('18')
  const [tail, setTail] = useState('tpe')

  const smic = 1766.92
  const pcts = { bts: 0.27, bach: 0.43, master: 0.53 }
  const ageMod = age === '18' ? 0 : age === '21' ? 0.06 : 0.12
  const base = (pcts[niv] + ageMod) * smic
  const total = base * 1.25
  const aides = { tpe: 6000, pme: 5000, ge: 3000 }
  const aide = aides[tail]
  const net = total - aide / 12
  const fmt = n => Math.round(n).toLocaleString('fr-FR') + ' €'

  const selectStyle = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }
  const labelStyle = { fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Simulateurs</div>
          <div className="page-sub">Coût d'embauche et aides disponibles</div>
        </div>
      </div>

      <div className="s-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Paramètres */}
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Paramètres</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={labelStyle}>Niveau diplôme</div>
                <select value={niv} onChange={e => setNiv(e.target.value)} style={selectStyle}>
                  <option value="bts">BTS / BUT (Bac+2)</option>
                  <option value="bach">Bachelor (Bac+3)</option>
                  <option value="master">Master (Bac+5)</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>Âge</div>
                <select value={age} onChange={e => setAge(e.target.value)} style={selectStyle}>
                  <option value="18">18 à 20 ans</option>
                  <option value="21">21 à 25 ans</option>
                  <option value="26">26 ans et plus</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>Taille entreprise</div>
                <select value={tail} onChange={e => setTail(e.target.value)} style={selectStyle}>
                  <option value="tpe">TPE (- de 11 sal.)</option>
                  <option value="pme">PME (11 à 249)</option>
                  <option value="ge">Grande entreprise</option>
                </select>
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div style={{ background: 'var(--light)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Résultats estimés</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Salaire brut / mois', fmt(base), 'var(--navy)', false],
                ['Coût total brut', fmt(total) + ' / mois', 'var(--navy)', false],
                ['Aide à l\'embauche / an', fmt(aide) + ' / an', 'var(--teal)', false],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500, color }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <span style={{ fontWeight: 500 }}>Coût net / mois</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{fmt(net)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
