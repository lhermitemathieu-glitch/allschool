import CVCandidatPublic from '../../../components/public/CVCandidatPublic'
import { notFound } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const SELECT_FIELDS = 'prenom,nom,photo_url,ville,formation,bio,disponibilite,dispo_mois,dispo_annee,experiences,competences_hard,competences_soft,langues,niveau_etudes,email,telephone,linkedin_url,permis,masquer_experiences,pas_experience_pro,passions,loisirs'

async function getCandidatPublic(id) {
  const url = `${SUPABASE_URL}/rest/v1/candidats?id=eq.${id}&profil_public=eq.true&select=${SELECT_FIELDS}`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] ?? null
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const profil = await getCandidatPublic(id)
  if (!profil) return { title: 'Profil introuvable — Allschool' }
  const nom = [profil.prenom, profil.nom].filter(Boolean).join(' ')
  return {
    title: `${nom} — Profil Allschool`,
    description: `${profil.formation || 'Candidat en alternance'}${profil.ville ? ` · ${profil.ville}` : ''}`,
  }
}

export default async function PageCandidatPublic({ params }) {
  const { id } = await params
  const profil = await getCandidatPublic(id)
  if (!profil) notFound()

  const publicUrl = `https://allschool.vercel.app/candidat/${id}`

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F5F0; }
      `}</style>
      <CVCandidatPublic profil={profil} publicUrl={publicUrl} />
    </>
  )
}
