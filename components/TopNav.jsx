'use client'

// Composant TopNav — barre de navigation principale
// Props:
//   activeSpace : 'home' | 'candidat' | 'entreprise' | 'ecole' | 'backoffice'
//   onSwitch    : (space: string) => void
//   user        : { av: string, bg: string, name: string }

export default function TopNav({ activeSpace, onSwitch, user, onLogout, allowedSpaces = [], notifCount = 0, onNotifClick }) {
  const ALL_SPACES = [
    { key: 'candidat',   label: 'Candidat',   icon: 'ti-user-circle', cls: 'cand' },
    { key: 'entreprise', label: 'Entreprise',  icon: 'ti-building',    cls: 'ent'  },
    { key: 'ecole',      label: 'École',       icon: 'ti-school',      cls: 'eco'  },
    { key: 'backoffice', label: 'Backoffice',  icon: 'ti-settings',    cls: 'back' },
  ]
  const spaces = ALL_SPACES.filter((s) => allowedSpaces.includes(s.key))

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

      {/* Cloche notifications */}
      {onNotifClick && (
        <button
          onClick={onNotifClick}
          style={{
            position: 'relative', background: notifCount > 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            border: 'none', borderRadius: 8, color: notifCount > 0 ? 'white' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer', padding: '6px 10px', fontSize: 15, display: 'flex', alignItems: 'center',
            transition: 'all 0.15s',
          }}
          title={notifCount > 0 ? `${notifCount} action${notifCount > 1 ? 's' : ''} à faire` : 'Mes actions'}
        >
          <i className="ti ti-bell" />
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 8, height: 8, borderRadius: '50%',
              background: '#ef4444', border: '1.5px solid var(--navy)',
            }} />
          )}
        </button>
      )}

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
