'use client'

import { useState, useEffect } from 'react'

/**
 * Notifications d'erreur ("toasts") — système partagé.
 *
 * Jusqu'ici, la plupart des échecs Supabase étaient silencieux : l'interface
 * mettait à jour l'écran comme si l'action avait réussi (AUDIT.md §I9).
 *
 * Usage côté panel :
 *   import { verifier } from '../ui/Toaster'
 *   const { error } = await supabase.from('offres').delete().eq('id', id)
 *   if (!verifier(error, "La suppression de l'offre a échoué — rien n'a été supprimé.")) return
 *   // …mise à jour de l'écran uniquement si l'action a réellement abouti
 *
 * Le composant <Toaster /> est monté une fois dans AppShell.
 */

// Bus module-level : pas besoin de contexte React au niveau des appels.
let listeners = []

export function notifier(message, type = 'erreur') {
  if (listeners.length === 0) {
    console.error('[notification]', message)
    return
  }
  listeners.forEach(fn => fn({ message, type }))
}

export function notifierErreur(message) {
  notifier(message, 'erreur')
}

/**
 * Vérifie le résultat d'une opération Supabase.
 * Si `error` est présent : journalise, affiche le message, renvoie false.
 */
export function verifier(error, message) {
  if (!error) return true
  console.error('[supabase]', message, error)
  notifierErreur(message)
  return false
}

const TYPE_STYLE = {
  erreur:  { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: 'ti-alert-triangle' },
  succes:  { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: 'ti-check' },
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function onNotif({ message, type }) {
      const id = `${Date.now()}-${Math.random()}`
      setToasts(t => [...t, { id, message, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 7000)
    }
    listeners.push(onNotif)
    return () => { listeners = listeners.filter(fn => fn !== onNotif) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
    }}>
      {toasts.map(t => {
        const s = TYPE_STYLE[t.type] || TYPE_STYLE.erreur
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: s.bg, border: `1.5px solid ${s.border}`, color: s.color,
            borderRadius: 12, padding: '12px 14px',
            boxShadow: '0 4px 16px rgba(14,27,46,0.12)',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5,
          }}>
            <i className={`ti ${s.icon}`} style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>{t.message}</div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.color, padding: 0, fontSize: 14, flexShrink: 0 }}
              aria-label="Fermer"
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
