/**
 * assign-secteurs.mjs
 * Déduit et assigne les secteurs d'activité sur chaque école
 * à partir des noms et diplômes de ses formations.
 *
 * Usage :
 *   SUPABASE_SECRET=<votre_clé> node scripts/assign-secteurs.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('❌  Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET)

// ── Règles de détection ───────────────────────────────────────────────────────
// Ordre important : du plus spécifique au plus général
const RULES = [
  {
    secteur: 'Informatique & Numérique',
    mots: ['informatique', 'numérique', 'digital', 'développ', 'logiciel', 'réseau', 'cybersécurité',
           'data', 'intelligence artificielle', 'système', 'web', 'programmation', 'cloud', 'sio', 'slam', 'sisr'],
  },
  {
    secteur: 'Commerce & Vente',
    mots: ['commerce', 'vente', 'mco', 'commercial', 'négociation', 'distribution', 'management commercial',
           'technico-commercial', 'force de vente', 'retail', 'achat'],
  },
  {
    secteur: 'Communication & Marketing',
    mots: ['communication', 'marketing', 'publicité', 'médias', 'journalisme', 'rédaction',
           'graphisme', 'design', 'création', 'audiovisuel', 'relations presse', 'community'],
  },
  {
    secteur: 'Finance & Comptabilité',
    mots: ['comptabilité', 'finance', 'gestion', 'audit', 'fiscal', 'banque', 'assurance',
           'contrôle de gestion', 'dcg', 'dscg', 'expertise comptable', 'trésorerie'],
  },
  {
    secteur: 'Ressources Humaines',
    mots: ['ressources humaines', 'rh', 'paie', 'recrutement', 'formation', 'droit social',
           'gestion du personnel', 'sirh'],
  },
  {
    secteur: 'Juridique & Droit',
    mots: ['droit', 'juridique', 'notariat', 'avocat', 'juriste', 'contentieux', 'compliance'],
  },
  {
    secteur: 'Santé & Social',
    mots: ['santé', 'social', 'médical', 'paramédical', 'infirmier', 'aide-soignant', 'kiné',
           'pharmacie', 'médecine', 'psychologie', 'travailleur social', 'éducateur', 'soin'],
  },
  {
    secteur: 'Hôtellerie & Tourisme',
    mots: ['hôtellerie', 'tourisme', 'hébergement', 'réception', 'hôtel', 'voyages', 'accueil',
           'événementiel', 'event'],
  },
  {
    secteur: 'Alimentation & Restauration',
    mots: ['restauration', 'cuisine', 'boulangerie', 'pâtisserie', 'alimentation', 'cuisinier',
           'boucher', 'charcutier', 'traiteur', 'food', 'chocolatier'],
  },
  {
    secteur: 'BTP & Immobilier',
    mots: ['bâtiment', 'btp', 'construction', 'immobilier', 'travaux publics', 'génie civil',
           'architecture', 'maçon', 'électricien', 'plombier', 'menuisier', 'charpentier',
           'couvreur', 'peinture bâtiment', 'géomètre'],
  },
  {
    secteur: 'Industrie & Production',
    mots: ['industrie', 'production', 'mécanique', 'usinage', 'maintenance', 'électrotechnique',
           'automatisme', 'robotique', 'chaudronnerie', 'soudure', 'plasturgie', 'chimie',
           'métallurgie', 'aéronautique', 'automobile'],
  },
  {
    secteur: 'Logistique & Transport',
    mots: ['logistique', 'transport', 'supply chain', 'entrepôt', 'chauffeur', 'magasinier',
           'gestionnaire de stock', 'fret', 'douane', 'transit'],
  },
  {
    secteur: 'Agriculture & Environnement',
    mots: ['agriculture', 'agronomie', 'environnement', 'écologie', 'viticulture', 'arboriculture',
           'maraîchage', 'paysage', 'forêt', 'élevage', 'vétérinaire', 'agroalimentaire'],
  },
  {
    secteur: 'Arts & Culture',
    mots: ['art', 'culture', 'musique', 'danse', 'théâtre', 'cinéma', 'spectacle', 'mode',
           'stylisme', 'décoration', 'photographie', 'beaux-arts'],
  },
  {
    secteur: 'Sport & Animation',
    mots: ['sport', 'animation', 'éducation physique', 'staps', 'bpjeps', 'fitness',
           'entraîneur', 'moniteur', 'loisirs', 'jeunesse'],
  },
]

function detecterSecteurs(textes) {
  const haystack = textes.join(' ').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // supprime les accents pour la comparaison
  const result = new Set()
  for (const rule of RULES) {
    for (const mot of rule.mots) {
      const motNorm = mot.normalize('NFD').replace(/[̀-ͯ]/g, '')
      if (haystack.includes(motNorm)) {
        result.add(rule.secteur)
        break
      }
    }
  }
  return [...result]
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍  Chargement des formations…')

  // Récupère toutes les formations (nom + diplome + ecole_id)
  let allFormations = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('formations')
      .select('ecole_id, nom, diplome')
      .range(from, from + 999)
    if (error) { console.error('Erreur Supabase :', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    allFormations = allFormations.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`   → ${allFormations.length.toLocaleString('fr-FR')} formations chargées`)

  // Groupe par ecole_id
  const parEcole = {}
  for (const f of allFormations) {
    if (!parEcole[f.ecole_id]) parEcole[f.ecole_id] = []
    parEcole[f.ecole_id].push(f.nom || '', f.diplome || '')
  }

  const ecoleIds = Object.keys(parEcole)
  console.log(`   → ${ecoleIds.length.toLocaleString('fr-FR')} écoles à traiter\n`)

  let updated = 0, skipped = 0
  const BATCH = 50

  for (let i = 0; i < ecoleIds.length; i += BATCH) {
    const batch = ecoleIds.slice(i, i + BATCH)
    const updates = []

    for (const id of batch) {
      const secteurs = detecterSecteurs(parEcole[id])
      if (secteurs.length > 0) {
        updates.push({ id, secteurs })
      } else {
        skipped++
      }
    }

    // Met à jour chaque école (Supabase ne supporte pas upsert par batch sur des valeurs différentes)
    await Promise.all(updates.map(({ id, secteurs }) =>
      supabase.from('ecoles').update({ secteurs }).eq('id', id)
    ))
    updated += updates.length

    // Progression
    const pct = Math.round(((i + BATCH) / ecoleIds.length) * 100)
    process.stdout.write(`\r   Progression : ${Math.min(pct, 100)}%  (${updated} mis à jour, ${skipped} sans match)`)
  }

  console.log(`\n\n✅  Terminé !`)
  console.log(`   ${updated} écoles mises à jour`)
  console.log(`   ${skipped} écoles sans secteur détecté`)
}

main()
