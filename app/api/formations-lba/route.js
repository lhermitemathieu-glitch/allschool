import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient as createServerClient } from '../../../lib/supabase/server'
import { getRomesForSecteurs } from '../../../lib/rome-mapping'
import { lbaNiveauToKey } from '../../../lib/niveaux'

const LBA_BASE = 'https://api.apprentissage.beta.gouv.fr/api'
const CALLER   = 'allschool'

const ALL_REGIONS = ['84','27','53','24','94','44','32','11','28','75','76','52','93']

// Points géographiques couvrant la France pour la recherche distanciel (lat/lng requis)
const DISTANCIEL_POINTS = [
  { lat: 48.8566, lng: 2.3522 },   // Paris
  { lat: 45.7640, lng: 4.8357 },   // Lyon
  { lat: 43.2965, lng: 5.3698 },   // Marseille
  { lat: 44.8378, lng: -0.5792 },  // Bordeaux
  { lat: 50.6292, lng: 3.0573 },   // Lille
  { lat: 48.5734, lng: 7.7521 },   // Strasbourg
  { lat: 47.2184, lng: -1.5536 },  // Nantes
  { lat: 43.6047, lng: 1.4442 },   // Toulouse
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

    if (modaliteKey === 'distanciel') {
      // Pour distanciel : lat/lng requis par l'API (region ne remonte pas les formations distanciel)
      const fetchPoint = async ({ lat, lng }) => {
        const params = new URLSearchParams({ caller: CALLER, latitude: lat, longitude: lng, radius: '200' })
        if (romes.length > 0) params.set('romes', romes.join(','))
        const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
        if (!res.ok) return []
        const data = await res.json()
        return (data.data || []).filter(i => i.modalite?.entierement_a_distance === true)
      }
      const allResults = await Promise.all(DISTANCIEL_POINTS.map(fetchPoint))
      rawItems = allResults.flat()
    } else {
      // Nécessite une localisation (lat/lng ou region)
      if (!latitude && !longitude && !region) {
        return NextResponse.json({ results: [] })
      }

      const params = new URLSearchParams({ caller: CALLER })
      if (romes.length > 0) params.set('romes', romes.join(','))
      if (latitude && longitude) {
        params.set('latitude', latitude)
        params.set('longitude', longitude)
        params.set('radius', radius)
      } else if (region) {
        params.set('region', region)
      }

      const res = await fetch(`${LBA_BASE}/formation/v1/search?${params}`, { headers, next: { revalidate: 1800 } })
      if (!res.ok) {
        const text = await res.text()
        console.error('[LBA formations] Erreur API:', res.status, text)
        return NextResponse.json({ error: `Erreur La Bonne Alternance : ${res.status}` }, { status: res.status })
      }
      const data = await res.json()
      rawItems = data.data || []
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
