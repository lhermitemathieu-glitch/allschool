import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient as createServerClient } from '../../../lib/supabase/server'
import { getRomesForSecteurs } from '../../../lib/rome-mapping'
import { lbaNiveauToKey } from '../../../lib/niveaux'

const LBA_BASE = 'https://api.apprentissage.beta.gouv.fr/api'
const CALLER   = 'allschool'

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

  let secteurs = []
  try { secteurs = secteursRaw ? JSON.parse(secteursRaw) : [] } catch { secteurs = [] }

  const romes = secteurs.length > 0
    ? getRomesForSecteurs(secteurs).slice(0, 20)
    : []

  // Nécessite une localisation (lat/lng ou region)
  if (!latitude && !longitude && !region) {
    return NextResponse.json({ results: [] })
  }

  const token = process.env.LBA_API_TOKEN
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  try {
    const params = new URLSearchParams({ caller: CALLER })
    if (romes.length > 0) params.set('romes', romes.join(','))

    if (latitude && longitude) {
      params.set('latitude', latitude)
      params.set('longitude', longitude)
      params.set('radius', radius)
    } else if (region) {
      params.set('region', region)
    }

    const url = `${LBA_BASE}/formation/v1/search?${params}`

    const res = await fetch(url, { headers, next: { revalidate: 1800 } })

    if (!res.ok) {
      const text = await res.text()
      console.error('[LBA formations] Erreur API:', res.status, text)
      return NextResponse.json(
        { error: `Erreur La Bonne Alternance : ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    // L'API retourne { data: [...] }
    let results = (data.data || []).map(normalizeFormation)

    if (keyword) {
      results = results.filter(f =>
        f.nom.toLowerCase().includes(keyword) ||
        f.ecole.toLowerCase().includes(keyword)
      )
    }

    if (niveauKey) {
      results = results.filter(f => f.niveau === niveauKey)
    }

    return NextResponse.json({ results, warnings: data.warnings || [] })
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
      url_onisep:         formation.url   || null,
      ecole_id:           null,
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
      nom_entreprise: formation.ecole || 'CFA',
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

  const ecole = item.formateur?.organisme?.unite_legale?.raison_sociale
             || item.responsable?.organisme?.unite_legale?.raison_sociale
             || ''

  const onisepUrl = item.onisep?.url || null

  return {
    lba_id:  item.identifiant?.cle_ministere_educatif || null,
    nom,
    ecole,
    ville:   lieu?.adresse?.commune?.nom  || '',
    region:  lieu?.adresse?.region?.nom   || '',
    adresse: lieu?.adresse?.label         || '',
    niveau:  lbaNiveauToKey(niveauEuropeen),
    url:     onisepUrl,
    rncp:    cert?.identifiant?.rncp       || null,
    cfd:     cert?.identifiant?.cfd        || null,
    lat:     coords ? coords[1] : null,
    lng:     coords ? coords[0] : null,
  }
}
