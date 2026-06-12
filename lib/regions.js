/**
 * Régions françaises — source unique de vérité.
 * Code INSEE + libellé + centre géographique approximatif (pour l'API LBA qui
 * raisonne en lat/lng) + rayon de couverture indicatif.
 *
 * Remplace les copies divergentes présentes dans PanelCandidatOffres,
 * PanelCandidatEcoles, PanelCandidatFormations, PanelEcole et l'API formations-lba.
 */
export const REGIONS = [
  { code: '84', label: 'Auvergne-Rhône-Alpes',      lat: 45.44, lng: 4.39,  radius: 220 },
  { code: '27', label: 'Bourgogne-Franche-Comté',    lat: 47.28, lng: 5.00,  radius: 180 },
  { code: '53', label: 'Bretagne',                   lat: 48.11, lng: -2.93, radius: 150 },
  { code: '24', label: 'Centre-Val de Loire',        lat: 47.51, lng: 1.68,  radius: 160 },
  { code: '94', label: 'Corse',                      lat: 42.03, lng: 9.01,  radius: 100 },
  { code: '44', label: 'Grand Est',                  lat: 48.46, lng: 6.56,  radius: 220 },
  { code: '32', label: 'Hauts-de-France',            lat: 50.27, lng: 2.80,  radius: 150 },
  { code: '11', label: 'Île-de-France',              lat: 48.85, lng: 2.35,  radius: 80  },
  { code: '28', label: 'Normandie',                  lat: 49.18, lng: 0.36,  radius: 160 },
  { code: '75', label: 'Nouvelle-Aquitaine',         lat: 44.78, lng: 0.00,  radius: 250 },
  { code: '76', label: 'Occitanie',                  lat: 43.87, lng: 2.56,  radius: 250 },
  { code: '52', label: 'Pays de la Loire',           lat: 47.76, lng: -0.55, radius: 160 },
  { code: '93', label: "Provence-Alpes-Côte d'Azur", lat: 43.94, lng: 6.07,  radius: 180 },
]

/** Codes INSEE de toutes les régions (utile pour les recherches "France entière"). */
export const REGION_CODES = REGIONS.map(r => r.code)

/** Libellés seuls (pour les <select> des formulaires école). */
export const REGION_LABELS = REGIONS.map(r => r.label)
