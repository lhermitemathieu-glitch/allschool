'use client'

export default function PanelCandidatProfil() {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mon profil</div>
          <div className="page-sub">Complété à 72%</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-sm"><i className="ti ti-qrcode" /> QR Code</button>
          <button className="btn-sm teal"><i className="ti ti-device-floppy" /> Enregistrer</button>
        </div>
      </div>

      {/* Carte identité */}
      <div className="s-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--teal-mid)' }}>TM</div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <i className="ti ti-camera" style={{ fontSize: 11, color: 'white' }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>Thomas Martin</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="pill teal"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> Paris 11e</span>
            <span className="pill purple">Bachelor Marketing</span>
            <span className="pill accent">Dispo sept. 2025</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Passionné par le marketing digital et la stratégie de contenu. Je recherche une alternance pour septembre 2025.
          </div>
          <div style={{ background: 'var(--light)', borderRadius: 100, height: 5, marginTop: 10 }}>
            <div style={{ width: '72%', height: 5, borderRadius: 100, background: 'var(--teal)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="btn-sm"><i className="ti ti-edit" /> Modifier</button>
          <button className="btn-sm"><i className="ti ti-link" /> Mon lien</button>
        </div>
      </div>

      {/* Grille infos */}
      <div className="grid3">
        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-certificate" /> Diplômes</div>
            <button className="btn-sm" style={{ fontSize: 11 }}>+ Ajouter</button>
          </div>
          <div className="entry-row">
            <div className="e-av purple"><i className="ti ti-school" style={{ fontSize: 13 }} /></div>
            <div><div className="e-name">Bachelor Marketing</div><div className="e-meta">En cours · 2025</div></div>
          </div>
          <div className="entry-row">
            <div className="e-av purple"><i className="ti ti-school" style={{ fontSize: 13 }} /></div>
            <div><div className="e-name">BTS Commerce Int.</div><div className="e-meta">IUT Paris · 2024</div></div>
          </div>
        </div>

        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-heart" /> Passions</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <span className="tag hi">Social media</span>
            <span className="tag hi">Copywriting</span>
            <span className="tag hi">UX Design</span>
            <span className="tag hi">Data</span>
          </div>
        </div>

        <div className="s-card" style={{ marginBottom: 0 }}>
          <div className="s-card-header">
            <div className="s-card-title"><i className="ti ti-confetti" /> Loisirs</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <span className="tag">Musique</span>
            <span className="tag">Running</span>
            <span className="tag">Photo</span>
            <span className="tag">Lecture</span>
          </div>
        </div>
      </div>
    </>
  )
}
