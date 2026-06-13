# État des lieux — Allschool

> Document de passation rédigé le 12 juin 2026, en fin de session de pérennisation.
> **À lire en début de toute nouvelle session de travail** (humain ou assistant).
> Complète les documents de référence : [MODELE_DONNEES.md](MODELE_DONNEES.md), [AUDIT.md](AUDIT.md), [SYNTHESE.md](SYNTHESE.md).

---

## 1. Le projet en bref

Plateforme française de mise en relation pour l'alternance, 4 espaces : **Candidat**, **Entreprise**, **École/CFA**, **Backoffice admin**.

- **Stack** : Next.js 16 (App Router), React 19, Supabase (auth + Postgres + storage), déployé sur **Vercel** (repo GitHub `lhermitemathieu-glitch/allschool`, branche `main` = production, toute branche poussée = préversion automatique).
- **Code** : JS/JSX (pas de TS hors `lib/types.ts` documentaire et `next.config.ts`). `tsconfig` strict présent pour la migration future.
- **Données externes** : API **La Bonne Alternance** (LBA, `api.apprentissage.beta.gouv.fr`) = source de vérité pour les offres d'emploi ET l'annuaire formations/écoles. Token dans `LBA_API_TOKEN` (`.env.local`, non commité).
- ⚠️ **La table `ecoles` interne est quasi vide** (vidée en migration 029) : toute recherche d'écoles/formations passe par LBA. Ne jamais brancher une recherche sur la table interne.
- **4 comptes de test** : `lhermite.mathieu+{candidat|entreprise|ecole}@gmail.com` + `lhermite.mathieu@gmail.com` (admin).

## 2. Architecture actuelle (après refonte)

```
proxy.js                  ← middleware Next 16 (s'appelle "proxy", pas "middleware") :
                            redirige les non-connectés vers /login
app/
  page.jsx                ← landing publique
  login/                  ← connexion (le signup est du code mort, jamais affiché)
  blog/                   ← blog (markdown dans content/, rendu via lib/blog.js)
  candidat/[id]/          ← CV public d'un candidat (SSR, profils profil_public=true)
  api/alternance/         ← proxy LBA offres (recherche avec OU sans secteur)
  api/formations-lba/     ← proxy LBA formations + POST snapshot candidature
  api/admin/import/       ← imports CSV (admin via app_metadata, service role)
  app/                    ← l'application connectée, UNE ROUTE PAR ESPACE :
    page.jsx              ← accueil (tous rôles)
    candidat/  entreprise/  ecole/  admin/
                          ← chaque page serveur appelle requireSpace() (lib/auth-server.js)
                            et rend un composant Espace* ; un non-admin ne reçoit
                            JAMAIS le code du backoffice (code splitting vérifié)
components/
  spaces/                 ← AppShell (TopNav+Sidebar+navigation interne par panel+Toaster),
                            EspaceCandidat/Entreprise/Ecole/Admin/Home, spacesConfig.js
  panels/                 ← les écrans (navigation interne par état, pas par URL)
  ui/                     ← AvatarPhoto, Toaster (notifications d'erreur partagées)
lib/
  roles.js                ← rôles/espaces/chemins (source de vérité)
  auth-server.js          ← gardes serveur requireSpace()/getUserAndRole()
  candidature-statuts.js  ← pipeline de candidature (5 statuts, source de vérité)
  candidatures.js         ← ajout de candidature (construireCandidature/ajouterCandidature)
  secteurs.js  niveaux.js  regions.js  rome-mapping.js  rome-batches.js
  format.js               ← helpers (initiales, sigle, tel) — créé, PAS encore adopté partout
  types.ts                ← types des entités (documentaire)
  supabase/               ← client.js (navigateur), server.js (SSR), admin.js (service role)
supabase/migrations/      ← 001→042 + rollbacks (TOUTES appliquées en prod jusqu'à 042 incluse)
```

