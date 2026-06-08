-- Migration des secteurs renommés sur la table ecoles
-- Alignement avec la nouvelle liste officielle de 24 secteurs (lib/secteurs.js)

UPDATE ecoles SET secteurs = array_replace(secteurs, 'BTP & Immobilier',          'BTP & Construction')                    WHERE secteurs @> ARRAY['BTP & Immobilier'];
UPDATE ecoles SET secteurs = array_replace(secteurs, 'Communication & Marketing', 'Communication, Marketing & Design')     WHERE secteurs @> ARRAY['Communication & Marketing'];
UPDATE ecoles SET secteurs = array_replace(secteurs, 'Ressources Humaines',       'Ressources Humaines & Secrétariat')     WHERE secteurs @> ARRAY['Ressources Humaines'];
UPDATE ecoles SET secteurs = array_replace(secteurs, 'Sport & Animation',         'Éducation, Formation & Petite Enfance') WHERE secteurs @> ARRAY['Sport & Animation'];
