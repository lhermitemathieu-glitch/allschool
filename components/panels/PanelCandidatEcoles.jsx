'use client'

export default function PanelCandidatEcoles() {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mes écoles</div>
          <div className="page-sub">Suivi de vos candidatures scolaires</div>
        </div>
      </div>

      {/* Liste écoles */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-school" /> Écoles cibles & avancement</div>
          <button className="btn-sm">+ Ajouter</button>
        </div>
        <div className="entry-row">
          <div className="e-av purple">ECV</div>
          <div style={{ flex: 1 }}><div className="e-name">ECV Digital</div><div className="e-meta">Bachelor Design UX</div></div>
          <span className="pill teal">Admis !</span>
        </div>
        <div className="entry-row">
          <div className="e-av purple">ISG</div>
          <div style={{ flex: 1 }}><div className="e-name">ISEG Marketing</div><div className="e-meta">Bachelor Marketing Digital</div></div>
          <span className="pill accent">En process</span>
        </div>
        <div className="entry-row">
          <div className="e-av purple">SUP</div>
          <div style={{ flex: 1 }}><div className="e-name">Sup de Pub</div><div className="e-meta">Bachelor Com. & Pub</div></div>
          <span className="pill" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>Dossier envoyé</span>
        </div>
        <div className="entry-row">
          <div className="e-av purple">IIM</div>
          <div style={{ flex: 1 }}><div className="e-name">IIM Digital School</div><div className="e-meta">Bachelor Marketing</div></div>
          <span className="pill">À contacter</span>
        </div>
      </div>

      {/* Avancement ISEG */}
      <div className="s-card">
        <div className="s-card-header">
          <div className="s-card-title"><i className="ti ti-list-check" /> Avancement — ISEG Marketing</div>
        </div>
        <div className="step-row">
          <div className="step-dot done"><i className="ti ti-check" /></div>
          <span style={{ fontSize: 13, color: 'var(--navy)' }}>Dossier de candidature envoyé</span>
        </div>
        <div className="step-line" />
        <div className="step-row">
          <div className="step-dot done"><i className="ti ti-check" /></div>
          <span style={{ fontSize: 13, color: 'var(--navy)' }}>Entretien de motivation passé</span>
        </div>
        <div className="step-line" />
        <div className="step-row">
          <div className="step-dot current"><i className="ti ti-clock" /></div>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>En attente de réponse école</span>
        </div>
        <div className="step-line" />
        <div className="step-row">
          <div className="step-dot todo"><i className="ti ti-circle" /></div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Trouver une entreprise</span>
        </div>
        <div className="step-line" />
        <div className="step-row">
          <div className="step-dot todo"><i className="ti ti-circle" /></div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Signature du contrat</span>
        </div>
      </div>
    </>
  )
}
