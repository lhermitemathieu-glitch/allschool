import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient as createServerClient } from '../../../lib/supabase/server'
import { getRomesForSecteurs } from '../../../lib/rome-mapping'
import { lbaNiveauToKey } from '../../../lib/niveaux'

const LBA_BASE = 'https://api.apprentissage.beta.gouv.fr/api'
const CALLER   = 'allschool'

const ALL_REGIONS = ['84','27','53','24','94','44','32','11','28','75','76','52','93']

// Tous les codes ROME découpés en batches de 20 — utilisé pour le mode ecoles (couverture complète)
const ALL_ROME_BATCHES = [
  'A1101,A1102,A1201,A1301,A1302,A1401,A1501,A1502,A1503,D1101,D1102,D1103,D1104,D1105,D1106,G1602,G1603,G1604,G1605,B1101',
  'B1201,B1301,K1601,K1602,K1604,L1101,L1201,L1301,L1401,L1501,L1502,E1101,E1102,E1104,E1105,E1106,E1205,I1101,I1304,I1606',
  'I1607,I1608,I1609,I1610,H2909,N1104,B1401,B1402,B1403,B1404,B1501,J1412,F1101,F1201,F1301,F1501,F1601,F1602,F1603,F1604',
  'F1701,F1702,F1703,F1704,F1705,F1706,F1707,F1708,F1709,F1710,D1211,D1213,D1214,D1301,D1401,D1402,D1403,D1501,D1502,D1503',
  'D1504,D1505,E1103,M1703,M1704,M1705,M1706,M1707,K2101,K2102,K2201,K2301,K2302,K1304,J1506,K1204,G1203,G1206,G1207,G1208',
  'F1502,H2601,I1302,I1303,I1401,I1402,I1501,I1502,I1601,I1602,I1603,I1604,I1605,A1303,H1302,H1303,F1401,N1301,C1101,C1102',
  'C1201,C1302,C1303,C1401,M1201,M1202,M1203,M1204,M1205,M1206,G1101,G1201,G1301,G1401,G1404,G1501,G1502,G1601,G1701,G1801',
  'C1501,C1502,C1503,C1504,H1401,H1402,H1403,H1404,H2101,H2301,H2401,H2501,H2701,H2702,H2903,H3201,H3301,H3303,K2503,K1702',
  'M1801,M1802,M1803,M1804,M1805,M1806,M1807,M1808,M1810,M1811,M1812,I1102,I1201,I1301,K1901,K1902,K1903,K1904,M1603,N1101',
  'N1102,N1103,N1201,N1202,N1302,N1303,N3101,N3201,B1801,B1802,B1803,B1804,B1805,B1806,H2802,J1201,J1301,J1302,J1303,J1304',
  'H1501,H2201,H2202,M1401,M1402,M1403,M1404,M1405,M1502,M1601,M1602,M1604,M1605,M1606,M1607,J1101,J1401,J1402,J1403,J1501',
  'J1502,J1503,J1504,J1505,K1201,K1202,K1203,K1205,K1206,K1207',
]

// Points stratégiques pour la recherche distanciel avec rayon 300 km (couverture nationale)
const DISTANCIEL_POINTS = [
  { lat: 48.8566, lng: 2.3522 },   // Paris  — couvre Nord/Est/Centre
  { lat: 44.8378, lng: -0.5792 },  // Bordeaux — couvre Sud-Ouest
  { lat: 43.2965, lng: 5.3698 },   // Marseille — couvre Sud/Sud-Est
]

const SIGLE_LABEL = {
  'CAP':        'CAP',
  'BAC PRO':    'Bac Pro',
  'BP':         'BP',
  'BM':         'Brevet de Maîtrise',
  'BTS':        'BTS',
  'LIC-PRO':    'Licence Pro',
  'LIC LMD':    'Licence',
  'MASTER PRO': 'Master',
  'MASTER LMD': 'Master',
  'MS':         'Mastère Spé.',
  'DCG':        'DCG',
  'DSCG':       'DSCG',
  'DEJEPS':     'DEJEPS',
  'BP JEPS':    'BP JEPS',
  'CS3':        'Certif. de Spéc.',
}

function diplomeLabel(sigle, libelle) {
  if (!sigle) return null
  if (SIGLE_LABEL[sigle]) return SIGLE_LABEL[sigle]
  if (sigle.startsWith('TH')) return 'Titre Pro'
  if (sigle.startsWith('DIV')) return 'Diplôme'
  if (sigle.startsWith('DIP')) return 'Diplôme'
  return sigle
}

