import Link from 'next/link'
import { getPostBySlug, getAllPosts } from '../../../lib/blog'
import Footer from '../../../components/Footer'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  return { title: `${post.title} — Allschool`, description: post.description }
}

// Rendu Markdown très simple sans dépendance externe
function renderMarkdown(md) {
  const lines = md.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.5px', margin: '2rem 0 0.75rem' }}>{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-1px', margin: '2rem 0 1rem' }}>{line.slice(2)}</h1>)
    } else if (line.startsWith('- ')) {
      // Collecte la liste
      const items = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(<li key={i} style={{ fontSize: 15, color: 'var(--navy)', lineHeight: 1.7, marginBottom: 4 }}>{parseLine(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} style={{ paddingLeft: '1.5rem', margin: '0.75rem 0' }}>{items}</ul>)
      continue
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />)
    } else {
      elements.push(<p key={i} style={{ fontSize: 15, color: 'var(--navy)', lineHeight: 1.75, margin: '0.5rem 0' }}>{parseLine(line)}</p>)
    }
    i++
  }
  return elements
}

function parseLine(text) {
  // Gras **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

const TAG_COLORS = {
  teal:   { bg: 'var(--teal-soft)',   color: 'var(--teal-mid)' },
  accent: { bg: 'var(--accent-soft)', color: '#993C1D' },
  purple: { bg: 'var(--purple-soft)', color: 'var(--purple-mid)' },
  gold:   { bg: 'var(--gold-soft)',   color: 'var(--gold)' },
}

export default async function BlogPost({ params }) {
  const { slug } = await params
  let post
  try { post = getPostBySlug(slug) } catch { notFound() }

  const tc = TAG_COLORS[post.tagColor] ?? TAG_COLORS.teal

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
        <Link href="/blog" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          ← Blog
        </Link>
      </nav>

      {/* ARTICLE */}
      <article style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 2rem', width: '100%', flex: 1 }}>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
          {post.tag && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, fontWeight: 500, background: tc.bg, color: tc.color }}>
              {post.tag}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Titre */}
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '1rem' }}>
          {post.title}
        </h1>

        {/* Description */}
        <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 300, borderBottom: '0.5px solid var(--border)', paddingBottom: '2rem' }}>
          {post.description}
        </p>

        {/* Contenu */}
        <div>{renderMarkdown(post.content)}</div>

      </article>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}