### Règles de sécurité en vigueur
- **Le rôle fait autorité dans `app_metadata.role`** (non modifiable par l'utilisateur, migration 034). `user_metadata.role` n'est qu'un repli d'affichage, jamais pour admin. Trigger SQL `provision_user_role` provisionne le rôle à l'inscription (jamais admin).
- RLS stricte sur `candidats` (profils privés invisibles), storage scopé par dossier, policies admin via `public.is_admin()`.
- Vérification serveur par espace dans les pages (`requireSpace`), le proxy ne fait que le contrôle "connecté/pas connecté".

### Suivi des candidatures (unifié, migration 040)
- **Un seul système** : `candidat_candidatures` (statuts `a_faire → envoyee → entretien → admis → archive`) + colonne **`favori`** (étoile). Vaut pour les offres ET les formations.
- La fiche formation (`PanelFormationPublique`) écrit directement dans ce pipeline.
- Rappels : uniquement `candidature_actions` (cloche de notification comprise).
- Les tables historiques `formation_statuts` / `formation_actions` existent encore en base (lecture seule, plus utilisées) → **à supprimer dans une future migration de nettoyage** une fois la prod validée quelques jours.

## 3. Méthode de travail validée avec Mathieu

1. **Jamais de modification de schéma sans fichier de migration** (`supabase/migrations/NNN_*.sql` + `NNN_*_rollback.sql`). Les migrations sont **exécutées par Mathieu** dans le SQL Editor Supabase (copier-coller → Run), jamais par l'assistant.
2. **Chaque chantier sur une branche** → push → **préversion Vercel** → tests manuels par Mathieu (lui fournir une check-list numérotée, simple, en français non technique) → merge dans `main` après son « ok » explicite.
3. `npm run build` doit passer **avant chaque commit**.
4. Choix d'architecture ambigus : proposer 2 options + recommandation, laisser Mathieu trancher.
5. Mathieu n'est pas développeur : expliquer sans jargon, éviter les métaphores ambiguës (il a cherché une « clé » dans l'interface après un « test clé » 🔑…).

## 4. ⚠️ Pièges connus de l'environnement

