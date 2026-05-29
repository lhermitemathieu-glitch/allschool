'use client'

// Panel Home — Landing page complète Allschool
// Props:
//   onSwitch : (space: string) => void

export default function PanelHome({ onSwitch }) {
  return (
    <>
      {/* ── HERO ── */}
      <div className="lp-hero">
        <div className="lp-badge">
          <span className="lp-badge-dot" />
          La plateforme #1 de l'alternance en France
        </div>

        <h1>
          L'alternance,<br />
          enfin <em>simple</em> pour tout le monde.
        </h1>

        <p className="lp-hero-sub">
          Candidats visibles, entreprises connectées, écoles mises en avant.
          Tout le monde y gagne.
        </p>

        {/* Stats */}
        <div className="lp-stats">
          <div className="lp-stat">
            <span className="lp-stat-num">14 320</span>
            <span className="lp-stat-lbl">Candidats actifs</span>
          </div>
          <div className="lp-stat-sep" />
          <div className="lp-stat">
            <span className="lp-stat-num">218</span>
            <span className="lp-stat-lbl">Écoles référencées</span>
          </div>
          <div className="lp-stat-sep" />
          <div className="lp-stat">
            <span className="lp-stat-num">1 042</span>
            <span className="lp-stat-lbl">Entreprises inscrites</span>
          </div>
          <div className="lp-stat-sep" />
          <div className="lp-stat">
            <span className="lp-stat-num">3 840</span>
            <span className="lp-stat-lbl">Contrats signés</span>
          </div>
        </div>

        {/* CTA cards */}
        <div className="lp-cta-grid">
          <div className="lp-cta-card eco">
            <div className="lp-cta-icon"><i className="ti ti-school" /></div>
            <h3>Espace École</h3>
            <p>Valorisez vos formations, identifiez vos tops profils et attirez les entreprises partenaires.</p>
            <button className="lp-pill-btn" onClick={() => onSwitch('ecole')}>
              Accéder à mon espace <i className="ti ti-arrow-right" />
            </button>
          </div>
          <div className="lp-cta-card cand">
            <div className="lp-cta-icon"><i className="ti ti-user-circle" /></div>
            <h3>Espace Candidat</h3>
            <p>Crée ton profil, choisis tes écoles et sois visible des entreprises qui recrutent près de chez toi.</p>
            <button className="lp-pill-btn" onClick={() => onSwitch('candidat')}>
              Accéder à mon espace <i className="ti ti-arrow-right" />
            </button>
          </div>
          <div className="lp-cta-card ent">
            <div className="lp-cta-icon"><i className="ti ti-building" /></div>
            <h3>Espace Entreprise</h3>
            <p>Trouvez le bon alternant, près de chez vous, dans la meilleure école. Déposez votre annonce.</p>
            <button className="lp-pill-btn" onClick={() => onSwitch('entreprise')}>
              Accéder à mon espace <i className="ti ti-arrow-right" />
            </button>
          </div>
        </div>
      </div>

      {/* ── COMMENT ÇA MARCHE ── */}
      <div className="lp-section" style={{ background: 'var(--navy)' }}>
        <div className="lp-inner">
          <div className="lp-label">Comment ça marche</div>
          <div className="lp-title on-dark">3 espaces, 1 seule plateforme</div>
          <div className="lp-steps-grid">
            <div className="lp-step">
              <span className="lp-step-tag eco">École / CFA</span>
              <div className="lp-step-num">01</div>
              <h3>Créez votre page école</h3>
              <p>Publiez vos formations, taux de réussite et avis étudiants. Mettez vos meilleurs profils en avant auprès des entreprises.</p>
            </div>
            <div className="lp-step">
              <span className="lp-step-tag cand">Candidat</span>
              <div className="lp-step-num">02</div>
              <h3>Construisez votre profil</h3>
              <p>Déposez votre CV, choisissez vos écoles cibles, générez votre lien QR et suivez vos candidatures avec des badges.</p>
            </div>
            <div className="lp-step">
              <span className="lp-step-tag ent">Entreprise</span>
              <div className="lp-step-num">03</div>
              <h3>Recrutez le bon profil</h3>
              <p>Parcourez les candidats géolocalisés, déposez une annonce et utilisez nos simulateurs d'aides pour recruter sereinement.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AVANTAGES PAR ACTEUR ── */}
      <div className="lp-section" style={{ background: 'var(--light)' }}>
        <div className="lp-inner">
          <div className="lp-label">Ce qu'on vous offre</div>
          <div className="lp-title on-light">Les avantages pour chaque acteur</div>

          {/* Candidat */}
          <div className="lp-actor-block">
            <div className="lp-actor-header">
              <div className="lp-actor-icon cand"><i className="ti ti-user-circle" /></div>
              <div>
                <h2>Candidat</h2>
                <p>100% gratuit — crée ton profil et sois visible des entreprises qui recrutent</p>
              </div>
            </div>
            <div className="lp-feat-grid">
              <div className="lp-feat cand">
                <i className="ti ti-file-cv" />
                <div><strong>Profil & CV en ligne</strong><span>Dépose ton CV, décris-toi en quelques lignes et génère ton QR code à mettre sur ton CV papier.</span></div>
              </div>
              <div className="lp-feat cand">
                <i className="ti ti-map-pin" />
                <div><strong>Écoles près de chez toi</strong><span>Consulte les écoles autour de toi, leurs dates d'admission, leurs avis et leur sérieux.</span></div>
              </div>
              <div className="lp-feat cand">
                <i className="ti ti-trophy" />
                <div><strong>Badges & suivi de recherche</strong><span>Suis tes candidatures pas à pas, gagne des badges et reste motivé tout au long du process.</span></div>
              </div>
              <div className="lp-feat cand">
                <i className="ti ti-speakerphone" />
                <div><strong>Visible des entreprises</strong><span>Ton profil est mis en avant dans nos campagnes marketing auprès des recruteurs locaux.</span></div>
              </div>
            </div>
          </div>

          {/* Entreprise */}
          <div className="lp-actor-block">
            <div className="lp-actor-header">
              <div className="lp-actor-icon ent"><i className="ti ti-building" /></div>
              <div>
                <h2>Entreprise</h2>
                <p>Trouvez le bon alternant, au bon endroit, dans la meilleure école</p>
              </div>
            </div>
            <div className="lp-feat-grid">
              <div className="lp-feat ent">
                <i className="ti ti-search" />
                <div><strong>Recherche avancée de profils</strong><span>Filtrez par diplôme, localisation, âge et expérience. Accédez aux coordonnées avec un compte.</span></div>
              </div>
              <div className="lp-feat ent">
                <i className="ti ti-calculator" />
                <div><strong>Simulateur d'aides & de salaire</strong><span>Estimez les aides OPCO, le coût réel et les avantages fiscaux de recruter un alternant.</span></div>
              </div>
              <div className="lp-feat ent">
                <i className="ti ti-speakerphone" />
                <div><strong>Campagnes multi-écoles</strong><span>Diffusez vos besoins auprès de plusieurs écoles et profils en même temps, ciblés par zone.</span></div>
              </div>
              <div className="lp-feat ent">
                <i className="ti ti-chart-bar" />
                <div><strong>Chiffres & guides pratiques</strong><span>Statistiques sur l'alternance en France, avantages employeur, formations maître d'apprentissage.</span></div>
              </div>
            </div>
          </div>

          {/* École */}
          <div className="lp-actor-block" style={{ marginBottom: 0 }}>
            <div className="lp-actor-header">
              <div className="lp-actor-icon eco"><i className="ti ti-school" /></div>
              <div>
                <h2>École / CFA</h2>
                <p>CFA public : gratuit — CFA privé : abonnement + génération de leads qualifiés</p>
              </div>
            </div>
            <div className="lp-feat-grid">
              <div className="lp-feat eco">
                <i className="ti ti-layout" />
                <div><strong>Page école personnalisée</strong><span>Présentez vos formations, vos résultats, votre pédagogie. Une vitrine complète pour les candidats.</span></div>
              </div>
              <div className="lp-feat eco">
                <i className="ti ti-star" />
                <div><strong>Avis & indicateurs qualité</strong><span>Collectez les avis étudiants, affichez vos taux de réussite et vos taux de présentation aux examens.</span></div>
              </div>
              <div className="lp-feat eco">
                <i className="ti ti-users" />
                <div><strong>Valorisez vos meilleurs profils</strong><span>Mettez en avant vos candidats pour attirer les entreprises directement vers votre école.</span></div>
              </div>
              <div className="lp-feat eco">
                <i className="ti ti-trending-up" />
                <div><strong>Leads entreprises qualifiés</strong><span>Les entreprises qui recherchent vos profils vous contactent directement. Vous payez au lead généré.</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── POURQUOI ALLSCHOOL ── */}
      <div className="lp-section" style={{ background: 'var(--navy)' }}>
        <div className="lp-inner">
          <div className="lp-label">Pourquoi Allschool ?</div>
          <div className="lp-title on-dark">Les vrais avantages de la plateforme</div>
          <div className="lp-why-grid">
            <div className="lp-why-card">
              <i className="ti ti-map-pin" style={{ color: 'var(--teal)' }} />
              <div><h4>Proximité garantie</h4><p>Entreprises et candidats triés par géolocalisation. Fini les trajets impossibles, vive le bon match local.</p></div>
            </div>
            <div className="lp-why-card">
              <i className="ti ti-certificate" style={{ color: 'var(--accent)' }} />
              <div><h4>Qualité vérifiée</h4><p>Taux de réussite, avis étudiants, labels qualité : chaque école est évaluée de manière transparente.</p></div>
            </div>
            <div className="lp-why-card">
              <i className="ti ti-chart-bar" style={{ color: 'var(--purple)' }} />
              <div><h4>Chiffres & outils</h4><p>Simulateur d'aides, statistiques alternance France, guide OPCO — tout pour décider en connaissance de cause.</p></div>
            </div>
            <div className="lp-why-card">
              <i className="ti ti-star" style={{ color: 'var(--gold)' }} />
              <div><h4>Visibilité maximale</h4><p>Campagnes marketing ciblées pour les candidats. Les entreprises voient les meilleurs profils en priorité.</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div className="lp-section" style={{ background: 'var(--light)' }}>
        <div className="lp-cta-banner">
          <h2>Prêt à rejoindre Allschool ?</h2>
          <p>Des milliers de candidats, d'entreprises et d'écoles vous attendent.</p>
          <div className="lp-cta-btns">
            <button className="lp-cta-w" onClick={() => onSwitch('candidat')}>Je suis candidat</button>
            <button className="lp-cta-o" onClick={() => onSwitch('entreprise')}>Je suis une entreprise</button>
            <button className="lp-cta-o" onClick={() => onSwitch('ecole')}>Je suis une école</button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="lp-footer">
        <p>© 2025 <span>Allschool</span> · La plateforme de l'alternance en France</p>
      </div>
    </>
  )
}
