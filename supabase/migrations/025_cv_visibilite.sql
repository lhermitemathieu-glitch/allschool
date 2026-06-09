ALTER TABLE candidats
  ADD COLUMN IF NOT EXISTS cv_masquer_apropos boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_competences_hard boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_soft_skills boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_langues boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_masquer_interets boolean DEFAULT false;
