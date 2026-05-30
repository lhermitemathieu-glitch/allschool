'use client'

// Composant TopNav — barre de navigation principale
// Props:
//   activeSpace : 'home' | 'candidat' | 'entreprise' | 'ecole' | 'backoffice'
//   onSwitch    : (space: string) => void
//   user        : { av: string, bg: string, name: string }

export default function TopNav({ activeSpace, onSwitch, user, onLogout }) {
  const spaces = [
    { key: 'candidat',   label: 'Candidat',   icon: 'ti-user-circle', cls: 'cand' },
    { key: 'entreprise', label: 'Entreprise',  icon: 'ti-building',    cls: 'ent'  },
    { key: 'ecole',      label: 'École',       icon: 'ti-school',      cls: 'eco'  },
    { key: 'backoffice', label: 'Backoffice',  icon: 'ti-settings',    cls: 'back' },
  ]

  return (
    <div className="topnav">
      {/* Logo */}
      <div className="topnav-logo" onClick={() => onSwitch('home')}>
        All<span>school</span>
      </div>

      {/* Espaces */}
      <div className="topnav-spaces">
        {spaces.map((s) => (
          <button
            key={s.key}
            className={`space-btn ${s.cls} ${activeSpace === s.key ? 'active ' + s.cls : ''}`}
            onClick={() => onSwitch(s.key)}
          >
            <i className={`ti ${s.icon}`} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Utilisateur + Logout */}
      <div className="topnav-right">
        <div className="user-pill">
          <div
            className="user-avatar"
            style={{ background: user?.bg || 'var(--navy)' }}
          >
            {user?.av || 'AS'}
          </div>
          <div className="user-name">{user?.name || 'Allschool'}</div>
        </div>
        {onLogout && (
          <button onClick={onLogout} style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            padding: '6px 10px',
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 0.15s',
          }}>
            <i className="ti ti-logout" style={{ fontSize: 15 }} />
            Déconnexion
          </button>
        )}
      </div>
    </div>
  )
}
