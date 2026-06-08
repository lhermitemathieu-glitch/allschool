-- Offres masquées par un candidat ("ne plus voir")
CREATE TABLE IF NOT EXISTS candidat_offres_cachees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offre_id     text NOT NULL,           -- _id de l'offre (ex: "lba-xxx" ou "allschool-xxx")
  offre_data   jsonb NOT NULL DEFAULT '{}', -- snapshot de l'offre pour l'affichage dans les archives
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidat_id, offre_id)
);

ALTER TABLE candidat_offres_cachees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidat voit ses offres cachées"
  ON candidat_offres_cachees FOR SELECT
  USING (auth.uid() = candidat_id);

CREATE POLICY "candidat insère ses offres cachées"
  ON candidat_offres_cachees FOR INSERT
  WITH CHECK (auth.uid() = candidat_id);

CREATE POLICY "candidat supprime ses offres cachées"
  ON candidat_offres_cachees FOR DELETE
  USING (auth.uid() = candidat_id);
