import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient as createServerClient } from '../../../lib/supabase/server'
import { getRomesForSecteurs } from '../../../lib/rome-mapping'
import { lbaNiveauToKey } from '../../../lib/niveaux'

const LBA_BASE = 'https://api.apprentissage.beta.gouv.fr/api'
const CALLER   = 'allschool'

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
    let results = (data.data || []).map(normalizeFormation)

    if (keyword) {
      results = results.filter(f =>
        f.nom.toLowerCase().includes(keyword) ||
        f.ecole_nom.toLowerCase().includes(keyword)
      )
    }

    if (niveauKey) {
      results = results.filter(f => f.niveau === niveauKey)
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
    ville:               lieu?.adresse?.commune?.nom  || '',
    region:              lieu?.adresse?.region?.nom   || '',
    adresse:             lieu?.adresse?.label         || '',
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
