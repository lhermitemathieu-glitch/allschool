import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { createClient } from '../../../../lib/supabase/server'

const SCHEMA = {
  apprentis: {
    table: 'candidats_import',
    required: ['nom', 'prenom', 'email', 'diplome', 'ville'],
    optional: ['telephone', 'date_naissance', 'ecole_rattachee', 'disponibilite', 'secteur', 'teletravail'],
  },
  ecoles: {
    table: 'ecoles',
    required: ['nom_ecole', 'type', 'ville', 'email_contact'],
    optional: ['siret', 'site_web', 'linkedin', 'qualiopi', 'plan'],
    map: row => ({
      nom:        row.nom_ecole,
      type_ecole: row.type,
      ville:      row.ville,
      site_web:   row.site_web   || null,
      linkedin:   row.linkedin   || null,
      qualiopi:   row.qualiopi === 'true' || row.qualiopi === '1',
      source:     'csv',
      user_id:    null,
    }),
  },
  entreprises: {
    table: 'entreprises',
    required: ['nom_entreprise', 'siret', 'email_contact', 'ville', 'secteur'],
    optional: ['telephone', 'taille', 'contact_nom', 'contact_poste'],
    map: row => ({
      raison_sociale: row.nom_entreprise,
      siret:          row.siret || null,
      ville:          row.ville,
      secteur:        row.secteur,
      taille:         row.taille || null,
      source:         'csv',
      user_id:        null,
    }),
  },
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const { type, filename, rows: rawRows } = body

  const admin = createAdminClient()

  // ── Import catalogue formations ───────────────────────────────────────────
  if (type === 'catalogue') {
    return importCatalogue(admin, user, filename, rawRows)
  }

  const schema = SCHEMA[type]
  if (!schema) return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })

  let ok = 0, warn = 0, errors = 0
  const toInsert = []

  for (const row of rawRows) {
    const missingRequired = schema.required.filter(k => !row[k]?.trim())
    if (missingRequired.length > 0) { errors++; continue }

    const missingOptional = schema.optional.filter(k => !row[k]?.trim())
    if (missingOptional.length > 0) warn++; else ok++

    const mapped = schema.map ? schema.map(row) : row
    toInsert.push(mapped)
  }

  let insertedCount = 0
  if (toInsert.length > 0) {
    const { error } = await admin.from(schema.table).insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    insertedCount = toInsert.length
  }

  await admin.from('import_logs').insert({
    type, filename, total: rawRows.length, ok, warn, errors_count: errors, admin_id: user.id,
  })

  return NextResponse.json({ ok, warn, errors, inserted: insertedCount })
}

// ── Logique spécifique catalogue formations ───────────────────────────────────
async function importCatalogue(admin, user, filename, rawRows) {
  // Colonnes attendues : Ecole, UAI, Adresse, Code postal, Localité,
  // Raison sociale, Nom de la formation, Diplôme, Niveau,
  // URL ONISEP, Site web, Localité formation, Téléphone vérifié, Email, académie, région

  let ecolesInserted = 0, formationsInserted = 0, errors = 0

  // 1. Dédoublonner les écoles par UAI
  const ecolesMap = new Map()
  for (const row of rawRows) {
    const uai = row['UAI']?.trim()
    const nom = row['Ecole']?.trim()
    if (!uai || !nom) { errors++; continue }
    if (!ecolesMap.has(uai)) {
      ecolesMap.set(uai, {
        uai,
        nom,
        raison_sociale:  row['Raison sociale']?.trim()  || null,
        adresse:         row['Adresse']?.trim()          || null,
        code_postal:     row['Code postal']?.trim()      || null,
        ville:           row['Localité']?.trim()         || null,
        telephone:       row['Téléphone vérifié']?.trim() || null,
        email:           row['Email']?.trim()            || null,
        site_web:        row['Site web']?.trim()         || null,
        academie:        row['académie']?.trim()         || null,
        region:          row['région']?.trim()           || null,
        source:          'catalogue',
        user_id:         null,
      })
    }
  }

  // 2. Upsert des écoles par UAI (on_conflict = uai)
  const ecolesArray = Array.from(ecolesMap.values())
  const uaiToId = new Map()

  // Batch par 200 pour rester sous les limites
  const BATCH = 200
  for (let i = 0; i < ecolesArray.length; i += BATCH) {
    const batch = ecolesArray.slice(i, i + BATCH)
    const { data, error } = await admin
      .from('ecoles')
      .upsert(batch, { onConflict: 'uai', ignoreDuplicates: false })
      .select('id, uai')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    ecolesInserted += batch.length
    for (const e of (data || [])) uaiToId.set(e.uai, e.id)
  }

  // 3. Récupérer les IDs des écoles déjà existantes non retournées par upsert
  const missingUais = ecolesArray.map(e => e.uai).filter(u => !uaiToId.has(u))
  if (missingUais.length > 0) {
    for (let i = 0; i < missingUais.length; i += BATCH) {
      const { data } = await admin.from('ecoles').select('id, uai').in('uai', missingUais.slice(i, i + BATCH))
      for (const e of (data || [])) uaiToId.set(e.uai, e.id)
    }
  }

  // 4. Construire les formations (dédoublonnées par ecole_id + nom + diplome)
  const formationsSet = new Set()
  const formations = []
  for (const row of rawRows) {
    const uai       = row['UAI']?.trim()
    const nomForm   = row['Nom de la formation']?.trim()
    const diplome   = row['Diplôme']?.trim()
    const ecoleId   = uaiToId.get(uai)
    if (!ecoleId || !nomForm) continue

    const key = `${ecoleId}|${nomForm}|${diplome || ''}`
    if (formationsSet.has(key)) continue
    formationsSet.add(key)

    formations.push({
      ecole_id:           ecoleId,
      nom:                nomForm,
      diplome:            diplome || null,
      niveau:             normaliseNiveau(row['Niveau']?.trim()),
      url_onisep:         row['URL ONISEP']?.trim()          || null,
      localite_formation: row['Localité formation']?.trim()  || null,
    })
  }

  // 5. Insérer les formations par batch
  for (let i = 0; i < formations.length; i += BATCH) {
    const { error } = await admin.from('formations').insert(formations.slice(i, i + BATCH))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    formationsInserted += Math.min(BATCH, formations.length - i)
  }

  await admin.from('import_logs').insert({
    type: 'catalogue', filename,
    total: rawRows.length,
    ok: formationsInserted,
    warn: 0,
    errors_count: errors,
    admin_id: user.id,
  })

  return NextResponse.json({
    ok: formationsInserted,
    warn: 0,
    errors,
    inserted: formationsInserted,
    ecoles: ecolesInserted,
    formations: formationsInserted,
  })
}

function normaliseNiveau(niveau) {
  if (!niveau) return 'autre'
  const n = niveau.toLowerCase()
  if (n.includes('cap') || n.startsWith('3')) return 'cap'
  if (n.includes('bac pro') || n.startsWith('4')) return 'cap'
  if (n.includes('bts') || n.includes('deust') || n.startsWith('5')) return 'bts'
  if (n.includes('bachelor') || n.includes('licence') || n.startsWith('6')) return 'bach'
  if (n.includes('master') || n.includes('ingénieur') || n.startsWith('7')) return 'master'
  return 'autre'
}
