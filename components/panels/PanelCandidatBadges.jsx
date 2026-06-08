'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

const PALIERS = [
  { key: 'recherche_active', min: 10,  max: 19,  label: 'Recherche active',  icon: 'ti-search',        color: '#0369a1', bg: '#e0f2fe', desc: '10 offres envoyées' },
  { key: 'perseverant',      min: 20,  max: 49,  label: 'Persévérant',       icon: 'ti-flame',         color: '#c2410c', bg: '#fff7ed', desc: '20 offres envoyées' },
  { key: 'determine',        min: 50,  max: 99,  label: 'Déterminé',         icon: 'ti-bolt',          color: '#7e22ce', bg: '#fdf4ff', desc: '50 offres envoyées' },
  { key: 'inarretable',      min: 100, max: null, label: 'Inarrêtable',      icon: 'ti-trophy',        color: '#b45309', bg: '#fef3c7', desc: '100 offres envoyées' },
]

const BADGES_DEF = [
  {
    key:   'profil_complete',
    label: 'Profil complété',
    icon:  'ti-user-check',
    color: '#15803d',
    bg:    '#dcfce7',
    desc:  'Prénom, nom, ville, bio, photo et contact renseignés',
  },
  {
    key:   'cv_en_ligne',
    label: 'CV en ligne',
    icon:  'ti-file-cv',
    color: '#0369a1',
    bg:    '#e0f2fe',
    desc:  'Profil public activé',
  },
  {
    key:   'ecole_admis',
    label: 'Admis !',
    icon:  'ti-school',
    color: '#15803d',
    bg:    '#dcfce7',
    desc:  'Au moins une école passée en statut Admis',
  },
  ...PALIERS,
  {
    key:   'top_profil',
    label: 'Top profil',
    icon:  'ti-star',
    color: '#b45309',
    bg:    '#fef3c7',
    desc:  'Mise en avant par une école — bientôt disponible',
    locked: true,
  },
  {
    key:   'alternance_trouvee',
    label: 'Alternance trouvée',
    icon:  'ti-confetti',
    color: '#7e22ce',
    bg:    '#fdf4ff',
    desc:  'Tu as coché "J\'ai trouvé mon alternance" dans ton profil',
  },
]

function BadgeCircle({ badge, earned, locked }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 90 }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: locked ? '#f1f5f9' : earned ? badge.bg : '#f8fafc',
        border: `2.5px solid ${locked ? '#e2e8f0' : earned ? badge.color : '#e2e8f0'}`,
        boxShadow: earned && !locked ? `0 0 0 4px ${badge.bg}` : 'none',
        transition: 'all 0.2s',
        position: 'relative',
      }}>
        <i className={`ti ${locked ? 'ti-lock' : badge.icon}`} style={{
          fontSize: 22,
          color: locked ? '#94a3b8' : earned ? badge.color : '#cbd5e1',
        }} />
        {earned && !locked && (
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid white',
          }}>
            <i className="ti ti-check" style={{ fontSize: 10, color: 'white' }} />
          </div>
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: earned && !locked ? 600 : 400,
        color: locked ? '#94a3b8' : earned ? badge.color : '#94a3b8',
        textAlign: 'center', lineHeight: 1.3,
      }}>
        {badge.label}
      </div>
    </div>
  )
}

export default function PanelCandidatBadges() {
  const supabase = createClient()
  const [loading,    setLoading]    = useState(true)
  const [earned,     setEarned]     = useState(new Set())
  const [nbOffres,   setNbOffres]   = useState(0)
  const [nextBadge,  setNextBadge]  = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: profil },
        { data: candidatures },
      ] = await Promise.all([
        supabase.from('candidats').select('prenom, nom, ville, bio, photo_url, email, telephone, profil_public, alternance_trouvee').eq('id', user.id).single(),
        supabase.from('candidat_candidatures').select('type, statut').eq('candidat_id', user.id),
      ])

      const e = new Set()

      // 1. Profil complété
      if (profil?.prenom && profil?.nom && profil?.ville && profil?.bio && profil?.photo_url && (profil?.email || profil?.telephone)) {
        e.add('profil_complete')
      }

      // 2. CV en ligne
      if (profil?.profil_public) e.add('cv_en_ligne')

      // 3. Alternance trouvée
      if (profil?.alternance_trouvee) e.add('alternance_trouvee')

      // 4. Admis dans une formation
      const admis = (candidatures || []).some(c => (c.type === 'formation' || c.type === 'ecole') && c.statut === 'admis')
      if (admis) e.add('ecole_admis')

      // 5. Paliers offres (hors formations/écoles)
      const offres = (candidatures || []).filter(c => c.type !== 'formation' && c.type !== 'ecole').length
      setNbOffres(offres)
      for (const p of PALIERS) {
        if (offres >= p.min) e.add(p.key)
      }

      // Prochain badge offres
      const next = PALIERS.find(p => offres < p.min)
      setNextBadge(next ? { ...next, restant: p => p.min - offres } : null)

      setEarned(e)
      setLoading(false)
    }
    load()
  }, [])

  const total   = BADGES_DEF.filter(b => !b.locked).length
  const nbEarned = BADGES_DEF.filter(b => !b.locked && earned.has(b.key)).length

  // Prochain palier offres
  const nextPalier = PALIERS.find(p => nbOffres < p.min)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes badges</div>
          <div className="page-sub">
            {loading ? 'Chargement…' : `${nbEarned} badge${nbEarned !== 1 ? 's' : ''} débloqué${nbEarned !== 1 ? 's' : ''} sur ${total}`}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
      ) : (
        <>
          {/* Barre de progression */}
          <div className="s-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Progression</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{nbEarned} / {total}</span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(nbEarned / total) * 100}%`, background: 'var(--teal)', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Grille de badges */}
          <div className="s-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {BADGES_DEF.map(badge => (
                <BadgeCircle
                  key={badge.key}
                  badge={badge}
                  earned={earned.has(badge.key)}
                  locked={!!badge.locked}
                />
              ))}
            </div>
          </div>

          {/* Prochain objectif */}
          {nextPalier && (
            <div style={{ background: 'var(--gold-soft)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: nextPalier.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${nextPalier.icon}`} style={{ fontSize: 18, color: nextPalier.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#412402' }}>
                  Encore {nextPalier.min - nbOffres} candidature{nextPalier.min - nbOffres > 1 ? 's' : ''} pour débloquer <strong>{nextPalier.label}</strong> !
                </div>
                <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>
                  {nbOffres} / {nextPalier.min} offres envoyées
                </div>
              </div>
            </div>
          )}

          {/* Message si tout débloqué */}
          {!nextPalier && nbEarned === total && (
            <div style={{ background: '#dcfce7', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="ti ti-confetti" style={{ fontSize: 24, color: '#15803d' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#14532d' }}>
                Bravo ! Tu as débloqué tous les badges disponibles 🎉
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
