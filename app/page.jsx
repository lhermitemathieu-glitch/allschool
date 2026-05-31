import Link from 'next/link'
import Footer from '../components/Footer'

export default function LandingPage() {

  return (
    <div style={{ minHeight: '100vh', background: 'var(--light)', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{
        background: 'var(--navy)', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'white', letterSpacing: '-0.5px' }}>
          All<span style={{ color: 'var(--accent)' }}>school</span>
        </span>
        <Link href="/blog" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, textDecoration: 'none' }}>
          Blog →
        </Link>
      </nav>

      {/* HERO */}
      <section style={{
        background: 'var(--navy)',
        padding: '5rem 2rem 5rem',
        textAlign: 'center',
        flex: 'none',
      }}>
        {/* Badge "en construction" */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.07)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 100, padding: '7px 18px 7px 12px',
          fontSize: 13, color: 'rgba(255,255,255,0.65)',
          marginBottom: '2.5rem',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          En construction — quelque chose arrive
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(36px, 6vw, 68px)', lineHeight: 1.02,
          color: 'white', letterSpacing: '-2.5px',
          maxWidth: 820, margin: '0 auto 1.75rem',
        }}>
          L&rsquo;alternance,<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>enfin démocratisée.</em>
        </h1>

        <p style={{
          fontSize: 18, color: 'rgba(255,255,255,0.45)',
          maxWidth: 520, margin: '0 auto',
          lineHeight: 1.7, fontWeight: 300,
        }}>
          Ici on construit quelque chose de grand.<br />
          Patience, ça va arriver — et ça va changer les choses.
        </p>
      </section>

      {/* MISSION */}
      <section style={{ padding: '4rem 2rem', background: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '2px',
            textTransform: 'uppercase', color: 'var(--accent)',
            textAlign: 'center', marginBottom: '0.75rem',
          }}>
            Notre mission
          </p>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px, 3.5vw, 38px)',
            fontWeight: 800, letterSpacing: '-1px', textAlign: 'center',
            color: 'var(--navy)', marginBottom: '3rem',
          }}>
            Trois acteurs. Un seul objectif.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

            {/* Candidats */}
            <div style={cardStyle}>
              <div style={{ ...iconStyle, background: 'var(--teal-soft)' }}>
                <i className="ti ti-user-circle" style={{ fontSize: 22, color: 'var(--teal)' }} />
              </div>
              <div style={{ width: 3, height: 48, background: 'var(--teal)', borderRadius: 100, flexShrink: 0 }} />
              <div>
                <h3 style={cardTitle}>Candidats</h3>
                <p style={cardText}>
                  Plus de visibilité pour ceux qui cherchent une alternance.
                  Un profil mis en avant, des candidatures organisées,
                  et des bons plans pour décrocher le contrat idéal.
                </p>
              </div>
            </div>

            {/* Entreprises */}
            <div style={cardStyle}>
              <div style={{ ...iconStyle, background: 'var(--accent-soft)' }}>
                <i className="ti ti-building" style={{ fontSize: 22, color: 'var(--accent)' }} />
              </div>
              <div style={{ width: 3, height: 48, background: 'var(--accent)', borderRadius: 100, flexShrink: 0 }} />
              <div>
                <h3 style={cardTitle}>Entreprises</h3>
                <p style={cardText}>
                  Un accélérateur pour recruter vite et bien.
                  Trouvez les profils qui matchent, gérez vos offres,
                  et connectez-vous aux bonnes écoles près de chez vous.
                </p>
              </div>
            </div>

            {/* Écoles */}
            <div style={cardStyle}>
              <div style={{ ...iconStyle, background: 'var(--purple-soft)' }}>
                <i className="ti ti-school" style={{ fontSize: 22, color: 'var(--purple)' }} />
              </div>
              <div style={{ width: 3, height: 48, background: 'var(--purple)', borderRadius: 100, flexShrink: 0 }} />
              <div>
                <h3 style={cardTitle}>Écoles</h3>
                <p style={cardText}>
                  Une vitrine pour se démarquer.
                  Valorisez vos formations, vos apprentis,
                  et développez vos partenariats entreprises sur une seule plateforme.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SPACER */}
      <div style={{ flex: 1 }} />

      {/* FOOTER */}
      <div style={{ textAlign: 'center', padding: '1rem 0 0' }}>
        <Link href="/login" className="lp-access-link">Accès plateforme</Link>
      </div>
      <Footer />
    </div>
  )
}

const cardStyle = {
  background: 'var(--light)',
  borderRadius: 16,
  border: '0.5px solid var(--border)',
  padding: '1.5rem',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 16,
}

const iconStyle = {
  width: 44, height: 44, borderRadius: 12,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

const cardTitle = {
  fontFamily: 'Syne, sans-serif',
  fontSize: 16, fontWeight: 800,
  color: 'var(--navy)', letterSpacing: '-0.3px',
  marginBottom: 6,
}

const cardText = {
  fontSize: 13, color: 'var(--muted)',
  lineHeight: 1.65,
}
