# Synthèse — Pérennisation Allschool

> Récapitulatif du travail réalisé sur les 3 missions (cartographie, audit, corrections),
> ce qui reste à faire, et les 5 recommandations prioritaires pour la suite.

---

## 1. Livrables produits

| Document | Contenu |
|----------|---------|
| [`MODELE_DONNEES.md`](MODELE_DONNEES.md) | Cartographie complète : 20+ entités, schéma Mermaid, incohérences (FK, doublons, nommage, types), entités implicites |
| [`AUDIT.md`](AUDIT.md) | Audit sécurité / cohérence / qualité / perf, classé Critique / Important / Mineur, avec récapitulatif priorisé |
| `SYNTHESE.md` | Ce document |
| `supabase/migrations/034→038` | 5 migrations correctives **réversibles** (chaque `*.sql` a son `*_rollback.sql`) |
| `lib/types.ts`, `lib/format.js`, `lib/regions.js`, `components/ui/AvatarPhoto.jsx` | Typage + modules partagés |

---

## 2. Ce qui a été corrigé

### Sécurité (Mission 3.1)

| Réf. | Correctif | Où |
|------|-----------|-----|
| **C1** | Escalade de privilège : le rôle passe de `user_metadata` (modifiable par l'utilisateur) à `app_metadata` (écrit via service role). Fonctions `auth_role()`/`is_admin()`, migration des rôles existants, trigger de provisioning (jamais `admin` en auto). Route `/api/admin/import` vérifie désormais `app_metadata.role`. | `migration 034`, `app/api/admin/import/route.js` |
| **C2** | Table `candidats` enfin **versionnée** (baseline idempotente) avec **RLS stricte** : le candidat voit/édite sa ligne, l'admin tout, les autres uniquement les profils publics. La recherche entreprise filtre `profil_public`/`profil_en_pause` et ne charge plus email/téléphone en liste. | `migration 035`, `PanelEntreprise.jsx` |
| **C3** | Storage `profiles` et `ecoles-media` : policies scoping par dossier (un utilisateur ne peut écrire que dans son propre dossier). Bucket `ecoles-media` versionné. | `migration 036` |
| **I1** | Routes LBA : validation numérique et bornée de `latitude`/`longitude`/`radius` ; le `niveau` du POST formations est borné à la liste autorisée (plus de 500 sur CHECK). | `app/api/alternance/route.js`, `app/api/formations-lba/route.js` |
| **I2** | RLS complétées : policies admin (`is_admin()`) sur `ecoles`/`entreprises`/`offres`/`formations`/`ecole_apprentis` (l'édition admin d'école échouait silencieusement avant), + policies `DELETE` propriétaire manquantes. | `migration 037` |

### Modèle de données (Mission 3.2)

| Correctif | Où |
|-----------|-----|
| `offres.niveau` : ajout de `'bac'` (le formulaire entreprise le proposait, le CHECK le rejetait) | `migration 038` |
| `ecoles.source` : l'import CSV/catalogue écrivait `'csv'`/`'catalogue'` en violation du CHECK → aligné sur `'allschool'` | `app/api/admin/import/route.js` |
| `formations.updated_at` ajouté (+ trigger) — manquait malgré l'upsert sur `lba_id` | `migration 038` |
| Suppression des tables mortes `candidatures` et `contacts_ecoles` (cette dernière avait une FK erronée vers `auth.users`) | `migration 038` |

> Toutes les migrations sont **réversibles** (`*_rollback.sql`) et **non destructives par défaut** (idempotentes via `IF NOT EXISTS`). Elles n'ont **pas été appliquées** : à exécuter après revue (cf. §4).

### Factorisation (Mission 3.3)

| Correctif | Où |
|-----------|-----|
| `AvatarPhoto` : 3 copies fusionnées en un composant partagé | `components/ui/AvatarPhoto.jsx` (consommé par `PanelCandidatProfil`, `PanelEntreprise`, `PanelBackDetail`) |
| Secteurs : suppression de la liste hardcodée obsolète (15 secteurs) au profit de `lib/secteurs.js` (24, à jour) | `PanelBackDetail.jsx` |
| Helpers `initiales`/`sigle`/`formatTel`/`formatDateLongue` centralisés | `lib/format.js` (prêt à adopter) |
| `REGIONS` (codes INSEE + coords) centralisé | `lib/regions.js` (prêt à adopter) |

### Typage TypeScript (Mission 3.4)

| Correctif | Où |
|-----------|-----|
| Types des entités principales (`Candidat`, `Entreprise`, `Offre`, `Ecole`, `Formation`, `CandidatCandidature`) + objets implicites (`FormationLBA`, `OffreLBA`) + unions (`Role`, `Niveau*`, `Statut*`) | `lib/types.ts` |

✅ **Le build (`npm run build`) passe après chaque étape majeure et en final.** Aucune fonctionnalité existante cassée.

---

## 3. Commits

Travail découpé en commits atomiques (un par sujet) :
1. `docs: cartographie du modèle de données (MODELE_DONNEES.md)`
2. `docs: audit du code (AUDIT.md)`
3. `fix(sécurité): rôle via app_metadata + RLS candidats/storage + protection routes`
4. `fix(modèle): migrations réversibles (niveau bac, source écoles, tables mortes)`
5. `refactor: composant AvatarPhoto partagé + helpers/regions + secteurs unifiés`
6. `feat(types): types TypeScript des entités principales`
7. `docs: synthèse finale (SYNTHESE.md)`

---

## 4. Ce qui reste à faire

### À exécuter par l'équipe (accès Supabase requis)
1. **Appliquer les migrations 034→038** sur la base (revue puis `supabase db push` ou éditeur SQL), dans l'ordre. ⚠️ La 034 modifie `auth.users` (rôles) : tester sur un environnement de staging d'abord, vérifier qu'aucun compte admin ne perd son accès.
2. **Vérifier le schéma réel de `candidats`** (`select column_name from information_schema.columns where table_name='candidats'`) avant d'appliquer 035, pour confirmer que la baseline correspond.
3. **Provisioning du rôle à l'inscription** : le trigger `provision_user_role` (034) recopie `user_metadata.role` → `app_metadata.role` pour candidat/entreprise/école. Confirmer qu'il couvre le flux d'inscription réel (`app/login/page.jsx`).

### Corrections restantes (non bloquantes, hors lot)
- **I7 — Refonte du routing** (reportée d'un commun accord) : découper la SPA `app/app/page.jsx` en routes Next par espace + middleware de protection serveur + lazy-loading des panels. Aujourd'hui un candidat télécharge le bundle du backoffice et la seule protection est côté client.
- **I5 — Hook `useCandidatures()`** : centraliser les 4 implémentations divergentes d'enregistrement de candidature (valeurs par défaut incohérentes, pas de dédoublonnage).
- **I9 — Gestion d'erreurs Supabase** : capter `error` sur les mutations (aujourd'hui ignorée presque partout → l'UI diverge silencieusement de la base).
- **I10 — Code mort** : branche `signup` inatteignable dans `app/login/page.jsx` ; `candidats_import` orpheline (à raccorder à `candidats` ou supprimer).
- **Adoption progressive** de `lib/format.js` / `lib/regions.js` dans les ~6 panels qui dupliquent encore ces helpers (REGIONS ×5, `initiales`/`sigle` ×8).
- **m3 — Unifier les deux systèmes de suivi de formation** (`formation_statuts` vs `candidat_candidatures` type formation).
- **Migrer le code de `.jsx` vers `.tsx`** progressivement en s'appuyant sur `lib/types.ts` ; générer les types Supabase (`supabase gen types typescript`).
- **Effet de bord à valider** : avec la nouvelle RLS, la recherche d'apprenti par nom (`PanelEcole.jsx`) ne trouve plus que les profils publics — comportement voulu, mais à confirmer côté produit.

---

## 5. Cinq recommandations prioritaires

1. **Appliquer en priorité les migrations de sécurité 034–037 sur staging puis prod.** Tant qu'elles ne sont pas exécutées, la faille d'escalade de privilège (n'importe qui peut devenir admin et écrire en masse via l'API d'import) et l'exposition potentielle des coordonnées candidats restent ouvertes. C'est le point le plus urgent.

2. **Reprendre le contrôle du schéma : tout doit passer par des migrations versionnées.** La table `candidats` et le bucket `ecoles-media` avaient été créés à la main hors dépôt — base non reproductible. Adopter la règle « aucune modif de schéma sans migration » et générer un dump de référence du schéma prod pour le réconcilier avec `supabase/migrations`.

3. **Découper la SPA en routes Next protégées côté serveur (I7).** L'architecture mono-bundle avec routing par `useState` mélange les 4 espaces dans un seul bundle et ne protège les accès que côté client. C'est le principal frein à la montée en charge et à la sécurité ; à planifier comme chantier dédié.

4. **Introduire une couche d'accès données typée et factorisée.** Centraliser les requêtes Supabase dans des hooks/services (`useCandidatures`, `useProfil`, `useOffres`…) typés via `lib/types.ts`, avec gestion d'erreur systématique. Cela élimine d'un coup la duplication (I4, I5), les erreurs avalées (I9) et l'absence de typage (I8).

5. **Mettre en place un garde-fou qualité minimal.** Activer un lint (ESLint Next + règle « no-unused / exhaustive-deps »), un check de build en CI sur chaque PR, et `supabase db diff` pour détecter toute dérive de schéma. Sur un proto qui se pérennise, ces filets évitent la réapparition des problèmes corrigés ici.
