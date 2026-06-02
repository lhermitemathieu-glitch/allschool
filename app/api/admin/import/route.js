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

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}

export async function POST(request) {
  // Vérifie que l'appelant est admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const { type, filename, rows: rawRows } = body

  const schema = SCHEMA[type]
  if (!schema) return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })

  const admin = createAdminClient()

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

  // Journal
  await admin.from('import_logs').insert({
    type, filename, total: rawRows.length, ok, warn, errors_count: errors, admin_id: user.id,
  })

  return NextResponse.json({ ok, warn, errors, inserted: insertedCount })
}
