import { NextResponse } from 'next/server'
import { getRomesForSecteur } from '../../../lib/rome-mapping'
import { lbaNiveauToKey, niveauLabel } from '../../../lib/niveaux'
import { ALL_ROME_BATCHES } from '../../../lib/rome-batches'

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
 * Retourne les offres d'alternance La Bonne Alternance pour une localisation.
 * - avec `secteur` : une requête LBA sur les codes ROME du secteur ;
 * - sans `secteur` : couverture complète via les lots de codes ROME en parallèle
 *   (même approche que la recherche de formations).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secteur = searchParams.get('secteur')

  if (!searchParams.get('latitude') || !searchParams.get('longitude')) {
    return NextResponse.json(
      { error: 'Paramètres manquants : latitude et longitude requis.' },
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

  // Avec secteur : un seul lot (les 20 premiers codes ROME du secteur).
  // Sans secteur : tous les lots ROME → couverture complète.
  let batches
  if (secteur) {
    const romes = getRomesForSecteur(secteur)
    if (romes.length === 0) {
      return NextResponse.json({ jobs: [], warnings: [] })
    }
    batches = [romes.slice(0, 20).join(',')]
  } else {
    batches = ALL_ROME_BATCHES
  }

  const token = process.env.LBA_API_TOKEN
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const fetchBatch = async (romesParam) => {
    const params = new URLSearchParams({
      caller:    CALLER,
      romes:     romesParam,
      latitude,
      longitude,
      radius,
    })
    const res = await fetch(`${LBA_BASE}/job/v1/search?${params}`, { headers, next: { revalidate: 3600 } })
    if (!res.ok) {
      const text = await res.text()
      console.error('[LBA] Erreur API:', res.status, text)
      return { ok: false, status: res.status }
    }
    return { ok: true, data: await res.json() }
  }

  try {
    const results = await Promise.all(batches.map(fetchBatch))

    // Si TOUT a échoué, on remonte une vraie erreur (sinon on sert ce qu'on a).
    if (results.every(r => !r.ok)) {
      const status = results[0]?.status || 502
      return NextResponse.json(
        { error: `Erreur La Bonne Alternance : ${status}` },
        { status }
      )
    }

    // jobs = vraies offres (France Travail, etc.) → tag "sourcee"
    // recruiters = entreprises ouvertes aux candidatures → tag "spontanee"
    // Dédoublonnage par id (ou titre+entreprise à défaut) entre les lots.
    const seen = new Set()
    const jobs = []
    const warnings = []
    for (const r of results) {
      if (!r.ok) continue
      const data = r.data
      for (const item of (data.jobs || []))       pushUnique(jobs, seen, normalizeJob(item, 'sourcee'))
      for (const item of (data.recruiters || [])) pushUnique(jobs, seen, normalizeJob(item, 'spontanee'))
      if (Array.isArray(data.warnings)) warnings.push(...data.warnings)
    }

    return NextResponse.json({ jobs, warnings })
  } catch (err) {
    console.error('[LBA] Erreur fetch:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function pushUnique(arr, seen, job) {
  const key = job.id || `${job.titre}|${job.entreprise}`
  if (seen.has(key)) return
  seen.add(key)
  arr.push(job)
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