- **Emplacement du projet : `~/Developer/allschool`** (PAS `~/Documents`). Cause RÉSOLUE en session 14 des corruptions git à répétition : le projet était dans `~/Documents`, **synchronisé en continu par iCloud Drive** (« Bureau et Documents »). iCloud évinçait/téléversait les fichiers de `.git` pendant les opérations atomiques de git → ref `main` disparue ne laissant que `main.lock`, `SIGBUS` sur les pack-files mmap, `fsck` figé sur des placeholders cloud. Le disque (SSD interne) est sain (SMART Verified) : ce n'était PAS un problème matériel. Le dépôt a été re-cloné proprement hors zone iCloud. **Ne jamais remettre un dépôt git sous `~/Documents`, `~/Desktop`, iCloud, Dropbox ou OneDrive.**
- *(Historique, ne devrait plus se produire)* En cas de réapparition d'une corruption d'index : vérifier qu'aucun process git ne tourne → si seul `refs/heads/main.lock` subsiste, il contient le bon SHA, faire `mv .git/refs/heads/main.lock .git/refs/heads/main` → contrôler `git show --stat HEAD` avant de pousser.
- **`next dev` est inutilisable** sur cette machine (ne démarre pas en plusieurs minutes). Pour vérifier : `npm run build` puis `npx next start -p 3010` et tester via `curl`.
- **Next 16** : le middleware s'appelle **`proxy.js`** (convention renommée). Docs locales dans `node_modules/next/dist/docs/` — les consulter avant d'écrire du code framework (consigne d'AGENTS.md).
- Messages de commit : passer par un fichier (`git commit -F /tmp/msg.txt`), les heredocs inline ont déjà déclenché des crashs.

## 5. Travail accompli (sessions de pérennisation, juin 2026)

| Chantier | État |
|----------|------|
| Cartographie du modèle de données ([MODELE_DONNEES.md](MODELE_DONNEES.md)) | ✅ |
| Audit complet ([AUDIT.md](AUDIT.md)) — synthèse dans [SYNTHESE.md](SYNTHESE.md) | ✅ |
| Sécurité : rôle `app_metadata`, RLS candidats, storage scopé, validation routes API (migrations 034–037) | ✅ appliqué + testé en prod |
| Modèle : niveau `bac` accepté, tables mortes supprimées, source écoles (migration 038) | ✅ |
| Refonte routing : une route par espace + garde serveur + code splitting | ✅ en prod |
| Corrections issues des tests : offres sans secteur, écoles entreprise via LBA, badges toutes candidatures | ✅ en prod |
| Notifications d'erreur (Toaster + ~20 mutations protégées, migration 039) | ✅ en prod |
| Unification du suivi formations (migration 040, favori, fiche formation → pipeline) | ✅ en prod (merge `2aaa6f3`) |
| Bloc « Mon suivi » dans le panneau latéral LBA (composant partagé `SuiviFormation`, création via POST snapshot) | ✅ en prod (merge `761ba7b`) |
| Adoption des helpers partagés `lib/format` / `lib/regions` / `lib/niveaux` (copies locales `initiales`/`sigle`/`formatTel`/`REGIONS`/tables niveau→couleur supprimées, ~150 lignes en moins, code mort retiré) | ✅ en prod (merge `971665d`) |
| Projet sorti d'iCloud → `~/Developer/allschool` (cause des corruptions git résolue, cf. §4) | ✅ |

**Migrations appliquées en prod : 001 → 042, toutes.** Chaque migration ≥034 a son rollback.

## 6. À faire — backlog priorisé

1. **Surveiller en prod** le bug « boutons de statut bloqués » sur la fiche formation : corrigé défensivement (try/finally + message), mais la cause racine n'a pas été identifiée. Si un message rouge « La mise à jour du suivi a échoué » apparaît, récupérer le texte + console. (La logique vit désormais dans le composant partagé `SuiviFormation`.)
2. ~~Migration de **nettoyage** : DROP `formation_statuts` + `formation_actions` + `candidats_import`~~ ✅ **fait (session 16, migration 041 appliquée en prod)** : les 3 tables mortes supprimées. `candidats_import` était un cul-de-sac d'import admin jamais relu → la fonctionnalité d'import « candidats » (schéma API `apprentis`, composant `PanelBackApprentis`, bouton + entrée sidebar) a été retirée du code en même temps. ⚠️ Le rollback de la 040 est désormais inopérant (il lisait les tables supprimées) — sans conséquence, la 040 est validée.
3. Brancher les **filtres RQTH / télétravail** de la recherche entreprise (les colonnes existent dans `candidats`, les toggles UI ne filtrent rien).
4. ~~**Ajout de candidature unifié** (helper `useCandidatures`)~~ ✅ **fait (session 15)** : helper partagé `lib/candidatures.js` (`construireCandidature` + `ajouterCandidature`) avec valeurs par défaut canoniques. Adopté par les 5 sites d'insertion (SuiviFormation, PanelCandidatOffres, PanelCandidatFormations, PanelCandidatCandidatures, API formations-lba). Plus aucune insertion littérale dans `candidat_candidatures`.
5. ~~Supprimer le code mort : branche signup de `app/login/page.jsx`, branche « formations Allschool » de `PanelCandidatFormations`~~ ✅ **fait (session 16)** : 234 lignes mortes retirées (branche signup + sélecteur de rôle, rendu/enregistrement « formation Allschool », compteur `total`, branche non-LBA de `masquer`, badge « dont LBA », imports orphelins). `PanelCandidatFormations` est désormais 100 % LBA. Le prop `onNavigateFormation` n'est plus passé à ce panneau.
6. Migration progressive **`.jsx` → `.tsx`** en s'appuyant sur `lib/types.ts` ; générer les types Supabase (`supabase gen types typescript`).
7. Performance : recherche « France entière » sans secteur = ~150 appels LBA (12 lots ROME × 13 régions) — prévoir un cache applicatif ou une limitation.
8. Produit (plus tard) : page « avis écoles » (les liens existent dans le dashboard école mais aucune table), espaces école « Mes offres / Partenaires / Événements / Avis » encore en « À venir », responsive mobile, bannière cookies RGPD.
9. **Refonte de la navigation entre la page d'accueil et les espaces** : rendre le parcours entre la landing publique (`app/page.jsx`) et les différents espaces (Candidat / Entreprise / École / Admin) **cohérent et user-friendly**. Aujourd'hui la navigation interne aux espaces se fait par état (pas par URL) via `AppShell`, et l'entrée depuis la landing passe par `/login`. Repenser les transitions, les points d'entrée et le retour à l'accueil pour une expérience fluide. (Chantier UX, à cadrer avec Mathieu : maquette/parcours avant code.)

> ✅ Fait en session 14 (retiré du backlog) : bloc « Mon suivi » dans le drawer LBA · adoption de `lib/format`/`lib/regions`/`lib/niveaux` · sortie d'iCloud.
> ✅ Fait en session 15 : ajout de candidature unifié (item #4 ci-dessus).
> ✅ Fait en session 16 : suppression du code mort signup + recherche « formations Allschool » (item #5) · migration 041 de nettoyage des tables mortes + retrait import candidats (item #2) · fix complétion profil bloquée à 92 % (critère `loisirs` toujours raté) + migration 042 suppression colonne morte `loisirs` (centres d'intérêt consolidés dans `passions`).

## 7. Démarrage rapide d'une nouvelle session

```bash
npm run build        # doit être vert
git log --oneline -5 # vérifier l'état de main
```
- Tout le contexte fonctionnel est dans ce fichier + les 3 documents de référence.
- Avant tout chantier : créer une branche, suivre la méthode §3, se méfier des pièges §4.
