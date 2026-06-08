import { NextResponse } from 'next/server'
import { getRomesForSecteur } from '../../../lib/rome-mapping'

const LBA_BASE = 'https://api.apprentissage.beta.gouv.fr/api'
const CALLER   = 'allschool'

/**
 * GET /api/alternance?secteur=...&latitude=...&longitude=...&radius=30
 *
 * Retourne les offres d'alternance La Bonne Alternance pour un secteur et une localisation.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secteur   = searchParams.get('secteur')
  const latitude  = searchParams.get('latitude')
  const longitude = searchParams.get('longitude')
  const radius    = searchParams.get('radius') || '30'

  if (!secteur || !latitude || !longitude) {
    return NextResponse.json(
      { error: 'Paramètres manquants : secteur, latitude, longitude requis.' },
      { status: 400 }
    )
  }

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

    const jobs       = (data.jobs       || []).map(normalizeJob)
    const recruiters = (data.recruiters || []).map(normalizeJob)

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

function normalizeJob(item) {
  return {
    id:          item.identifier?.id            || item.identifier?.partner_job_id || null,
    source:      item.identifier?.partner_label || 'lba',
    titre:       item.offer?.title              || item.workplace?.name            || 'Offre sans titre',
    entreprise:  item.workplace?.brand          || item.workplace?.legal_name      || item.workplace?.name || '',
    ville:       item.workplace?.location?.address || '',
    contrat:     (item.contract?.type || []).join(', '),
    description: item.offer?.description        || '',
    url:         item.apply?.url                || null,
    niveau:      item.offer?.target_diploma?.label || '',
    date_creation: item.offer?.publication?.creation || null,
  }
}
