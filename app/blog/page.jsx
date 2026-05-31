import Link from 'next/link'
import { getAllPosts } from '../../lib/blog'

const TAG_COLORS = {
  teal:   { bg: 'var(--teal-soft)',   color: 'var(--teal-mid)' },
  accent: { bg: 'var(--accent-soft)', color: '#993C1D' },
  purple: { bg: 'var(--purple-soft)', color: 'var(--purple-mid)' },
  gold:   { bg: 'var(--gold-soft)',   color: 'var(--gold)' },
}

export const metadata = {
  title: 'Blog — Allschool',
  description: 'Suivez la construction d\'Allschool et nos réflexions sur l\'alternance.',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--light)', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{
        background: 'var(--navy)', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'white', letterSpacing: '-0.5px', textDecoration: 'none' }}>
          All<span style={{ color: 'var(--accent)' }}>school</span>
        </Link>
        <Link href="/" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          ← Retour
        </Link>
      </nav>

      {/* HEADER */}
      <section style={{ background: 'var(--navy)', padding: '3.5rem 2rem 3rem', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem' }}>
          Blog
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 46px)', color: 'white', letterSpacing: '-1.5px', marginBottom: '0.75rem' }}>
          On vous explique ce qu&rsquo;on fait.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6, fontWeight: 300 }}>
          Réflexions, décisions, coulisses — la construction d&rsquo;Allschool en direct.
        </p>
      </section>

      {/* ARTICLES */}
      <section style={{ padding: '3rem 2rem', maxWidth: 760, margin: '0 auto', width: '100%' }}>
        {posts.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Aucun article pour l&rsquo;instant.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => {
            const tc = TAG_COLORS[post.tagColor] ?? TAG_COLORS.teal
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <div className="blog-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                    {post.tag && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, fontWeight: 500, background: tc.bg, color: tc.color }}>
                        {post.tag}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                    {post.description}
                  </p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: '1rem', fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>
                    Lire l&rsquo;article →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* FOOTER */}
      <div style={{ marginTop: 'auto' }}>
        <footer style={{ background: 'var(--navy)', borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '1.5rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            All<span style={{ color: 'var(--accent)' }}>school</span> — Démocratiser l&rsquo;alternance
          </p>
        </footer>
      </div>
    </div>
  )
}
