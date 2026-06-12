-- ─────────────────────────────────────────────────────────────────────────────
-- 040_unification_suivi_formations.sql
--
-- UNIFICATION DU SUIVI DES FORMATIONS (option A, AUDIT §m3)
--
-- Avant : deux systèmes parallèles qui s'ignoraient —
--   - formation_statuts  : statuts posés depuis la fiche formation
--     (favori, candidature_faire, postule, en_attente, accepte, pas_interesse)
--   - candidat_candidatures type='formation' : pipeline de Mes candidatures
--     (a_faire, envoyee, entretien, admis, archive)
--
-- Après : un seul système, le pipeline de Mes candidatures, aligné sur le
-- suivi de la recherche d'emploi. "Favori" devient un marqueur (colonne
-- booléenne) sur la candidature.
--
-- Correspondance des anciens statuts :
--   favori            → a_faire  + favori = true
--   candidature_faire → a_faire
--   postule           → envoyee
--   en_attente        → envoyee
--   accepte           → admis
--   pas_interesse     → archive
--
-- Les tables formation_statuts et formation_actions sont CONSERVÉES (lecture
-- seule, plus utilisées par le code) le temps de valider la migration ; une
-- migration de nettoyage les supprimera ensuite.
--
-- Rollback : voir 040_unification_suivi_formations_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Marqueur Favori sur les candidatures ───────────────────────────────────
ALTER TABLE candidat_candidatures
  ADD COLUMN IF NOT EXISTS favori boolean NOT NULL DEFAULT false;

-- ── 2. Dédoublonnage préventif (sécurise l'index unique du §5) ────────────────
DELETE FROM candidat_candidatures a
USING candidat_candidatures b
WHERE a.candidat_id  = b.candidat_id
  AND a.formation_id = b.formation_id
  AND a.formation_id IS NOT NULL
  AND a.created_at   < b.created_at;

-- ── 3. Migration des statuts de formation vers les candidatures ───────────────
-- (a) Statuts sans candidature existante → création d'une candidature.
INSERT INTO candidat_candidatures
  (candidat_id, type, nom_entreprise, poste, statut, favori, formation_id, notes)
SELECT
  fs.candidat_id,
  'formation',
  coalesce(e.nom, f.lba_data ->> 'ecole_nom', 'École'),
  f.nom,
  CASE fs.statut
    WHEN 'favori'            THEN 'a_faire'
    WHEN 'candidature_faire' THEN 'a_faire'
    WHEN 'postule'           THEN 'envoyee'
    WHEN 'en_attente'        THEN 'envoyee'
    WHEN 'accepte'           THEN 'admis'
    WHEN 'pas_interesse'     THEN 'archive'
    ELSE 'a_faire'
  END,
  (fs.statut = 'favori'),
  fs.formation_id,
  ''
FROM formation_statuts fs
JOIN formations f ON f.id = fs.formation_id
LEFT JOIN ecoles e ON e.id = f.ecole_id
WHERE NOT EXISTS (
  SELECT 1 FROM candidat_candidatures cc
  WHERE cc.candidat_id = fs.candidat_id
    AND cc.formation_id = fs.formation_id
);

-- (b) Statut 'favori' sur une formation déjà en candidature → marqueur.
UPDATE candidat_candidatures cc
SET favori = true
FROM formation_statuts fs
WHERE fs.candidat_id  = cc.candidat_id
  AND fs.formation_id = cc.formation_id
  AND fs.statut = 'favori';

-- ── 4. Migration des rappels de formation vers les rappels de candidature ─────
-- (a) Rappels sur des formations sans candidature → on crée la candidature.
INSERT INTO candidat_candidatures
  (candidat_id, type, nom_entreprise, poste, statut, formation_id, notes)
SELECT
  fa.candidat_id,
  'formation',
  coalesce(e.nom, f.lba_data ->> 'ecole_nom', 'École'),
  f.nom,
  'a_faire',
  fa.formation_id,
  ''
FROM formation_actions fa
JOIN formations f ON f.id = fa.formation_id
LEFT JOIN ecoles e ON e.id = f.ecole_id
WHERE NOT EXISTS (
  SELECT 1 FROM candidat_candidatures cc
  WHERE cc.candidat_id = fa.candidat_id
    AND cc.formation_id = fa.formation_id
);

-- (b) Copie des rappels (unique par candidature, on ignore les doublons).
INSERT INTO candidature_actions
  (candidat_id, candidature_id, texte, echeance, fait, created_at, updated_at)
SELECT
  fa.candidat_id, cc.id, fa.texte, fa.echeance, fa.fait, fa.created_at, fa.updated_at
FROM formation_actions fa
JOIN candidat_candidatures cc
  ON cc.candidat_id = fa.candidat_id
 AND cc.formation_id = fa.formation_id
WHERE NOT EXISTS (
  SELECT 1 FROM candidature_actions ca
  WHERE ca.candidat_id = fa.candidat_id
    AND ca.candidature_id = cc.id
);

-- ── 5. Garde-fou : une seule candidature par formation et par candidat ────────
CREATE UNIQUE INDEX IF NOT EXISTS candidat_candidatures_formation_unique
  ON candidat_candidatures (candidat_id, formation_id)
  WHERE formation_id IS NOT NULL;
