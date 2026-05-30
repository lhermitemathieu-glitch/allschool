'use client'

import { useState } from 'react'

// ── PAGE PUBLIQUE ─────────────────────────────────────────────────────────────
export function PanelEcolePage() {
  const formations = [
    { nom: 'Bachelor Marketing Digital', meta: 'Bac+3 · 340 apprentis', presentation: '95%', reussite: '91%' },
    { nom: 'Master Management', meta: 'Bac+5 · 210 apprentis', presentation: '97%', reussite: '94%' },
  ]
  const evenements = [
    { jour: '15', mois: 'Fév', titre: 'Journée Portes Ouvertes', meta: 'Inscription gratuite · Lyon campus' },
    { jour: '08', mois: 'Mar', titre: 'Forum des métiers & alternance', meta: '30 entreprises partenaires présentes' },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Ma page publique</div>
          <div className="page-sub">Visible par les candidats et les entreprises</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-sm"><i className="ti ti-eye" /> Aperçu</button>
          <button className="btn-sm purple"><i className="ti ti-device-floppy" /> Enregistrer</button>
        </div>
      </div>

      {/* Carte école */}
      <div className="s-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="school-cover">
          <button className="btn-sm" style={{ position: 'absolute', top: 10, right: 10, fontSize: 11 }}>
            <i className="ti ti-camera" /> Bannière
          </button>
          <div className="school-logo-abs">ESG</div>
        </div>
        <div className="school-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>ESG Lyon — École de Commerce</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className="pill" style={{ background: 'var(--light)' }}><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> Lyon 2e</span>
                <span className="pill purple">Qualiopi</span>
                <span className="pill">1 200 étudiants</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
                L'ESG Lyon forme depuis 30 ans des managers opérationnels. 85% de nos étudiants sont en alternance dès la 1ère année.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <a className="pill" style={{ cursor: 'pointer' }}><i className="ti ti-world" style={{ fontSize: 10 }} /> Site web</a>
                <a className="pill" style={{ cursor: 'pointer' }}><i className="ti ti-brand-linkedin" style={{ fontSize: 10 }} /> LinkedIn</a>
              </div>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div className="stars">★★★★☆</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>4.3/5</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>142 avis</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--border)' }}>
            <button className="btn-sm purple"><i className="ti ti-send" /> Candidater dans cette école</button>
            <button className="btn-sm"><i className="ti ti-mail" /> Contacter (entreprises)</button>
          </div>
        </div>
      </div>

      <div className="grid2">
        {/* Formations */}
        <div className="s-card">
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-certificate" /> Formations & résultats</div>
            <button className="btn-sm" style={{ fontSize: 11 }}>+ Ajouter</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Formation</div><div>Présentation</div><div>Réussite</div>
          </div>
          {formations.map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', padding: '9px 0', borderBottom: i < formations.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{f.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.meta}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--purple)' }}>{f.presentation}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--teal)' }}>{f.reussite}</div>
            </div>
          ))}
        </div>

        {/* Événements */}
        <div className="s-card">
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-calendar" /> Événements à venir</div>
            <button className="btn-sm" style={{ fontSize: 11 }}>+ Ajouter</button>
          </div>
          {evenements.map((e, i) => (
            <div key={i} className="event-item">
              <div className="event-date">
                <div className="event-day">{e.jour}</div>
                <div className="event-month">{e.mois}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{e.titre}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{e.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── APPRENTIS ────────────────────────────────────────────────────────────────
export function PanelEcoleApprentis() {
  const [invite, setInvite] = useState('')
  const apprentis = [
    { initiales: 'TM', cls: 'teal', nom: 'Thomas Martin', meta: 'Bachelor Marketing · Cherche entreprise · Paris', pillCls: 'gold', pill: 'Top profil', topProfil: true },
    { initiales: 'SL', cls: 'purple', nom: 'Sofia Leblanc', meta: 'Master Management · Contrat signé · Lyon', pillCls: 'teal', pill: 'Contrat signé', topProfil: false },
    { initiales: 'KD', cls: 'accent', nom: 'Karim Djemai', meta: 'BTS Management · Cherche entreprise · Lyon', pillCls: 'gold', pill: 'Top profil', topProfil: true },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes apprentis</div>
          <div className="page-sub">Gérez et mettez en avant vos alternants</div>
        </div>
        <button className="btn-sm purple"><i className="ti ti-plus" /> Inviter un apprenti</button>
      </div>

      {/* Stats */}
      <div className="grid4" style={{ marginBottom: '1.25rem' }}>
        {[
          { num: '730', label: 'Total apprentis', color: 'var(--navy)' },
          { num: '284', label: 'En recherche', color: 'var(--accent)' },
          { num: '446', label: 'Contrat signé', color: 'var(--purple)' },
          { num: '38',  label: 'Tops profils', color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="stat-mini">
            <span className="stat-num" style={{ color: s.color }}>{s.num}</span>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-users" /> Liste des apprentis</div>
        </div>
        {apprentis.map((a, i) => (
          <div key={i} className="entry-row">
            <div className={`e-av ${a.cls}`}>{a.initiales}</div>
            <div style={{ flex: 1 }}>
              <div className="e-name">{a.nom}</div>
              <div className="e-meta">{a.meta}</div>
            </div>
            <span className={`pill ${a.pillCls}`}>{a.pill}</span>
            <button className="btn-sm" style={{ marginLeft: 8, fontSize: 11 }}><i className="ti ti-eye" /></button>
            {a.topProfil
              ? <button className="btn-sm purple" style={{ marginLeft: 4, fontSize: 11 }}><i className="ti ti-star" /> Mettre en avant</button>
              : <button className="btn-sm" style={{ marginLeft: 4, fontSize: 11 }}><i className="ti ti-star" /></button>
            }
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <input
            type="text"
            value={invite}
            onChange={e => setInvite(e.target.value)}
            placeholder="Nom ou email de l'apprenti…"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--light)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--navy)', outline: 'none' }}
          />
          <button className="btn-sm purple"><i className="ti ti-plus" /> Inviter</button>
        </div>
      </div>
    </>
  )
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
export function PanelEcoleDashboard() {
  const stats = [
    { num: '730',   label: 'Apprentis rattachés',          color: 'var(--navy)',   trend: '+24 ce mois',        trendColor: 'var(--teal)' },
    { num: '1 842', label: 'Vues entreprises sur candidats', color: 'var(--accent)', trend: '+18% ce mois',       trendColor: 'var(--teal)' },
    { num: '648',   label: 'Vues apprentis sur offres',    color: 'var(--purple)', trend: '+31% ce mois',       trendColor: 'var(--teal)' },
    { num: '34',    label: 'Candidatures reçues',          color: 'var(--teal)',   trend: '−3 vs mois dernier', trendColor: 'var(--gold)' },
  ]

  const liens = [
    { bg: 'var(--accent-soft)', iconColor: 'var(--accent)', icon: 'ti-building', label: 'Lien avis entreprises', url: 'allschool.fr/avis/esg-lyon/entreprise?token=ENT_2025' },
    { bg: 'var(--purple-soft)', iconColor: 'var(--purple)', icon: 'ti-user-circle', label: 'Lien avis apprentis', url: 'allschool.fr/avis/esg-lyon/apprenti?token=APP_2025' },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Performance de l'école sur Allschool</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid4" style={{ marginBottom: '1.25rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="s-card" style={{ marginBottom: 0, textAlign: 'center' }}>
            <span className="stat-num" style={{ color: s.color }}>{s.num}</span>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 11, color: s.trendColor, marginTop: 4 }}>{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Liens avis */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-star" /> Liens de collecte d'avis</div>
        </div>
        {liens.map((l, i) => (
          <div key={i} className="avis-link-card">
            <div style={{ width: 36, height: 36, borderRadius: 8, background: l.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${l.icon}`} style={{ fontSize: 15, color: l.iconColor }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--navy)', marginBottom: 2 }}>{l.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.url}</div>
            </div>
            <button className="btn-sm" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => navigator.clipboard.writeText(l.url)}>
              <i className="ti ti-copy" /> Copier
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
