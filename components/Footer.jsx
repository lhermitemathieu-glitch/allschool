import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--navy)', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>

      {/* Contenu principal */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 2rem', display: 'flex', flexWrap: 'wrap', gap: '2.5rem', justifyContent: 'space-between' }}>

        {/* Logo + baseline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'white', letterSpacing: '-0.5px' }}>
            All<span style={{ color: 'var(--accent)' }}>school</span>
          </span>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', maxWidth: 220, lineHeight: 1.6 }}>
            Démocratiser l&rsquo;alternance en France.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }} />
          </div>
        </div>

        {/* Navigation */}
        <div>
          <p style={sectionTitle}>Navigation</p>
          <div style={linkList}>
            <Link href="/" style={linkStyle}>Accueil</Link>
            <Link href="/blog" style={linkStyle}>Blog</Link>
          </div>
        </div>

        {/* Informations légales */}
        <div>
          <p style={sectionTitle}>Informations légales</p>
          <div style={linkList}>
            <span style={infoStyle}>Mentions légales — <em style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.25)' }}>À venir</em></span>
            <span style={infoStyle}>Politique de confidentialité — <em style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.25)' }}>Ce site ne collecte aucune donnée personnelle.</em></span>
            <span style={infoStyle}>Cookies — <em style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.25)' }}>Ce site n&rsquo;utilise pas de cookies.</em></span>
            <span style={infoStyle}>CGU / CGV — <em style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.25)' }}>Non applicable pour le moment.</em></span>
          </div>
        </div>

      </div>

      {/* Bandeau copyright */}
      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          © 2026 – Tous droits réservés
        </p>
      </div>

    </footer>
  )
}

const sectionTitle = {
  fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
  marginBottom: '0.75rem',
}

const linkList = {
  display: 'flex', flexDirection: 'column', gap: 8,
}

const linkStyle = {
  fontSize: 13, color: 'rgba(255,255,255,0.5)',
  textDecoration: 'none', transition: 'color 0.15s',
}

const infoStyle = {
  fontSize: 12, color: 'rgba(255,255,255,0.4)',
  lineHeight: 1.6, display: 'block', maxWidth: 320,
}
