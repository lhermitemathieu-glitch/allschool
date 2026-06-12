# Audit du code — Allschool

> Audit produit après lecture de l'ensemble du code (`app/`, `components/`, `lib/`, `supabase/migrations/`).
> Problèmes classés en 3 niveaux : **🔴 Critique** (faille de sécurité ou casse fonctionnelle), **🟠 Important** (risque sérieux, dette structurante), **🟡 Mineur** (qualité, confort).

## Table des matières
- [1. Sécurité](#1-sécurité)
- [2. Cohérence](#2-cohérence)
- [3. Qualité](#3-qualité)
- [4. Performance](#4-performance)
- [5. Récapitulatif priorisé](#5-récapitulatif-priorisé)

---

## 1. Sécurité

### 🔴 C1 — Élévation de privilège : rôle stocké dans `user_metadata`
Le rôle (`candidat`/`entreprise`/`ecole`/`admin`) est lu depuis `user.user_metadata.role`. Or `user_metadata` est **modifiable par l'utilisateur lui-même** via `supabase.auth.updateUser({ data: { role: 'admin' } })`. Conséquences :
- **`app/api/admin/import/route.js:45`** : la seule barrière de l'API d'import (qui écrit via *service role*, RLS bypassée) est `user.user_metadata?.role !== 'admin'` → **n'importe quel utilisateur peut se promouvoir admin et écrire en masse** dans `ecoles`, `entreprises`, `formations`, `candidats_import`.
- **RLS admin** (`003_backoffice.sql`) : les policies `candidats_import`/`import_logs` reposent sur `auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'` → contournables de la même façon.
- **UI** : `ROLE_TO_ALLOWED_SPACES` (`app/app/page.jsx:114`) ouvre le backoffice selon ce même champ.

> **Correctif** : déplacer le rôle dans `app_metadata` (non modifiable par l'utilisateur, écrit uniquement via service role) ou dans une table `profiles`/`user_roles` protégée par RLS, et faire reposer toutes les vérifications (API + RLS) dessus.

### 🔴 C2 — RLS de `candidats` inconnue + lecture de données personnelles côté client
La table `candidats` n'est créée dans aucune migration (voir `MODELE_DONNEES.md §4.1`), donc sa RLS n'est pas versionnée. Le code lit explicitement `email` et `telephone` **côté client (clé anon)** :
- Espace entreprise : `PanelEntrepriseRecherche` (`PanelEntreprise.jsx:342`) `select('id, prenom, nom, ville, formation, disponibilite, passions')` — sans filtrer `profil_public`.
- Backoffice : `select('id, prenom, nom, formation, ville, email')` (`PanelBackoffice.jsx:227`, `PanelBackDetail.jsx:320`).
- École : recherche par nom dans `candidats` (`PanelEcole.jsx:534`).

Si la policy SELECT est permissive (`using (true)` ou `authenticated`), **tout utilisateur connecté peut lire les coordonnées de tous les candidats** via l'API REST Supabase, indépendamment de l'UI. La recherche entreprise ne filtre même pas `profil_public`/`profil_visible_ecoles`.

> **Correctif** : versionner `candidats` (migration `CREATE TABLE`), définir une RLS stricte : un candidat lit/écrit sa propre ligne ; les entreprises ne voient que `profil_public = true` et **jamais** `email`/`telephone` en accès direct (passer par une vue ou une RPC qui expose un sous-ensemble). Filtrer `profil_public` dans `PanelEntrepriseRecherche`.

### 🔴 C3 — Storage `profiles` : policies trop permissives
`011_photo_url.sql` crée des policies storage où **tout utilisateur `authenticated` peut INSERT/UPDATE/DELETE n'importe quel objet** du bucket (`with check (bucket_id = 'profiles')`, sans scoping par dossier/uid). Un candidat peut donc écraser ou supprimer la photo d'un autre utilisateur (`candidats/<autre_id>/photo.jpg`). Le bucket `ecoles-media` n'a aucune migration → policies inconnues.

> **Correctif** : restreindre par chemin, ex. `with check (bucket_id='profiles' AND (storage.foldername(name))[2] = auth.uid()::text)`. Versionner `ecoles-media`.

### 🟠 I1 — Routes API publiques sans authentification ni validation
- `app/api/alternance` (GET) et `app/api/formations-lba` (GET) sont **ouvertes sans auth**. `latitude`/`longitude`/`radius` ne sont pas validés numériquement et sont concaténés dans l'URL LBA. Pas de rate-limiting : chaque appel déclenche **jusqu'à 12–36 requêtes LBA** (batches ROME) → un script externe peut épuiser le quota du token LBA (DoS du service + coût).
- `formations-lba` POST insère `formation` (objet client) directement dans `formations.lba_data` et les colonnes (`nom`, `niveau`, `localite_formation`…) **sans validation**. Le `niveau` non contrôlé peut violer `formations_niveau_check` → 500. Snapshot écrit via *service role* (RLS bypass) à partir d'un payload non fiable.

> **Correctif** : exiger une session pour les GET LBA (ou un quota par IP/utilisateur) ; valider lat/lng/radius (`Number.isFinite`, bornes) ; valider/whitelister les champs de `formation` avant upsert, contraindre `niveau` à la liste connue.

### 🟠 I2 — Politiques RLS incomplètes
- `candidatures` (001) : pas de policy `DELETE` candidat, pas d'`UPDATE` candidat (table morte, mais à nettoyer).
- `entreprises`, `ecoles` : pas de policy `DELETE`. `PanelEntrepriseOffres.handleDelete` supprime des `offres` (policy OK) mais aucune suppression de fiche n'est protégée.
- `ecoles` : `UPDATE` policy = `user_id = auth.uid()`. L'admin édite des écoles **sans `user_id`** (`PanelEcolePage` `ecoleIdOverride`, `PanelEcolePublique.handleToggle` `publiee`) → ces updates **échouent silencieusement** (aucune erreur affichée car `error` ignorée). L'édition admin d'école est donc cassée OU repose sur une policy non versionnée.
- `formation_statuts`/`formation_actions` : policies `FOR ALL TO authenticated USING (candidat_id = auth.uid())` correctes.

> **Correctif** : ajouter une policy admin (basée sur `app_metadata.role`) couvrant UPDATE/DELETE sur `ecoles`/`entreprises`/`candidats`/`offres` pour le backoffice ; supprimer la table morte.

### 🟠 I3 — Clé service role correctement isolée mais surface large
`lib/supabase/admin.js` n'est importé que côté serveur (`api/admin/import`, `api/formations-lba`) — bon. Mais combiné à C1, le service role est accessible derrière une autorisation contournable. La gravité réelle dépend de C1.

### 🟡 m1 — `console.error` exposant des détails LBA
Les routes loguent `res.status` + corps de réponse LBA. Acceptable en dev, à filtrer en prod (peut contenir des éléments du token/headers selon l'API).

### 🟡 m2 — `.env.local` présent localement
Ignoré par `.gitignore` (`.env*`), non commité — OK. Vérifier qu'aucune clé n'a fuité dans l'historique git.

---

## 2. Cohérence

### 🟠 I4 — Duplication massive de composants entre espaces
Le même composant est recopié 3 à 6 fois :
- **`AvatarPhoto`** : `PanelEntreprise.jsx:8`, `PanelCandidatProfil.jsx:169`, `PanelBackDetail.jsx:60` — 3 copies quasi identiques.
- **`initiales()` / `sigle()`** : ~8 implémentations dispersées (`PanelEntreprise`, `PanelCandidatProfil`, `PanelBackDetail`, `PanelEcole`, `PanelEcolePublique`, `PanelCandidatCandidatures`, `PanelCandidatEcoles`, `PanelFormationPublique`, `CVCandidatPublic`…) avec des variantes subtiles (slice(0,2) vs (0,3), filtre `length>2`).
- **`CityAutocomplete` / autocomplete géo** : `PanelCandidatProfil`, `PanelEntreprise` (×2), `PanelCandidatOffres`, `PanelCandidatFormations`, `PanelCandidatEcoles` — la même logique `geo.api.gouv.fr`/`api-adresse.data.gouv.fr` réécrite ~6 fois.
- **`inputStyle` / `labelStyle` / `selectStyle`** : redéfinis en bas de presque chaque fichier, valeurs légèrement différentes.
- **`REGIONS`** (codes INSEE + lat/lng) : dupliqué dans `PanelCandidatOffres`, `PanelCandidatEcoles`, `PanelCandidatFormations`, `app/api/formations-lba`, `PanelEcole` (`REGIONS_FR` en libellés) — 5 copies divergentes (certaines avec `radius`, d'autres non).
- **`NIVEAUX` / `NIVEAU_LABEL` / `niveauStyle`** : tables de correspondance niveau→label→couleur recopiées dans `PanelCandidatFormations`, `PanelEcolePublique`, `PanelFormationPublique`, `PanelFormationLBADrawer`, `PanelBackDetail`, `PanelCandidatArchives` au lieu d'étendre `lib/niveaux.js`.
- **`STATUTS`** (suivi formation) : exporté par `PanelFormationPublique` et réimporté ailleurs — bon pattern, mais coexiste avec un autre `STATUTS` (candidatures) dans `PanelCandidatCandidatures`.

> **Correctif** : extraire `components/ui/` (`AvatarPhoto`, `CityAutocomplete`, `inputStyles`) et `lib/` (`initiales`, `regions.js`, étendre `niveaux.js` avec `label/bg/color`).

### 🟠 I5 — Logique d'enregistrement de candidature dupliquée et divergente
L'insertion dans `candidat_candidatures` est réimplémentée dans `PanelCandidatOffres.enregistrer` (`:249`), `PanelCandidatFormations.enregistrer` (`:372`) + `enregistrerLBA` (via API), et `PanelCandidatCandidatures.handleSave`. Champs et valeurs par défaut divergent (`nom_entreprise` = `'Entreprise'` vs `'École'` vs `'CFA'` vs `f.ecole?.nom`). Pas de dédoublonnage côté offres (on peut enregistrer 2× la même offre LBA — pas de contrainte unique sur `candidat_candidatures`).

> **Correctif** : hook `useCandidatures()` centralisant insert/update/delete + dédoublonnage.

### 🟠 I6 — Trois listes de secteurs divergentes
`lib/secteurs.js` (24, à jour) vs `SECTEURS_LIST` hardcodé dans `PanelBackDetail.jsx:87` (15 anciens) vs valeurs ROME. La fiche admin entreprise propose donc des secteurs différents de la fiche entreprise et de la recherche. Voir aussi le CHECK `ecoles.source` cassé (`MODELE_DONNEES §5`).

> **Correctif** : importer `SECTEURS` partout, supprimer `SECTEURS_LIST`.

### 🟠 I7 — Architecture SPA maison : un seul bundle pour 4 espaces
`app/app/page.jsx` route par `useState` + `history.pushState` (switch de ~30 panels). Tout le code des 4 espaces (backoffice inclus) est chargé dans **un seul bundle client** pour tous les utilisateurs. Un candidat télécharge le code du backoffice. Pas de découpage de route Next, pas de lazy-loading, pas de protection serveur par espace (seul un `redirect('/login')` côté client si `!user`).

> **Correctif (plus lourd, à planifier)** : routes Next par espace (`/app/candidat`, `/app/entreprise`…) + middleware de protection + `dynamic()` import par panel. À discuter avant exécution (voir SYNTHESE).

### 🟡 m3 — Deux systèmes de suivi de formation parallèles
`formation_statuts` (6 statuts type "favori/postulé") et `candidat_candidatures` type `formation` (5 statuts "a_faire/admis") coexistent pour suivre des formations, alimentés par des écrans différents. Source de confusion pour l'utilisateur et le modèle.

### 🟡 m4 — Gestion d'état hétérogène
Restauration de filtres : `localStorage` dans `PanelCandidatFormations`/`Offres`/`Ecoles` (clés différentes, sérialisation ad hoc) + `candidat_recherches_formations` en base seulement pour les formations. Pas de convention partagée.

---

## 3. Qualité

### 🟠 I8 — Aucun typage TypeScript malgré la config
`tsconfig.json` a `"strict": true`, mais **tout le code applicatif est en `.js`/`.jsx`** (50 fichiers, 0 `.ts`/`.tsx` hors `next-env.d.ts`). Aucune entité (`Candidat`, `Offre`, `Formation`…) n'est typée. Les objets Supabase et LBA circulent en `any` implicite. `allowJs: true` masque l'absence totale de vérification de types sur les données.

> **Correctif** : créer `lib/types.ts` avec les types des entités principales, générer les types Supabase (`supabase gen types typescript`), typer progressivement les fonctions de données et les props de panels.

### 🟠 I9 — Erreurs Supabase massivement ignorées
Pattern récurrent : `const { data } = await supabase...` **sans récupérer `error`**. Exemples : `app/app/page.jsx:153/159`, `PanelEcolePublique.handleToggle:93`, `PanelCandidatActions.load`, `PanelCandidatStatuts.load`, `PanelBackoffice.loadDetail`, presque tous les `handleDelete`/`handleToggle*`. En cas d'échec (RLS refusée, contrainte violée), l'UI ne signale rien et l'état local diverge de la base (ex. on retire visuellement une ligne non supprimée côté serveur).

> **Correctif** : helper `handleSupabase()` qui log + remonte un message ; au minimum capter `error` sur les mutations.

### 🟠 I10 — Code mort
- Branche `signup` dans `app/login/page.jsx` : `mode` est figé à `'login'`, tout le bloc `if (mode === 'signup')` (signup + `ROLES` + styles `tabs`/`roleRow`/`roleBtn`) est inatteignable.
- Tables mortes `candidatures`, `contacts_ecoles` (voir §I2).
- `PanelCandidatStatuts`, `PanelCandidatFormationsArchivees`, etc. : vérifier qu'ils sont bien routés (`candidat-statuts` n'apparaît pas dans la nav `SPACES`, seulement via `navigateTo`).
- `lib/blog.js`, `app/blog/*`, `scraper_*.js`, `proxy.js`, `scripts/*` : utilitaires hors app principale, à isoler/documenter.

### 🟡 m5 — Validation d'entrée minimale
- Recherche par `ilike('%' + input + '%')` avec input brut (`PanelEntrepriseRecherche`, `PanelBackoffice.loadDetail` avec `.or(...)` construit par concaténation) → pas d'injection SQL (PostgREST échappe), mais le `.or()` concaténé est fragile aux virgules/parenthèses dans la saisie.
- SIRET, email, URL : aucun format validé avant insert (`PanelEntrepriseSiret`, `OffreForm`).

### 🟡 m6 — `key={i}` sur des listes dynamiques
Plusieurs `.map((x, i) => ... key={i})` (recent lists backoffice, suggestions) → re-render incorrect si l'ordre change. Mineur ici.

### 🟡 m7 — `formations` sans `updated_at`
Upsert sur `lba_id` (`formations-lba` POST) mais pas de colonne `updated_at` → impossible de savoir quand un snapshot a été rafraîchi.

---

## 4. Performance

### 🟠 I11 — `formations-lba` : 12 à 36 requêtes LBA par recherche
Le mode `ecoles` et les recherches sans secteur lancent les 12 batches ROME, plus une seconde passe distanciel (12 de plus), plus parfois une passe principale → jusqu'à ~36 `fetch` LBA par clic, agrégés/filtrés en mémoire. Couplé à I1 (pas d'auth), c'est coûteux et exposé. Le cache `revalidate: 1800/3600` aide mais la première requête de chaque variation de params reste lourde.

> **Correctif** : réduire le nombre de batches selon les filtres réellement posés ; mutualiser la passe distanciel ; envisager un cache applicatif/edge par zone.

### 🟡 m8 — `select('*')` fréquents
`PanelCandidatProfil`, `PanelEntrepriseSiret`, `PanelAdminEntreprise/Candidat`, `PanelEcolePage`, `count head:true` avec `select('*')`. Charge plus de colonnes que nécessaire (dont `lba_data` jsonb volumineux pour formations). Préférer des `select` explicites (déjà fait dans plusieurs panels).

### 🟡 m9 — Agrégations "distinct" côté client coûteuses
`PanelBackDetailEcoles.init` boucle `range(0,999)` sur toutes les écoles pour collecter les régions distinctes ; `PanelBackDetailCandidats` charge **toutes** les villes (`select('ville')` sans limite) pour le filtre. Sur une base volumineuse → transfert massif. Préférer une vue/RPC `distinct` côté DB.

### 🟡 m10 — Rechargements `auth.getUser()` répétés
Chaque panel appelle `supabase.auth.getUser()` au montage (parfois plusieurs fois par action). Pas de contexte utilisateur partagé → latence et requêtes redondantes.

---

## 5. Récapitulatif priorisé

| # | Niveau | Domaine | Problème | Effort |
|---|--------|---------|----------|--------|
| C1 | 🔴 | Sécurité | Rôle dans `user_metadata` → escalade admin (API import + RLS) | Moyen |
| C2 | 🔴 | Sécurité | RLS `candidats` non versionnée + lecture email/tel côté client | Moyen |
| C3 | 🔴 | Sécurité | Storage `profiles` écrasable par tout authentifié | Faible |
| I1 | 🟠 | Sécurité | Routes LBA sans auth ni validation (DoS, payload non validé) | Moyen |
| I2 | 🟠 | Sécurité | RLS incomplètes (DELETE/UPDATE, admin écoles) | Moyen |
| I4 | 🟠 | Cohérence | Composants dupliqués (AvatarPhoto, autocomplete, styles, REGIONS…) | Moyen |
| I5 | 🟠 | Cohérence | Logique de candidature dupliquée et divergente | Faible |
| I6 | 🟠 | Cohérence | 3 listes de secteurs / CHECK source cassé | Faible |
| I7 | 🟠 | Cohérence | SPA monobundle, pas de protection serveur par espace | Élevé |
| I8 | 🟠 | Qualité | Zéro typage TS malgré `strict` | Moyen |
| I9 | 🟠 | Qualité | Erreurs Supabase ignorées partout | Faible |
| I10 | 🟠 | Qualité | Code mort (signup, tables mortes) | Faible |
| I11 | 🟠 | Perf | 12–36 requêtes LBA par recherche | Moyen |
| m1–m10 | 🟡 | Divers | Validation, `select('*')`, distinct client, contexte user… | Variable |

> Les correctifs **Critiques et Importants** sont traités dans l'ordre Sécurité → Modèle → Factorisation → Typage. Détail dans `SYNTHESE.md`.
>
> ⚠️ Plusieurs correctifs (C1, C2, C3, I2) nécessitent d'**exécuter des migrations SQL sur Supabase** et, pour C2, de connaître/recréer le schéma réel de `candidats`. Ces actions touchent la base de production : les migrations sont fournies **réversibles** mais leur application est laissée à validation (voir SYNTHESE §« Ce qui reste à faire »).
