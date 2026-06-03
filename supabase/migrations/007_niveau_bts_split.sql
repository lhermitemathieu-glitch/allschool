-- Élargissement de la contrainte niveau pour les sous-niveaux BTS
ALTER TABLE formations DROP CONSTRAINT IF EXISTS formations_niveau_check;
ALTER TABLE formations ADD CONSTRAINT formations_niveau_check
  CHECK (niveau IN ('cap','bac','bts','bts_agri','afpa3','deust','niv3','bach','master','autre'));
