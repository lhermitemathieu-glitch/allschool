import { NextResponse } from 'next/server'
import { getRomesForSecteur } from '../../../lib/rome-mapping'
import { lbaNiveauToKey, niveauLabel } from '../../../lib/niveaux'

const LBA_BASE = 'https://api.apprentissage.beta.gouv.fr/api'
const CALLER   = 'allschool'

// Validation des coordonnées / rayon reçus en query (évite d'injecter des
// valeurs arbitraires dans l'URL LBA et de déclencher des requêtes inutiles).
function parseGeo(latRaw, lngRaw, radiusRaw) {
  const lat    = Number(latRaw)
  const lng    = Number(lngRaw)
  const radius = Number(radiusRaw)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90)     return null
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)   return null
  const r = Number.isFinite(radius) ? Math.min(Math.max(radius, 1), 200) : 30
  return { lat, lng, radius: r }
}

/**
 * GET /api/alternance?secteur=...&latitude=...&longitude=...&radius=30
 *
 * Retourne les offres d'alternance La Bonne Alternance pour un secteur et une localisation.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secteur   = searchParams.get('secteur')

  if (!secteur || !searchParams.get('latitude') || !searchParams.get('longitude')) {
    return NextResponse.json(
      { error: 'Paramètres manquants : secteur, latitude, longitude requis.' },
      { status: 400 }
    )
  }

  const geo = parseGeo(searchParams.get('latitude'), searchParams.get('longitude'), searchParams.get('radius'))
  if (!geo) {
    return NextResponse.json(
      { error: 'Coordonnées invalides : latitude/longitude/radius hors bornes.' },
      { status: 400 }
    )
  }
  const { lat: latitude, lng: longitude, radius } = geo

  const romes = getRomesForSecteur(secteur)
  if (romes.length === 0) {
    return NextResponse.json({ jobs: [], trainings: [] })
  }

  // L'API accepte max 20 codes ROME — on prend les 20 premiers
  const romesParam = romes.slice(0, 20).join(',')

  const token = process.env.LBA_API_TOKEN
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  try {
    const params = new URLSearchParams({
      caller:    CALLER,
      romes:     romesParam,
      latitude,
      longitude,
      radius,
    })
    const url = `${LBA_BASE}/job/v1/search?${params}`

    const res = await fetch(url, { headers, next: { revalidate: 3600 } })

    if (!res.ok) {
      const text = await res.text()
      console.error('[LBA] Erreur API:', res.status, text)
      return NextResponse.json(
        { error: `Erreur La Bonne Alternance : ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    // jobs = vraies offres (France Travail, etc.) → tag "sourcee"
    // recruiters = entreprises ouvertes aux candidatures → tag "spontanee"
    const jobs       = (data.jobs       || []).map(item => normalizeJob(item, 'sourcee'))
    const recruiters = (data.recruiters || []).map(item => normalizeJob(item, 'spontanee'))

    return NextResponse.json({
      jobs: [...jobs, ...recruiters],
      warnings: data.warnings || [],
    })
  } catch (err) {
    console.error('[LBA] Erreur fetch:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Normalisateur ─────────────────────────────────────────────────────────────

function normalizeJob(item, tag) {
  return {
    id:           item.identifier?.id            || item.identifier?.partner_job_id || null,
    source:       item.identifier?.partner_label || 'lba',
    tag,          // 'sourcee' ou 'spontanee' — déterminé par le tableau d'origine
    titre:        item.offer?.title              || item.workplace?.name            || 'Offre sans titre',
    entreprise:   item.workplace?.brand          || item.workplace?.legal_name      || item.workplace?.name || '',
    ville:        item.workplace?.location?.address || '',
    contrat:      (item.contract?.type || []).join(', '),
    description:  item.offer?.description        || '',
    url:          item.apply?.url                || null,
    niveau:       niveauLabel(lbaNiveauToKey(item.offer?.target_diploma?.european)) || item.offer?.target_diploma?.label || '',
    date_creation: item.offer?.publication?.creation || null,
  }
}