/**
 * GET /api/formations-lba
 *
 * Paramètres acceptés :
 *   secteurs   — secteurs Allschool (JSON array stringifié), ex: '["Informatique & Numérique"]'
 *   keyword    — mot-clé libre (filtré côté serveur sur le titre)
 *   latitude   — pour recherche géo
 *   longitude  — pour recherche géo
 *   radius     — rayon en km (défaut 30)
 *   region     — code région INSEE (ex: "11") — utilisé si pas de lat/lng
 *   niveau     — clé de niveau interne (cap, bts, bach, master…)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secteursRaw = searchParams.get('secteurs')
  const keyword     = (searchParams.get('keyword') || '').toLowerCase().trim()
  const latitude    = searchParams.get('latitude')
  const longitude   = searchParams.get('longitude')
  const radius      = searchParams.get('radius') || '30'
  const region      = searchParams.get('region')
  const niveauKey   = searchParams.get('niveau')
  const modaliteKey = searchParams.get('modalite')
  const mode        = searchParams.get('mode') // 'ecoles' → couverture complète tous secteurs

  let secteurs = []
  try { secteurs = secteursRaw ? JSON.parse(secteursRaw) : [] } catch { secteurs = [] }

  const romes = secteurs.length > 0
    ? getRomesForSecteurs(secteurs).slice(0, 20)
    : []

  const token = process.env.LBA_API_TOKEN
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const fetchRegion = async (regionCode, extraParams = {}) => {
    const params = new URLSearchParams({ caller: CALLER })
    if (romes.length > 0) params.set('romes', romes.join(','))
    params.set('region', regionCode)
    Object.entries(extraParams).forEach(([k, v]) => params.set(k, v))
    const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.data || []
  }

  try {
    let rawItems = []

    if (mode === 'ecoles') {
      // ── Mode écoles : couverture complète via tous les batches ROME en parallèle ──
      if (!latitude && !longitude && !region) {
        return NextResponse.json({ results: [] })
      }
      const fetchBatch = async (romeBatch) => {
        const params = new URLSearchParams({ caller: CALLER, romes: romeBatch })
        if (latitude && longitude) {
          params.set('latitude', latitude)
          params.set('longitude', longitude)
          params.set('radius', radius)
        } else if (region) {
          params.set('region', region)
        }
        if (modaliteKey) params.set('modalite', modaliteKey)
        const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
        if (!res.ok) return []
        const data = await res.json()
        return data.data || []
      }
      const allResults = await Promise.all(ALL_ROME_BATCHES.map(fetchBatch))
      let ecoleItems = allResults.flat()

      // Inclure aussi les formations distancielles via batches ROME depuis le centre France
      // (rayon 600 km couvre tout le territoire ; couverture sectorielle complète)
      if (modaliteKey !== 'presentiel') {
        const fetchDistancielBatch = async (romeBatch) => {
          const params = new URLSearchParams({
            caller: CALLER, romes: romeBatch,
            latitude: DISTANCIEL_POINTS[0].lat, longitude: DISTANCIEL_POINTS[0].lng, radius: '200',
          })
          const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
          if (!res.ok) return []
          return ((await res.json()).data || []).filter(i => i.modalite?.entierement_a_distance === true)
        }
        const distancielResults = await Promise.all(ALL_ROME_BATCHES.map(fetchDistancielBatch))
        ecoleItems = [...ecoleItems, ...distancielResults.flat()]
      }

      rawItems = ecoleItems

    } else if (modaliteKey === 'distanciel') {
      // Filtre distanciel explicite : batches ROME depuis le centre France, rayon 600 km
      const fetchDistancielBatch = async (romeBatch) => {
        const params = new URLSearchParams({
          caller: CALLER, romes: romeBatch,
          latitude: DISTANCIEL_POINTS[0].lat, longitude: DISTANCIEL_POINTS[0].lng, radius: '200',
        })
        const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
        if (!res.ok) return []
        return ((await res.json()).data || []).filter(i => i.modalite?.entierement_a_distance === true)
      }
      const allResults = await Promise.all(ALL_ROME_BATCHES.map(fetchDistancielBatch))
      rawItems = allResults.flat()
    } else {
      // Nécessite une localisation (lat/lng ou region)
      if (!latitude && !longitude && !region) {
        return NextResponse.json({ results: [] })
      }

      const buildGeoParams = (extra = {}) => {
        const p = new URLSearchParams({ caller: CALLER })
        if (latitude && longitude) {
          p.set('latitude', latitude)
          p.set('longitude', longitude)
          p.set('radius', radius)
        } else if (region) {
          p.set('region', region)
        }
        Object.entries(extra).forEach(([k, v]) => p.set(k, v))
        return p
      }

      // Fetch principal : batches ROME si pas de secteur sélectionné (couverture complète),
      // sinon une seule requête avec les codes ROME du secteur
      let mainItems = []
      if (romes.length === 0) {
        const fetchBatch = async (romeBatch) => {
          const params = buildGeoParams({ romes: romeBatch })
          const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
          if (!res.ok) return []
          return (await res.json()).data || []
        }
        const allResults = await Promise.all(ALL_ROME_BATCHES.map(fetchBatch))
        mainItems = allResults.flat()
      } else {
        const params = buildGeoParams({ romes: romes.join(',') })
        const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
        if (!res.ok) {
          const text = await res.text()
          console.error('[LBA formations] Erreur API:', res.status, text)
          return NextResponse.json({ error: `Erreur La Bonne Alternance : ${res.status}` }, { status: res.status })
        }
        mainItems = (await res.json()).data || []
      }

      // Toujours inclure les formations entièrement à distance (adresse physique hors zone)
      if (modaliteKey !== 'presentiel') {
        const fetchDistancielBatch = async (romeBatch) => {
          const p = new URLSearchParams({
            caller: CALLER, romes: romeBatch,
            latitude: DISTANCIEL_POINTS[0].lat, longitude: DISTANCIEL_POINTS[0].lng, radius: '200',
          })
          const res = await fetch(`${LBA_BASE}/formation/v1/search?${p}`, { headers, next: { revalidate: 1800 } })
          if (!res.ok) return []
          return ((await res.json()).data || []).filter(i => i.modalite?.entierement_a_distance === true)
        }
        const distancielResults = await Promise.all(ALL_ROME_BATCHES.map(fetchDistancielBatch))
        rawItems = [...mainItems, ...distancielResults.flat()]
      } else {
        rawItems = mainItems
      }
    }

    // Dédoublonnage par lba_id (conserve les formations sans lba_id)
    const seen = new Set()
    let results = rawItems
      .map(normalizeFormation)
      .filter(f => {
        if (!f.lba_id) return true
        if (seen.has(f.lba_id)) return false
        seen.add(f.lba_id)
        return true
      })

    if (keyword) {
      results = results.filter(f =>
        f.nom.toLowerCase().includes(keyword) ||
        f.ecole_nom.toLowerCase().includes(keyword)
      )
    }

    if (niveauKey) {
      results = results.filter(f => f.diplome_label === niveauKey)
    }

    if (modaliteKey === 'distanciel') {
      results = results.filter(f => f.entierement_distance === true)
    } else if (modaliteKey === 'presentiel') {
      results = results.filter(f => f.entierement_distance === false)
    }

    // Enrichissement écoles via UAI
    const uais = [...new Set(results.map(f => f.uai).filter(Boolean))]
    if (uais.length > 0) {
      const adminSupabase = createAdminClient()
      const { data: ecoles } = await adminSupabase
        .from('ecoles')
        .select('id, uai, site_web, nom, ville, adresse, code_postal')
        .in('uai', uais)
      const ecoleMap = Object.fromEntries((ecoles || []).map(e => [e.uai, e]))
      results = results.map(f => {
        const e = f.uai ? ecoleMap[f.uai] : null
        return {
          ...f,
          ecole_id:        e?.id        || null,
          ecole_site_web:  e?.site_web  || null,
          ecole_adresse:   e?.adresse   || null,
          ecole_cp:        e?.code_postal || null,
        }
      })
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[LBA formations] Erreur fetch:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/formations-lba
 * Body: { formation: { lba_id, nom, ecole, ville, niveau, url, rncp, cfd } }
 *
 * Crée un snapshot dans la table `formations` (source='lba') puis
 * insère dans `candidat_candidatures`. Retourne { formation_id, candidature_id }.
 */
