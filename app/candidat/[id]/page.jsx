import { createAdminClient } from '../../../lib/supabase/admin'
import CVCandidatPublic from '../../../components/public/CVCandidatPublic'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('candidats')
    .select('prenom, nom, formation, ville')
    .eq('id', id)
    .eq('profil_public', true)
    .single()

  if (!data) return { title: 'Profil introuvable — Allschool' }

  const nom = [data.prenom, data.nom].filter(Boolean).join(' ')
  return {
    title: `${nom} — Profil Allschool`,
    description: `${data.formation || 'Candidat en alternance'}${data.ville ? ` · ${data.ville}` : ''}`,
  }
}

export default async function PageCandidatPublic({ params }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: profil } = await supabase
    .from('candidats')
    .select('prenom, nom, photo_url, ville, formation, bio, disponibilite, dispo_mois, dispo_annee, experiences, competences_hard, competences_soft, langues, niveau_etudes, email, telephone, linkedin_url, permis, masquer_experiences, pas_experience_pro, passions, loisirs')
    .eq('id', id)
    .eq('profil_public', true)
    .single()

  if (!profil) notFound()

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://allschool.fr'}/candidat/${id}`

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
