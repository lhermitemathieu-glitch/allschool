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
  secteurs.js  niveaux.js  regions.js  rome-mapping.js  rome-batches.js
  format.js               ← helpers (initiales, sigle, tel) — créé, PAS encore adopté partout
  types.ts                ← types des entités (documentaire)
  supabase/               ← client.js (navigateur), server.js (SSR), admin.js (service role)
supabase/migrations/      ← 001→040 + rollbacks (TOUTES appliquées en prod jusqu'à 040 incluse)
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

- **Le disque de la machine est instable** : `git commit/checkout` plantent par intermittence (SIGBUS, timeouts), et l'**index git a été corrompu deux fois** (tout apparaît supprimé / commit qui supprime 137 fichiers). Procédure de réparation éprouvée : vérifier qu'aucun process git ne tourne → `git reset HEAD` (ou `git reset main`) pour reconstruire l'index → re-commit → **toujours contrôler `git show --stat HEAD` avant de pousser**. Ne jamais supprimer `.git/index.lock` pendant qu'un process git tourne.
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

**Migrations appliquées en prod : 001 → 040, toutes.** Chaque migration ≥034 a son rollback.

## 6. À faire — backlog priorisé

1. **[Validé par Mathieu, à faire en premier]** Ajouter le bloc « Mon suivi » (statuts + favori + rappel) dans le **panneau latéral LBA** (`PanelFormationLBADrawer`) : aujourd'hui seul ce panneau s'ouvre depuis la recherche de formations, et il n'a pas le suivi (seulement le marque-page « Enregistrer »). Incohérence d'expérience signalée par Mathieu. Point d'attention : le drawer manipule des formations LBA pas encore en base → réutiliser le POST `/api/formations-lba` (snapshot) avant de poser statut/favori.
2. **Surveiller en prod** le bug « boutons de statut bloqués » sur la fiche formation : corrigé défensivement (try/finally + message), mais la cause racine n'a pas été identifiée. Si un message rouge « La mise à jour du suivi a échoué » apparaît, récupérer le texte + console.
3. Migration de **nettoyage** : DROP `formation_statuts` + `formation_actions` (après quelques jours de validation), et au même moment supprimer `candidats_import` (orpheline) ou la raccorder.
4. Brancher les **filtres RQTH / télétravail** de la recherche entreprise (les colonnes existent dans `candidats`, les toggles UI ne filtrent rien).
5. **Hook `useCandidatures()`** partagé : 3-4 implémentations divergentes d'insertion de candidature subsistent (PanelCandidatOffres, PanelCandidatFormations, PanelFormationPublique, API formations-lba) — valeurs par défaut incohérentes.
6. Adopter `lib/format.js` et `lib/regions.js` dans les panels (copies locales d'`initiales`/`sigle`/`REGIONS` encore présentes), idem pour les tables niveau→couleur dupliquées.
7. Supprimer le code mort : branche signup de `app/login/page.jsx`, branche « formations Allschool » de `PanelCandidatFormations` (la recherche interne ne renvoie plus rien).
8. Migration progressive **`.jsx` → `.tsx`** en s'appuyant sur `lib/types.ts` ; générer les types Supabase (`supabase gen types typescript`).
9. Performance : recherche « France entière » sans secteur = ~150 appels LBA (12 lots ROME × 13 régions) — prévoir un cache applicatif ou une limitation.
10. Produit (plus tard) : page « avis écoles » (les liens existent dans le dashboard école mais aucune table), espaces école « Mes offres / Partenaires / Événements / Avis » encore en « À venir ».

## 7. Démarrage rapide d'une nouvelle session

```bash
npm run build        # doit être vert
git log --oneline -5 # vérifier l'état de main
```
- Tout le contexte fonctionnel est dans ce fichier + les 3 documents de référence.
- Avant tout chantier : créer une branche, suivre la méthode §3, se méfier des pièges §4.