export async function POST(request) {
  const supabase      = await createServerClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { formation } = await request.json()
  if (!formation?.lba_id) return NextResponse.json({ error: 'lba_id manquant' }, { status: 400 })

  // Upsert snapshot formations (service role pour bypasser RLS)
  const { data: snap, error: snapErr } = await adminSupabase
    .from('formations')
    .upsert({
      lba_id:             formation.lba_id,
      nom:                formation.nom,
      niveau:             formation.niveau || null,
      source:             'lba',
      localite_formation: formation.ville || null,
      url_onisep:         formation.url_onisep || formation.url || null,
      ecole_id:           formation.ecole_id || null,
      lba_data:           formation,
    }, { onConflict: 'lba_id' })
    .select('id')
    .single()

  if (snapErr) {
    console.error('[LBA save] snapshot error:', snapErr)
    return NextResponse.json({ error: snapErr.message }, { status: 500 })
  }

  // Vérifie si déjà dans les candidatures
  const { data: existing } = await supabase
    .from('candidat_candidatures')
    .select('id')
    .eq('candidat_id', user.id)
    .eq('formation_id', snap.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ formation_id: snap.id, candidature_id: existing.id, already: true })
  }

  const { data: cand, error: candErr } = await supabase
    .from('candidat_candidatures')
    .insert({
      candidat_id:    user.id,
      nom_entreprise: formation.ecole_nom || 'CFA',
      poste:          formation.nom,
      type:           'formation',
      statut:         'a_faire',
      notes:          '',
      formation_id:   snap.id,
    })
    .select('id')
    .single()

  if (candErr) {
    console.error('[LBA save] candidature error:', candErr)
    return NextResponse.json({ error: candErr.message }, { status: 500 })
  }

  return NextResponse.json({ formation_id: snap.id, candidature_id: cand.id })
}

