/**
 * geocode-ecoles.mjs
 * Géocode toutes les écoles via l'API adresse du gouvernement français.
 * Gratuit, sans clé API, batch de 50 lignes par requête.
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET)
const GEO_API  = 'https://api-adresse.data.gouv.fr/search/csv/'
const BATCH    = 50   // max recommandé par l'API
const PAUSE_MS = 200  // pause entre les batches pour ne pas surcharger l'API

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Géocode un batch d'écoles via l'API CSV ───────────────────────────────────
async function geocodeBatch(ecoles) {
  // Construit un CSV : id,adresse,postcode,city
  const lines = ['id,adresse,postcode,city']
  for (const e of ecoles) {
    const adresse  = (e.adresse  || '').replace(/,/g, ' ').replace(/\n/g, ' ').trim()
    const cp       = (e.code_postal || '').replace(/,/g, '').trim()
    const ville    = (e.ville    || '').replace(/,/g, ' ').trim()
    // Si on n'a ni adresse ni ville, on passe
    if (!ville && !adresse) continue
    lines.push(`${e.id},"${adresse}","${cp}","${ville}"`)
  }

  if (lines.length <= 1) return [] // que l'entête

  const csv  = lines.join('\n')
  const body = new FormData()
  body.append('data', new Blob([csv], { type: 'text/csv' }), 'ecoles.csv')
  body.append('columns',  'adresse')
  body.append('postcode', 'postcode')
  body.append('citycode', '')
  body.append('city',     'city')
  body.append('result_columns', 'id,result_score,latitude,longitude')

  const res = await fetch(GEO_API, { method: 'POST', body })
  if (!res.ok) {
    console.error(`\n⚠️  API adresse erreur ${res.status}`)
    return []
  }

  const text = await res.text()
  const rows = text.trim().split('\n').slice(1) // skip header

  const results = []
  for (const row of rows) {
    // CSV : id,result_score,latitude,longitude
    const parts = row.split(',')
    if (parts.length < 4) continue
    const id    = parts[0].trim()
    const score = parseFloat(parts[1]) || 0
    const lat   = parseFloat(parts[2])
    const lng   = parseFloat(parts[3])
    if (!isNaN(lat) && !isNaN(lng) && score >= 0.3) {
      results.push({ id, latitude: lat, longitude: lng, score })
    }
  }
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📍  Chargement des écoles à géocoder…')

  // On charge uniquement les écoles sans coordonnées
  let ecoles = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('ecoles')
      .select('id, nom, adresse, code_postal, ville')
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

  let success = 0, failed = 0

  for (let i = 0; i < ecoles.length; i += BATCH) {
    const batch    = ecoles.slice(i, i + BATCH)
    const results  = await geocodeBatch(batch)

    if (results.length > 0) {
      await Promise.all(results.map(({ id, latitude, longitude }) =>
        supabase.from('ecoles').update({ latitude, longitude }).eq('id', id)
      ))
      success += results.length
      failed  += batch.length - results.length
    } else {
      failed += batch.length
    }

    await sleep(PAUSE_MS)

    const pct = Math.round(((i + BATCH) / ecoles.length) * 100)
    process.stdout.write(
      `\r   Progression : ${Math.min(pct, 100)}%  ` +
      `(✅ ${success} géocodées, ❌ ${failed} échecs)`
    )
  }

  console.log(`\n\n✅  Terminé !`)
  console.log(`   ${success} écoles géocodées avec succès`)
  console.log(`   ${failed} écoles sans résultat (adresse manquante ou ambiguë)`)
}

main()
