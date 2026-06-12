import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient as createServerClient } from '../../../lib/supabase/server'
import { getRomesForSecteurs } from '../../../lib/rome-mapping'
import { lbaNiveauToKey } from '../../../lib/niveaux'
import { ALL_ROME_BATCHES } from '../../../lib/rome-batches'

const LBA_BASE = 'https://api.apprentissage.beta.gouv.fr/api'
const CALLER   = 'allschool'

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
  const latRaw      = searchParams.get('latitude')
  const lngRaw      = searchParams.get('longitude')
  const region      = searchParams.get('region')

  // Validation géo : si lat/lng fournis, ils doivent être numériques et bornés.
  let latitude = null, longitude = null
  if (latRaw != null || lngRaw != null) {
    const lat = Number(latRaw), lng = Number(lngRaw)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Coordonnées invalides.' }, { status: 400 })
    }
    latitude = String(lat); longitude = String(lng)
  }
  const radiusNum = Number(searchParams.get('radius'))
  const radius    = String(Number.isFinite(radiusNum) ? Math.min(Math.max(radiusNum, 1), 600) : 30)
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

  // Le niveau provient du client : on le borne à la liste autorisée par le
  // CHECK formations_niveau_check (sinon l'upsert renvoie 500).
  const NIVEAUX_VALIDES = ['cap','bac','bts','bts_agri','afpa3','deust','niv3','bach','master','autre']
  const niveauValide = NIVEAUX_VALIDES.includes(formation.niveau) ? formation.niveau : null

  // Upsert snapshot formations (service role pour bypasser RLS)
  const { data: snap, error: snapErr } = await adminSupabase
    .from('formations')
    .upsert({
      lba_id:             formation.lba_id,
      nom:                formation.nom,
      niveau:             niveauValide,
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
