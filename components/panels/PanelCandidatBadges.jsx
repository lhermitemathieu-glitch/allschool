'use client'

export default function PanelCandidatBadges() {
  const badges = [
    { icon: 'ti-rocket',  label: 'Lancé !',    earned: true },
    { icon: 'ti-file-cv', label: 'CV en ligne', earned: true },
    { icon: 'ti-school',  label: '3 écoles',   earned: true },
    { icon: 'ti-building',label: '10 candid.',  earned: false },
    { icon: 'ti-star',    label: 'Top profil',  earned: false },
    { icon: 'ti-check',   label: 'Admis !',     earned: false },
  ]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes badges</div>
          <div className="page-sub">3 badges débloqués sur 6</div>
        </div>
      </div>

      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-trophy" /> Progression</div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {badges.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div className={`badge-circle ${b.earned ? 'earned' : 'locked'}`}>
                <i className={`ti ${b.icon}`} />
              </div>
              <div style={{ fontSize: 11, color: b.earned ? 'var(--gold)' : 'var(--muted)', fontWeight: b.earned ? 500 : 400, textAlign: 'center' }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>

        {/* Message prochain badge */}
        <div style={{ background: 'var(--gold-soft)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-trophy" style={{ fontSize: 18, color: 'var(--gold)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#412402' }}>Encore 3 candidatures pour débloquer le badge !</div>
            <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>7 / 10 entreprises contactées</div>
          </div>
        </div>
      </div>
    </>
  )
}
