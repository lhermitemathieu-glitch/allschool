import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH  = '/Users/mathieulhermite/Downloads/catalogue_formations_apprentissage - Pour import.csv'

const SUPABASE_URL      = process.env.SUPABASE_URL    || 'https://vijlgxbxvpvrutbefupb.supabase.co'
const SUPABASE_SECRET   = process.env.SUPABASE_SECRET || ''
const BATCH             = 200

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET)

// ── Parseur CSV robuste (gère les guillemets et virgules internes) ─────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  function splitLine(line) {
    const fields = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        fields.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = splitLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = splitLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
}

function normaliseNiveau(niveau) {
  if (!niveau) return 'autre'
  const n = niveau.toLowerCase()
  if (n.includes('cap') || n.includes('bac pro') || n.startsWith('3') || n.startsWith('4')) return 'cap'
  if (n.includes('bts') || n.includes('deust') || n.startsWith('5')) return 'bts'
  if (n.includes('bachelor') || n.includes('licence') || n.startsWith('6')) return 'bach'
  if (n.includes('master') || n.includes('ingénieur') || n.startsWith('7')) return 'master'
  return 'autre'
}

function log(msg) { process.stdout.write(msg + '\n') }
function progress(current, total, label) {
  const pct = Math.round((current / total) * 100)
  process.stdout.write(`\r  ${label} : ${current}/${total} (${pct}%)   `)
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  log('\n🚀 Import catalogue formations apprentissage')
  log('─'.repeat(50))

  // 1. Lire le CSV
  log('\n📂 Lecture du fichier CSV…')
  const text = readFileSync(CSV_PATH, 'utf8')
  const rows = parseCSV(text)
  log(`   ${rows.length.toLocaleString('fr-FR')} lignes lues`)

  // 2. Dédoublonner les écoles par UAI
  log('\n🏫 Dédoublonnage des écoles par UAI…')
  const ecolesMap = new Map()
  let skipped = 0
  for (const row of rows) {
    const uai = row['UAI']?.trim()
    const nom = row['Ecole']?.trim()
    if (!uai || !nom) { skipped++; continue }
    if (!ecolesMap.has(uai)) {
      ecolesMap.set(uai, {
        uai,
        nom,
        raison_sociale:  row['Raison sociale']?.trim()   || null,
        adresse:         row['Adresse']?.trim()           || null,
        code_postal:     row['Code postal']?.trim()       || null,
        ville:           row['Localité']?.trim()          || null,
        telephone:       row['Téléphone vérifié']?.trim() || null,
        email:           row['Email']?.trim()             || null,
        site_web:        row['Site web']?.trim()          || null,
        academie:        row['académie']?.trim()          || null,
        region:          row['région']?.trim()            || null,
        source:          'catalogue',
        user_id:         null,
      })
    }
  }
  const ecoles = Array.from(ecolesMap.values())
  log(`   ${ecoles.length.toLocaleString('fr-FR')} écoles uniques (${skipped} lignes ignorées)`)

  // 3. Upsert des écoles par batch
  log('\n⬆️  Insertion des écoles dans Supabase…')
  const uaiToId = new Map()
  let ecolesInserted = 0

  for (let i = 0; i < ecoles.length; i += BATCH) {
    const batch = ecoles.slice(i, i + BATCH)
    const { data, error } = await supabase
      .from('ecoles')
      .upsert(batch, { onConflict: 'uai', ignoreDuplicates: false })
      .select('id, uai')

    if (error) {
      log(`\n❌ Erreur écoles batch ${i}: ${error.message}`)
      process.exit(1)
    }
    for (const e of (data || [])) uaiToId.set(e.uai, e.id)
    ecolesInserted += batch.length
    progress(ecolesInserted, ecoles.length, 'Écoles')
  }
  log('')

  // 4. Récupérer les IDs manquants (écoles déjà existantes non retournées)
  const missingUais = ecoles.map(e => e.uai).filter(u => !uaiToId.has(u))
  if (missingUais.length > 0) {
    log(`\n🔍 Récupération de ${missingUais.length} IDs manquants…`)
    for (let i = 0; i < missingUais.length; i += BATCH) {
      const { data } = await supabase.from('ecoles').select('id, uai').in('uai', missingUais.slice(i, i + BATCH))
      for (const e of (data || [])) uaiToId.set(e.uai, e.id)
      progress(i + BATCH, missingUais.length, 'IDs')
    }
    log('')
  }
  log(`   ✅ ${uaiToId.size} écoles mappées`)

  // 5. Construire les formations (dédoublonnées par ecole_id + nom + diplôme)
  log('\n📚 Construction des formations (dédoublonnage)…')
  const formationsSet = new Set()
  const formations = []
  let formSkipped = 0

  for (const row of rows) {
    const uai     = row['UAI']?.trim()
    const nomForm = row['Nom de la formation']?.trim()
    const diplome = row['Diplôme']?.trim()
    const ecoleId = uaiToId.get(uai)

    if (!ecoleId || !nomForm) { formSkipped++; continue }

    const key = `${ecoleId}|${nomForm}|${diplome || ''}`
    if (formationsSet.has(key)) continue
    formationsSet.add(key)

    formations.push({
      ecole_id:           ecoleId,
      nom:                nomForm,
      diplome:            diplome || null,
      niveau:             normaliseNiveau(row['Niveau']?.trim()),
      url_onisep:         row['URL ONISEP']?.trim()         || null,
      localite_formation: row['Localité formation']?.trim() || null,
    })
  }
  log(`   ${formations.length.toLocaleString('fr-FR')} formations uniques (${formSkipped} ignorées)`)

  // 6. Insérer les formations par batch
  log('\n⬆️  Insertion des formations dans Supabase…')
  let formationsInserted = 0

  for (let i = 0; i < formations.length; i += BATCH) {
    const batch = formations.slice(i, i + BATCH)
    const { error } = await supabase.from('formations').insert(batch)
    if (error) {
      log(`\n❌ Erreur formations batch ${i}: ${error.message}`)
      process.exit(1)
    }
    formationsInserted += batch.length
    progress(formationsInserted, formations.length, 'Formations')
  }
  log('')

  // 7. Résumé
  log('\n' + '─'.repeat(50))
  log(`✅ Import terminé !`)
  log(`   🏫 ${ecolesInserted.toLocaleString('fr-FR')} écoles insérées/mises à jour`)
  log(`   📚 ${formationsInserted.toLocaleString('fr-FR')} formations insérées`)
  log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erreur fatale :', err)
  process.exit(1)
})
