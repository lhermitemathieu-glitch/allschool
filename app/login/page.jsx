'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
    } else {
      router.push('/app')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div style={styles.page}>
      {/* Panneau gauche — branding */}
      <div style={styles.left}>
        <div style={styles.logo}>All<span style={{ color: 'var(--accent)' }}>school</span></div>
        <p style={styles.tagline}>La plateforme #1<br />de l'alternance</p>
        <div style={styles.dots}>
          <span style={{ ...styles.dot, background: 'var(--teal)' }} />
          <span style={{ ...styles.dot, background: 'var(--accent)' }} />
          <span style={{ ...styles.dot, background: 'var(--purple)' }} />
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div style={styles.right}>
        <div style={styles.card}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--navy)', marginBottom: '1.5rem', letterSpacing: '-0.3px' }}>
            Connexion
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>

            {/* Email */}
            <div style={styles.field}>
              <label style={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                style={styles.input}
              />
            </div>

            {/* Mot de passe */}
            <div style={styles.field}>
              <label style={styles.label} htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={styles.input}
              />
            </div>

            {/* Erreur */}
            {error && <p style={styles.error}>{error}</p>}

            {/* Bouton submit */}
            <button type="submit" disabled={loading} style={styles.submit}>
              {loading ? 'Chargement…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  },
  left: {
    flex: '0 0 380px',
    background: 'var(--navy)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '3rem',
    gap: '1.5rem',
  },
  logo: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: 36,
    color: 'white',
    letterSpacing: '-1px',
  },
  tagline: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 22,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.4,
  },
  dots: {
    display: 'flex',
    gap: 10,
    marginTop: '1rem',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--light)',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: '2rem',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(14,27,46,0.07)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--navy)',
  },
  input: {
    padding: '10px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'DM Sans, sans-serif',
    color: 'var(--navy)',
    background: 'white',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  error: {
    fontSize: 13,
    color: 'var(--red)',
    background: 'var(--red-soft)',
    padding: '10px 14px',
    borderRadius: 8,
  },
  submit: {
    padding: '12px',
    background: 'var(--navy)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    marginTop: 4,
  },
}