function normalizeFormation(item) {
  const cert   = item.certification?.valeur
  const lieu   = item.lieu
  const coords = lieu?.geolocalisation?.coordinates  // [lng, lat]

  const nom = cert?.intitule?.cfd?.long
           || cert?.intitule?.rncp
           || 'Formation sans titre'

  const niveauEuropeen = cert?.intitule?.niveau?.cfd?.europeen
                      || cert?.intitule?.niveau?.rncp?.europeen

  const ecole_nom = item.formateur?.organisme?.unite_legale?.raison_sociale
                 || item.responsable?.organisme?.unite_legale?.raison_sociale
                 || ''

  const uai = item.formateur?.organisme?.identifiant?.uai
           || item.responsable?.organisme?.identifiant?.uai
           || item.lieu?.uai
           || null

  // Sessions : on trie par date de début et on garde les futures
  const now = new Date()
  const sessions = (item.sessions || [])
    .map(s => ({ debut: s.debut, fin: s.fin, capacite: s.capacite ?? null }))
    .filter(s => s.debut && new Date(s.debut) >= now)
    .sort((a, b) => new Date(a.debut) - new Date(b.debut))

  const prochaine_rentree = sessions[0]?.debut || null

  const modalite = item.modalite || {}

  return {
    lba_id:              item.identifiant?.cle_ministere_educatif || null,
    nom,
    ecole_nom,
    uai,
    ecole_siret:         item.formateur?.organisme?.identifiant?.siret || null,
    ecole_email:         item.formateur?.organisme?.contacts?.[0]?.email || null,
    ecole_qualiopi:      item.formateur?.organisme?.renseignements_specifiques?.qualiopi || false,
    ecole_geo_lat:       item.formateur?.organisme?.etablissement?.geopoint?.coordinates?.[1] || null,
    ecole_geo_lng:       item.formateur?.organisme?.etablissement?.geopoint?.coordinates?.[0] || null,
    ville:               lieu?.adresse?.commune?.nom  || '',
    region:              lieu?.adresse?.region?.nom   || '',
    adresse:             lieu?.adresse?.label         || '',
    commune:             lieu?.adresse?.commune?.nom  || '',
    departement:         lieu?.adresse?.departement?.nom || '',
    academie:            lieu?.adresse?.academie?.nom || '',
    niveau:              lbaNiveauToKey(niveauEuropeen),
    niveau_libelle:      cert?.intitule?.niveau?.cfd?.libelle || null,
    niveau_sigle:        cert?.intitule?.niveau?.cfd?.sigle   || null,
    diplome_label:       diplomeLabel(cert?.intitule?.niveau?.cfd?.sigle, cert?.intitule?.niveau?.cfd?.libelle),
    url_onisep:          item.onisep?.url || null,
    rncp:                cert?.identifiant?.rncp       || null,
    cfd:                 cert?.identifiant?.cfd        || null,
    lat:                 coords ? coords[1] : null,
    lng:                 coords ? coords[0] : null,
    sessions,
    prochaine_rentree,
    duree_annees:        modalite.duree_indicative     || null,
    entierement_distance: modalite.entierement_a_distance || false,
    contenu:             item.contenu_educatif?.contenu  || null,
    objectif:            item.contenu_educatif?.objectif || null,
    // enrichi après par matching UAI
    ecole_id:            null,
    ecole_site_web:      null,
    ecole_adresse:       null,
    ecole_cp:            null,
  }
}
