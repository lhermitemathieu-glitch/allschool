'use client'

// Composant Sidebar — navigation latérale par espace
// Props:
//   space       : objet espace courant (label, dot, nav, user)
//   activePanel : string — panel actuellement actif
//   onNavigate  : (panelId: string) => void

export default function Sidebar({ space, activePanel, onNavigate }) {
  if (!space) return null

  return (
    <aside className="sidebar">
      {/* Titre de l'espace */}
      <div className="sidebar-space-label">
        <div
          className="sidebar-space-dot"
          style={{ background: space.dot }}
        />
        <span>{space.label}</span>
      </div>

      {/* Navigation */}
      <div>
        {space.nav.map((item, i) => {
          // Section / séparateur
          if (item.section !== undefined) {
            return item.section ? (
              <div key={i} className="nav-section">{item.section}</div>
            ) : null
          }

          const isActive = activePanel === item.panel
          return (
            <div
              key={i}
              className={`nav-item ${isActive ? 'active ' + item.cls : ''}`}
              onClick={() => item.panel && onNavigate(item.panel)}
            >
              <i className={`ti ${item.icon}`} />
              {item.label}
            </div>
          )
        })}
      </div>

      {/* Footer utilisateur */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div
            className="user-card-avatar"
            style={{ background: space.user.bg }}
          >
            {space.user.av}
          </div>
          <div>
            <div className="user-card-name">{space.user.name}</div>
            <div className="user-card-role">{space.user.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
