-- Supprime toutes les formations importées via CSV (source='allschool').
-- La recherche de formations repose désormais exclusivement sur l'API La Bonne Alternance.
-- Dépendances gérées automatiquement :
--   formation_statuts, formation_actions, candidat_formations_cachees → CASCADE
--   candidat_candidatures.formation_id → SET NULL

DELETE FROM formations WHERE source = 'allschool';
