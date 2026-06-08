/**
 * Mapping secteurs Allschool → codes ROME
 * Utilisé pour interroger l'API La Bonne Alternance par secteur.
 *
 * Codes ROME : 1 lettre + 4 chiffres
 * Source : référentiel France Travail / ROME v4
 */

export const SECTEUR_ROME = {
  'Agriculture & Environnement': [
    'A1101', // Conduite de cultures légumières et maraîchères
    'A1102', // Horticulture et maraîchage
    'A1201', // Bûcheronnage et élagage
    'A1301', // Conseil et assistance technique en agriculture
    'A1302', // Contrôle et diagnostics de systèmes d'élevage
    'A1401', // Maintenance de matériels agricoles
    'A1501', // Aide agricole de production fruitière ou viticole
    'A1502', // Polyculture élevage
    'A1503', // Viticulture
  ],

  'Alimentation & Restauration': [
    'D1101', // Boulangerie-viennoiserie
    'D1102', // Charcuterie-traiteur
    'D1103', // Chocolaterie-confiserie
    'D1104', // Pâtisserie-confiserie-chocolaterie
    'D1105', // Poissonnerie
    'D1106', // Vente en alimentation
    'G1602', // Personnel de cuisine
    'G1603', // Personnel polyvalent en restauration
    'G1604', // Pâtissier-glacier-traiteur
    'G1605', // Plonge en restauration
  ],

  'Arts & Culture': [
    'B1101', // Création en arts plastiques
    'B1201', // Réalisation de contenus multimédias
    'B1301', // Décoration d'espaces de vente et d'exposition
    'K1601', // Gestion de patrimoine culturel
    'K1602', // Gestion de structure culturelle ou artistique
    'K1604', // Médiation culturelle et gestion de programme culturel
  ],

  'Audiovisuel & Spectacle': [
    'L1101', // Danse
    'L1201', // Art dramatique
    'L1301', // Musique et chant
    'L1401', // Réalisation cinématographique et audiovisuelle
    'L1501', // Fabrication et restauration en lutherie
    'L1502', // Facture instrumentale
    'E1101', // Animation de site multimédia
    'E1102', // Écriture d'ouvrages-textes
    'E1104', // Conception de contenus multimédias
    'E1105', // Tournage audiovisuel et cinématographique
    'E1106', // Journalisme et information média
    'E1205', // Réalisation de contenus multimédias
  ],

  'Automobile & Mécanique': [
    'I1101', // Maintenance mécanique industrielle
    'I1304', // Installation et maintenance d'équipements industriels et d'exploitation
    'I1606', // Mécanique automobile
    'I1607', // Carrosserie
    'I1608', // Peinture carrosserie
    'I1609', // Vente de véhicules
    'I1610', // Après-vente automobile
    'H2909', // Mécanique et travail des métaux
    'N1104', // Conduite de véhicules légers
  ],

  'Beauté & Bien-être': [
    'B1401', // Coiffure
    'B1402', // Esthétique et cosmétique
    'B1403', // Prothèse ongulaire
    'B1404', // Soins esthétiques et corporels
    'B1501', // Spa et balnéothérapie
    'J1412', // Psychologie
  ],

  'BTP & Construction': [
    'F1101', // Architecture du BTP et du paysage
    'F1201', // Conduite de travaux du BTP et génie civil
    'F1301', // Conduite de grue
    'F1501', // Montage de réseaux électriques et télécoms
    'F1601', // Application et décoration en plâtre-stuc-staff
    'F1602', // Électricité bâtiment
    'F1603', // Installation d'équipements sanitaires et thermiques
    'F1604', // Montage d'agencements
    'F1701', // Carrelage-mosaïque
    'F1702', // Chapiste-cimentier
    'F1703', // Construction en béton
    'F1704', // Couverture
    'F1705', // Peinture en bâtiment
    'F1706', // Pose de fermetures menuisées
    'F1707', // Pose de revêtements rigides
    'F1708', // Pose de revêtements souples
    'F1709', // Ravalements de façades
    'F1710', // Pose de menuiseries bois
  ],

  'Commerce & Vente': [
    'D1211', // Vente en décoration et équipement du foyer
    'D1213', // Vente en articles de sport et loisirs
    'D1214', // Vente en habillement-accessoires de la personne
    'D1301', // Management en force de vente
    'D1401', // Assistanat commercial
    'D1402', // Relation commerciale grands comptes et entreprises
    'D1403', // Relation commerciale auprès de particuliers
    'D1501', // Animation de vente
    'D1502', // Management et animation de rayon
    'D1503', // Marchandisage
    'D1504', // Direction de magasin de grande distribution
    'D1505', // Personnel de caisse
  ],

  'Communication, Marketing & Design': [
    'E1103', // Communication
    'M1703', // Communication
    'M1704', // Design
    'M1705', // Marketing
    'M1706', // Promotion des ventes
    'M1707', // Stratégie commerciale
    'B1201', // Réalisation de contenus multimédias
    'B1301', // Décoration d'espaces de vente et d'exposition
  ],

  'Éducation, Formation & Petite Enfance': [
    'K2101', // Conseil en développement
    'K2102', // Éducation et surveillance au sein d'établissements d'enseignement
    'K2201', // Animation éducative et sociale
    'K2301', // Formation professionnelle
    'K2302', // Coordination pédagogique
    'K1304', // Aide éducative
    'J1506', // Soins en crèches et structures d'accueil
    'K1204', // Aide auprès d'enfants
    'G1203', // Animation de loisirs auprès d'enfants ou d'adolescents
    'G1206', // Animation sportive
    'G1207', // Éducation sportive
    'G1208', // Management d'une structure sportive
  ],

  'Énergie & Électrotechnique': [
    'F1502', // Installation en télécommunications
    'H2601', // Électronique-électricité
    'I1302', // Installation et maintenance d'automatismes
    'I1303', // Installation et maintenance d'équipements industriels
    'I1401', // Maintenance d'installations de chauffage
    'I1402', // Maintenance d'installations thermiques
    'I1501', // Installation et maintenance en froid et climatisation
    'I1502', // Installation et maintenance d'équipements électriques
    'I1601', // Installation et maintenance en électronique
    'I1602', // Installation et maintenance télécoms et courants faibles
    'I1603', // Installation et maintenance en informatique industrielle
    'I1604', // Montage et câblage électronique
    'I1605', // Électrotechnique
  ],

  'Environnement & Développement Durable': [
    'A1303', // Ingénierie en agriculture et environnement naturel
    'A1401', // Maintenance de matériels agricoles
    'H1302', // Management et ingénierie HSE
    'H1303', // Intervention technique en Hygiène Sécurité Environnement
    'F1401', // Extraction et traitement des eaux et déchets
    'K2301', // Coordination de projets environnementaux
    'N1301', // Conception de systèmes logistiques verts
  ],

  'Finance & Comptabilité': [
    'C1101', // Actuariat
    'C1102', // Analyse et ingénierie financière
    'C1201', // Conseil en gestion de patrimoine financier
    'C1302', // Gestion financière et comptable
    'C1303', // Secrétariat et assistanat comptable
    'C1401', // Gestion en banque et assurance
    'M1201', // Analyse et études économiques
    'M1202', // Audit et contrôle comptables et financiers
    'M1203', // Comptabilité
    'M1204', // Contrôle de gestion
    'M1205', // Direction administrative et financière
    'M1206', // Management de groupe ou de service comptable
  ],

  'Hôtellerie & Tourisme': [
    'G1101', // Accueil touristique
    'G1201', // Accompagnement de voyages, d'activités culturelles ou sportives
    'G1301', // Conception de produits touristiques
    'G1401', // Assistance de direction d'hôtel-restaurant
    'G1404', // Réception en hôtellerie
    'G1501', // Personnel d'étage en hôtellerie
    'G1502', // Personnel de hall d'hôtel
    'G1601', // Management du personnel de cuisine
    'G1701', // Conciergerie en hôtellerie
    'G1801', // Hôtesse d'accueil
  ],

  'Immobilier & Gestion de Patrimoine': [
    'C1201', // Conseil en gestion de patrimoine financier
    'C1501', // Gérance immobilière
    'C1502', // Gestion locative immobilière
    'C1503', // Transaction immobilière
    'C1504', // Syndic de copropriété
    'F1101', // Expertise immobilière
    'M1202', // Audit et conseil en immobilier
  ],

  'Industrie & Production': [
    'H1401', // Management et ingénierie gestion industrielle
    'H1402', // Management et ingénierie méthodes et industrialisation
    'H1403', // Management et ingénierie qualité industrielle
    'H1404', // Qualité-contrôle industriel
    'H2101', // Fabrication de mobilier et de menuiserie
    'H2301', // Industrie agroalimentaire
    'H2401', // Mécanique-électricité
    'H2501', // Plasturgie
    'H2701', // Maintenance industrielle
    'H2702', // Maintenance des bâtiments et des locaux
    'H2903', // Aéronautique et spatial
    'H3201', // Préparation de matières et produits industriels
    'H3301', // Conduite d'installation automatisée de production industrielle
    'H3303', // Conduite de ligne de production alimentaire
    'K2503', // Sécurité et surveillance privée
    'K1702', // Sécurité et défense
  ],

  'Informatique & Numérique': [
    'M1801', // Administration de systèmes d'information
    'M1802', // Expertise et support en systèmes d'information
    'M1803', // Direction des systèmes d'information
    'M1804', // Études et développement informatique
    'M1805', // Études et développement de systèmes d'information
    'M1806', // Conseil et maîtrise d'ouvrage en systèmes d'information
    'M1807', // Architecture et urbanisation des systèmes d'information
    'M1808', // Information géographique
    'M1810', // Production et exploitation de systèmes d'information
    'M1811', // Data - Intelligence artificielle
    'M1812', // Cybersécurité
  ],

  'Installation & Maintenance': [
    'I1101', // Maintenance mécanique industrielle
    'I1102', // Réparation de biens électrodomestiques
    'I1201', // Montage et installation d'équipements industriels
    'I1301', // Installation et maintenance d'ascenseurs
    'I1302', // Installation et maintenance d'automatismes
    'I1303', // Installation et maintenance d'équipements industriels
    'I1304', // Installation et maintenance d'équipements de process
    'I1401', // Maintenance d'installations de chauffage
    'I1402', // Maintenance d'installations thermiques
    'I1501', // Installation et maintenance en froid et climatisation
    'I1502', // Installation et maintenance d'équipements électriques
    'I1601', // Installation et maintenance en électronique
    'I1602', // Installation et maintenance télécoms
  ],

  'Juridique & Droit': [
    'K1901', // Aide et médiation judiciaire
    'K1902', // Collaboration juridique
    'K1903', // Défense et conseil juridique
    'K1904', // Magistrature
    'M1603', // Secrétariat et assistanat juridique
  ],

  'Logistique & Transport': [
    'N1101', // Conduite de transport de marchandises sur longue distance
    'N1102', // Conduite de transport de particuliers
    'N1103', // Conduite de transport en commun sur route
    'N1201', // Affrètement transport
    'N1202', // Gestion de transit international
    'N1301', // Conception de systèmes logistiques
    'N1302', // Direction de site logistique
    'N1303', // Intervention technique d'exploitation logistique
    'N3101', // Encadrement de la manutention et de la logistique
    'N3201', // Distribution et livraison express
  ],

  'Mode & Textile': [
    'B1801', // Stylisme
    'B1802', // Modélisme
    'B1803', // Couture-flou
    'B1804', // Tailleur-couturière
    'B1805', // Cordonnerie
    'B1806', // Maroquinerie
    'D1214', // Vente en habillement-accessoires de la personne
    'H2802', // Fabrication en industrie textile
  ],

  'Pharmacie & Laboratoire': [
    'J1201', // Biologie médicale
    'J1301', // Nursing
    'J1302', // Pharmacie-préparation officinale
    'J1303', // Préparation et contrôle de produits pharmaceutiques
    'J1304', // Pharmacie hospitalière
    'H1501', // Contrôle qualité en chimie-pharmacie
    'H2201', // Industrie chimique
    'H2202', // Industrie pharmaceutique et cosmétique
  ],

  'Ressources Humaines & Secrétariat': [
    'M1401', // Conseil en organisation et management d'entreprise
    'M1402', // Conseil en recrutement
    'M1403', // Développement des ressources humaines
    'M1404', // Management et gestion de ressources humaines
    'M1405', // Administration du personnel
    'M1502', // Développement des ressources humaines
    'M1601', // Accueil et renseignements
    'M1602', // Secrétariat et assistanat de direction
    'M1603', // Secrétariat et assistanat juridique
    'M1604', // Assistanat de direction
    'M1605', // Assistanat en ressources humaines
    'M1606', // Saisie de données
    'M1607', // Secrétariat
  ],

  'Santé & Social': [
    'J1101', // Médecine généraliste
    'J1301', // Nursing
    'J1401', // Audioprothèse
    'J1402', // Kinésithérapie-rééducation
    'J1403', // Optique-lunetterie
    'J1501', // Soins infirmiers généralistes
    'J1502', // Coordination de services médicaux ou paramédicaux
    'J1503', // Soins infirmiers spécialisés - Bloc opératoire
    'J1504', // Soins infirmiers spécialisés - Puériculture
    'J1505', // Soins infirmiers spécialisés - Anesthésie
    'K1201', // Action sociale
    'K1202', // Aide auprès d'adultes
    'K1203', // Aide à domicile
    'K1205', // Information sociale
    'K1206', // Intervention socioéducative
    'K1207', // Intervention sociojuridique
  ],
}

/**
 * Retourne les codes ROME pour un secteur donné.
 * @param {string} secteur - Nom du secteur Allschool
 * @returns {string[]} Liste de codes ROME
 */
export function getRomesForSecteur(secteur) {
  return SECTEUR_ROME[secteur] ?? []
}

/**
 * Retourne tous les codes ROME uniques pour une liste de secteurs.
 * @param {string[]} secteurs
 * @returns {string[]}
 */
export function getRomesForSecteurs(secteurs) {
  const codes = new Set()
  for (const s of secteurs) {
    for (const code of getRomesForSecteur(s)) {
      codes.add(code)
    }
  }
  return [...codes]
}
