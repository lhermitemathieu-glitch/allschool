/**
 * geocode-ecoles.mjs
 * Géocode toutes les écoles via l'API adresse du gouvernement français.
 * Requêtes individuelles en parallèle (10 à la fois).
 *
 * Usage :
 *   SUPABASE_SECRET=<clé> node scripts/geocode-ecoles.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('❌  Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET')
  process.exit(1)
}

const supabase    = createClient(SUPABASE_URL, SUPABASE_SECRET)
const CONCURRENCY = 10   // requêtes simultanées
const PAUSE_MS    = 100  // pause entre les groupes

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Géocode une école via l'API adresse
async function geocodeEcole(ecole) {
  // Construit la query : adresse + code_postal + ville
  const parts = [
    ecole.adresse,
    ecole.code_postal,
    ecole.ville,
  ].filter(Boolean).join(' ')

  if (!parts.trim()) return null

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(parts)}&limit=1&type=housenumber`
    const res  = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const feat = json.features?.[0]
    if (!feat || feat.properties.score < 0.3) {
      // 2e tentative : juste code_postal + ville
      if (ecole.ville) {
        const url2 = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent([ecole.code_postal, ecole.ville].filter(Boolean).join(' '))}&limit=1&type=municipality`
        const res2  = await fetch(url2)
        if (!res2.ok) return null
        const json2 = await res2.json()
        const feat2 = json2.features?.[0]
        if (!feat2 || feat2.properties.score < 0.3) return null
        const [lng2, lat2] = feat2.geometry.coordinates
        return { lat: lat2, lng: lng2 }
      }
      return null
    }
    const [lng, lat] = feat.geometry.coordinates
    return { lat, lng }
  } catch {
    return null
  }
}

// Exécute des promesses par groupes de N
async function runConcurrent(items, fn, concurrency) {
  const results = new Array(items.length)
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const res   = await Promise.all(batch.map((item, j) => fn(item, i + j)))
    res.forEach((r, j) => { results[i + j] = r })
    await sleep(PAUSE_MS)
  }
  return results
}

async function main() {
  console.log('📍  Chargement des écoles à géocoder…')

  let ecoles = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('ecoles')
      .select('id, adresse, code_postal, ville')
      .is('latitude', null)
      .range(from, from + 999)
    if (error) { console.error('Erreur :', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    ecoles = ecoles.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  console.log(`   → ${ecoles.length.toLocaleString('fr-FR')} écoles sans coordonnées\n`)
  if (ecoles.length === 0) { console.log('✅  Tout est déjà géocodé !'); return }

  let success = 0, failed = 0, processed = 0

  for (let i = 0; i < ecoles.length; i += CONCURRENCY) {
    const batch   = ecoles.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(e => geocodeEcole(e)))

    // Sauvegarde les succès
    const updates = []
    for (let j = 0; j < batch.length; j++) {
      processed++
      if (results[j]) {
        updates.push({ id: batch[j].id, latitude: results[j].lat, longitude: results[j].lng })
        success++
      } else {
        failed++
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates.map(({ id, latitude, longitude }) =>
        supabase.from('ecoles').update({ latitude, longitude }).eq('id', id)
      ))
    }

    await sleep(PAUSE_MS)
    const pct = Math.round((processed / ecoles.length) * 100)
    process.stdout.write(`\r   Progression : ${pct}%  (✅ ${success} géocodées, ❌ ${failed} échecs)`)
  }

  console.log(`\n\n✅  Terminé !`)
  console.log(`   ${success} écoles géocodées`)
  console.log(`   ${failed} sans résultat (adresse manquante ou ambiguë)`)
}

main()
