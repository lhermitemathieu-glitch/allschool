'use client'

import { useState, useRef } from 'react'

/**
 * Avatar avec upload optionnel au clic — composant partagé.
 * Remplace les trois copies présentes dans PanelEntreprise, PanelCandidatProfil
 * et PanelBackDetail.
 *
 * @param {string|null} url       URL de la photo (sinon initiales sur fond coloré)
 * @param {string} initials       initiales affichées en l'absence de photo
 * @param {number} size           diamètre en px (défaut 64)
 * @param {string} bg / color     fond / couleur des initiales
 * @param {(file:File)=>void} onUpload  si fourni, l'avatar devient cliquable
 * @param {boolean} uploading     affiche un loader pendant l'upload
 */
export default function AvatarPhoto({
  url,
  initials,
  size = 64,
  bg = 'var(--teal-soft)',
  color = 'var(--teal-mid)',
  onUpload,
  uploading,
}) {
  const inputRef = useRef(null)
  const [hover, setHover] = useState(false)

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: onUpload ? 'pointer' : 'default' }}
      onClick={() => onUpload && inputRef.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {url ? (
        <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: size * 0.3, fontWeight: 800, color }}>
          {initials}
        </div>
      )}
      {onUpload && (hover || uploading) && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${uploading ? 'ti-loader' : 'ti-camera'}`} style={{ color: 'white', fontSize: Math.round(size * 0.3) }} />
        </div>
      )}
      {onUpload && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files[0]; if (f) onUpload(f); e.target.value = '' }}
        />
      )}
    </div>
  )
}
