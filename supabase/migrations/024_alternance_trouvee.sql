-- Checkbox "J'ai trouvé mon alternance" sur le profil candidat
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS alternance_trouvee boolean DEFAULT false;
