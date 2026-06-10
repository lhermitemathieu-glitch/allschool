-- Supprime toutes les écoles importées via CSV.
-- Les écoles seront désormais alimentées automatiquement depuis l'API La Bonne Alternance
-- (matching SIRET/UAI) et enrichies manuellement ou par les établissements eux-mêmes.
-- Dépendances gérées automatiquement :
--   ecole_actus, ecole_apprentis, evenements, candidat_ecoles_cachees → CASCADE
--   candidat_candidatures.ecole_id, formations.ecole_id → SET NULL

DELETE FROM ecoles;
