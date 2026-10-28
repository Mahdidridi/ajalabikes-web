# ajalabikes-web

**Next.js 16 (App Router) + React 19 + TypeScript — affichage uniquement.**

**Projet : Darraja Bikes** (دراجة) — nom technique `darrajabikes`, domaine `darrajabikes.com`
(décision du 28 août 2026). Le dépôt garde son nom historique, comme `package.json` (`ajala-web`) et
`ajalaImageLoader` : seul le nom affiché change (header, footer, métadonnées — issue #6).
**Ouvert à Google depuis le 23 octobre 2026** (décision du fondateur du 16 octobre, date révisée le 19) : `INDEXING_LOCKED`
est à `false` et l'en-tête `X-Robots-Tag` global est retiré ; chaque page dit elle-même si elle s'indexe (`seoFor`, avec
l'`indexable` décidé par l'API), toujours sans ses images (`noimageindex`) ; le `robots` du layout (`noindex, nofollow`) reste le
filet d'une page qui n'appellerait pas `seoFor` ; `robots.txt` annonce le sitemap, envoyé à Search Console le même jour (voir « SEO »).

> L'architecture, les règles de données et le périmètre du projet sont définis dans `../CLAUDE.md`.
> **Le lire avant toute tâche non triviale.** Ce fichier ne couvre que ce dépôt.

## Rôle

Ce dépôt **affiche**. Il ne décide rien.

Interdits ici : les calculs métier, le formatage de devise, la conversion d'unités, la logique de « quelle différence est importante ». Tout arrive déjà calculé depuis `ajalabikes-api`.

**Aucune formule en TypeScript.** Si vous êtes en train d'écrire un calcul, il est au mauvais endroit.

## Types API — la règle la plus importante

```
ajalabikes-api/openapi.json  →  src/types/api.ts  (généré)
```

**Ne jamais écrire à la main un type décrivant une donnée d'API.** Toujours importer depuis `src/types/api.ts`.

Régénérer après toute modification côté API :

```bash
npx openapi-typescript ../ajalabikes-api/openapi.json -o src/types/api.ts
```

La cible est une CI qui télécharge `openapi.json` depuis une release identifiée de `ajalabikes-api`, régénère, et **échoue si le résultat diffère de ce qui est committé**. Cette vérification croisée attend la phase 2 de api #19 ; elle n'est pas incluse dans la phase 1 de web #14. Une interface redéclarée à la main contournerait ce garde-fou.

## Commandes

```bash
npm run dev
npm run typecheck && npm run lint && npm run build
npm test                    # desktop + mobile + RTL, apres la recette E2E ci-dessous
```

### CI - phase 1 (web #14)

`CI` (`.github/workflows/ci.yml`) tourne sur les PR vers `main` et les pushes sur `main` : Node fixe dans
`.nvmrc` (22.13.1, version locale retenue faute de declaration precedente, a comparer au serveur), cache npm,
`npm ci`, `npm run test:policy`, `npm run check:tests`, `npm run typecheck`, `npm run lint`, `npm run build`.
Les memes commandes reproduisent la CI en local. `typecheck` genere d'abord les types de routes Next pour fonctionner
dans un checkout neuf. Le build lit `API_BASE_URL=https://api.darrajabikes.com/api` sans mutation et charge les polices
Google : ces services restent des dependances reseau. Aucun mode de rendu n'est modifie. Le garde-fou analyse les appels
dans `tests/` et refuse `test.only`, `test.skip`, `test.fixme`, y compris les suites ; aucun skip conditionnel n'existe
sur la base main de cette livraison. Les exemples en commentaires/chaines sont ignores.

`E2E production (manual)` est uniquement declenche par `workflow_dispatch`, apres fusion de son fichier sur `main`.
Le fondateur doit creer le secret GitHub **`WEB_REVALIDATE_SECRET`** (valeur du secret de revalidation du web en production)
et confirmer `confirm_cache_invalidation` : **cache.spec.ts invalide reellement le cache de production, y compris une purge
globale**. Ni execution automatique, ni secret cree par cette PR. Cible : `PLAYWRIGHT_BASE_URL=https://darrajabikes.com` ;
tests et executions serialises, echec remonte dans les logs GitHub avec masquage du secret. Aucun rapport brut/trace n'est
televerse : une erreur reseau Playwright peut inclure l'en-tete Authorization. Le workflow construit aussi Next pour
les tests d'erreur #10, qui utilisent leurs propres serveurs locaux isoles. Les tests de catalogue lisent leurs attentes
dans l'API au moment du test (web #37) ; aucun comptage de septembre n'est conserve.
Pour reproduire sans production, lancer l'API et le Next local de production, fournir leur URL et un secret **local**, puis
`npm test`. La config impose un worker et purge le cache du Next cible avant les specs. La verification croisee du contrat et le deploiement restent hors de cette phase.

### Piège vérifié le 10 août 2026 — l'interactivité ne se teste pas en `npm run dev`

Avec Next 16.3 et le layout racine sous `[locale]`, **le serveur de développement n'hydrate
pas les Client Components** : la page s'affiche correctement mais aucun bouton ne réagit, et
la console ne montre aucune erreur. Le symptôme trompe : on croit à un bug de son code.

Diagnostic en une ligne dans la console du navigateur — s'il rend `0`, rien n'est hydraté :

```js
Object.keys(document.querySelector('button')).filter(k => k.startsWith('__react')).length
```

**Toute vérification d'interactivité passe par `npm run build && npm start`**, où l'hydratation
fonctionne normalement. Playwright doit donc lancer le serveur de production, pas `next dev`.

## Règles propres à ce dépôt

**1. Server Components par défaut.**
Client Components uniquement pour : filtres, comparateur, graphiques interactifs, overlay géométrie.

**2. RTL dès le design system.**
Jamais « retourner » une interface LTR à la fin. Les composants sont testés indépendamment du sens de lecture. Locales alimentées : `ar-sa`, `en-sa`, `ar-ae`, `en-ae`.

**3. Images : loader custom, pas d'optimisation `next/image` par-dessus.**
Les conversions sont déjà générées par Laravel et servies par le CDN. Les ré-optimiser double le coût et la latence. Conserver `<Image>` pour le lazy loading et la réservation d'espace — largeur et hauteur viennent toujours de l'API.

**4. L'état du comparateur vit dans l'URL.**
Source partageable et indexable. L'état local ne fait que la synchroniser.

**5. Invalidation par tags — voir « Cache » ci-dessous.**
`build:{brand_slug}:{build_slug}` · `catalog` · `bikefinder` · `compare` · `all`. Le webhook `/api/revalidate` est appelé par Laravel avec un secret partagé — **chaque appel écrit une ligne de journal**.

**6. Indexation contrôlée.**
Comparaisons : liste blanche uniquement, jamais les permutations d'un même ensemble. Recherche libre et filtres arbitraires : `noindex`.

**7. Jamais de `aggregateRating` fabriqué** dans les données structurées.

**8. Aucune page ne défile en largeur, dès 320 px (décision du 11 octobre 2026).**
Critère WCAG 1.4.10. Mesuré ce jour-là sur `main` : en anglais, l'en-tête débordait de 33 px à 320 px sur toutes les pages,
et la liste des composants élargissait la fiche jusqu'au mot le plus long (Vado : un lien Markdown brut de 64 caractères
servi par l'API, page portée à 423 px dès 390 px). Règles : une colonne de grille qui reçoit des données prend
`minmax(0, 1fr)` et ses textes se coupent (`wrap-break-word`) — une donnée ne fixe jamais la largeur de la page ; l'en-tête
resserre ses espacements sous 380 px et ne passe à la ligne qu'en dernier recours (une ligne dès 360 px, deux en dessous en
anglais ; en arabe, deux lignes à 320 px depuis le logo dessiné du 15 octobre 2026, une ligne dès 330 px — voir « Logo »). Garde : `tests/e2e/reflow.spec.ts` (accueil, catalogue, bikefinder, comparateur, trois fiches ; AR et EN ; 320 et
390 px ; un mot de 120 caractères injecté dans la liste ; en-tête sur une ligne à 360 et 390 px).
**Précisé le 14 octobre 2026 — les noms de taille.** Scott nomme les tailles des Gambler 10, 20 et RC
« L_HIGH_BB_SETTING_POSITION_DE_BOITIER_HAUTE » (44 à 48 caractères sans espace) : relevé sur les planches du lot Scott, la fiche du
Gambler 10 mesurait 428 px à 390 px (boutons de taille), et la colonne des libellés des composants, élargie par ces noms, laissait 0 px aux
descriptions à 320 px et 24 px à 390 px — sans défilement, donc sans test rouge. Un bouton de taille ne dépasse jamais sa rangée
(`max-w-full`) et son nom s'y coupe (`SizePicker`) ; l'étiquette de taille sous un libellé ne compte pas dans la largeur de sa colonne
(`contain-inline-size`) et s'y coupe (`ComponentList`). Garde : la fiche du Gambler 10 parmi les pages, et un nom de 108 caractères injecté
dans un bouton et dans une étiquette réelle du Talon 1 (la colonne des descriptions garde sa largeur). **En production le 14 octobre 2026**
(PR #61, `main` `180e5a2`, release `20261014124830`, accord du fondateur) : e2e complète 634/634 avant fusion ; contrôle de prod en lecture
seule, 32 pages (Gambler 10, 20, RC et témoins ; AR et EN ; 320 et 390 px) sans défilement, descriptions à 101 px au moins à 320 px.

## Routes — pages marque et catégorie (2 septembre 2026)

Décision du 2 septembre 2026 (rapport SEO `../notes/seo-strategie-2026-09-02.md`, § 1) : une marque et une catégorie
ont chacune une page à chemin propre. Les chemins sont construits par `src/lib/routes.ts`, jamais à la main.

| Page | Chemin | Données |
|---|---|---|
| Marque | `/{locale}/bikes/{brand}` — `/ar-sa/bikes/trek` | `getBrandPage` (`src/lib/api-pages.ts`) : catalogue `brand=`, tri `year_desc` ; nom = facette `brands` |
| Catégorie | `/{locale}/{slug}` — `road` → `/en-sa/road-bikes`, `e_mtb` → `/ar-sa/electric-mountain-bikes` | `getCategoryPage` : catalogue `category=` ; libellé = facette `categories`, dans la langue de la page |

- **Slug de catégorie PARLANT, table explicite clé ↔ slug `CATEGORY_SLUGS` dans `routes.ts`** (décision du 3 septembre
  2026 d'après les mesures de `../notes/seo-vocabulaire-golfe-2026-09-03.md`, § 6 : on cherche « electric mountain
  bike », personne ne tape « e-mtb »). C'est la référence tant que l'API ne porte pas le slug ; le jour où elle le
  publiera, la table devient sa copie puis disparaît. `categoryKeyOf(segment)` est l'inverse strict : tout segment hors
  table rend 404, les anciens slugs dérivés (`e-mtb-bikes`) compris — jamais indexés, pas de redirection. La page
  n'existe que si la clé est aussi dans la facette `categories` ; `uncategorized` n'a pas de page (404) — c'est un état
  de la donnée, et sa tuile d'accueil garde le catalogue filtré. Une clé que l'API ajouterait avant la table n'a pas de
  page non plus : sa tuile garde le catalogue filtré jusqu'à ce qu'on lui choisisse un slug.
- **Collisions** : `[category]` vit à la racine de la locale. Les dossiers statiques `bikes`, `compare`, `finder` gagnent
  (Next préfère un segment littéral — vérifié par `tests/e2e/brand-category.spec.ts`) ; tout autre segment rend 404.
  Une nouvelle page à la racine de la locale doit être un dossier statique, jamais un second segment dynamique.
- Marque ou catégorie inconnue → `notFound()`. Métadonnées par `seoFor`, avec l'`indexable` décidé par l'API (voir « SEO »).
  Même schéma de cache que la fiche (voir « Cache »), tag `catalog`.
- Liens entrants : tuiles de l'accueil (`HomeBrands`, `HomeCategories`) et nom de la marque sur la fiche. Les tuiles des
  pages elles-mêmes mènent au catalogue filtré (`/bikes?brand=…&category=…`), un résultat réel.
- **Une fiche, une URL** (`src/app/[locale]/bikes/[brand]/[slug]/page.tsx`, `resolve()` partagé par la page et
  `generateMetadata`) : si `getBuild` renvoie un build dont `slug` ou `brand.slug` diffère de l'URL — ancien slug résolu
  par la future table `slug_redirects` de l'API, fusion —, `permanentRedirect` (308, mis en cache ISR) vers
  `/{locale}/bikes/{brand.slug}/{slug}`. *Révisé le 14 octobre 2026 (web #15, section suivante) : l'adresse millésime de
  l'édition servie est rendue sans redirection, et une redirection mène à l'adresse qui montre cette édition.*
  Un slug inconnu de l'API reste 404. `tests/e2e/redirects.spec.ts` : le cas
  de redirection est actif : son ancienne entree `fuel-mx-9-8-xt` est resolue par l'API au moment du test, puis
  la destination exacte et son statut 200 direct sont verifies. Le web repond en 308 (`permanentRedirect`) : le 301
  demande par le texte de #37 contredit le comportement et la documentation existants, sans changement applicatif ici.
  Il n'y a aucun `test.fixme` a reactiver.
  Le test exige exactement une ligne `Location`, au `MISS`, au `HIT` et apres revalidation du tag, en EN/AR.
  Voir la decision datee web #42 ci-dessous ; aucun dedoublonnage ni prechauffage ne le masque dans les tests.
- **Une seule forme canonique par adresse** (décision du 5 septembre 2026, `../CLAUDE.md` Routes point 6 ; issue #17,
  livrée le 8 septembre) : minuscules, sans slash final, apex sans `www`. Google traite les URL comme sensibles à la
  casse — chaque variante tolérée est un doublon. Trois mécanismes, chacun à sa place : la racine `/` → `/ar-sa` en
  **308** (`next.config.ts`, `permanent: true` — les URL sont figées, le 307 n'avait plus de raison ; jamais de
  négociation de langue par IP) ; la **casse** par `src/proxy.ts` — le `middleware.ts` de Next 16, renommé — qui
  redirige en 308 tout chemin portant une majuscule ou un slash final vers sa forme canonique, **chemin seulement,
  jamais la query** (`?builds=` porte des slugs, le futur `?q=` du texte saisi ; limite connue : l'adaptateur de Next
  re-sérialise la query de toute `Location` de proxy par `URLSearchParams`, « / » ressort en « %2F » — valeur et casse
  intactes une fois décodée, voulu plutôt que `skipProxyUrlNormalize` qui exposerait le schéma interne), en un seul saut,
  `/api/`, `/_next/` et les fichiers statiques exclus ; le **slash final** est retiré par le proxy aussi, avec
  `skipTrailingSlashRedirect: true` — la redirection native de Next se déclenchait avant le proxy et `/EN-SA/Bikes/`
  coûtait deux sauts ; `www` → apex est une règle nginx du site Forge (301, un saut), pas du code.
  `tests/e2e/redirects.spec.ts` couvre les six cas.

### Adresses millésime (web #15) — 14 octobre 2026

Règle du fondateur du 5 septembre 2026 (`../CLAUDE.md`, « Conventions → Routes ») ; contrat d'api #21 (`year`, `is_current`,
`model_path`, `editions`). **Mesuré en production le 14 octobre 2026** : toute adresse millésime répondait 308 vers l'adresse
modèle (`resolve()` comparait le slug demandé au slug sans année) ; l'édition 2026 d'un modèle qui a une 2027 était
inaccessible, et 40 éditions supplantées annotées restaient invisibles. L'API servait déjà la bonne édition.

- **Résolveur pur** `resolveBuildAddress()` (`src/lib/build-address.ts`), appelé par `resolve()` de la fiche : l'adresse
  modèle et l'adresse millésime `{slug}-{année}` **de l'édition servie** sont rendues telles quelles, sans redirection.
  Toute autre adresse (ancien slug de `slug_redirects`, fusion, autre marque) redirige en 308 vers l'adresse qui montre
  **cette** édition : l'adresse modèle si elle est courante, son adresse millésime sinon (avant : toujours l'adresse
  modèle, qui montre une autre édition). Un `-20xx` inconnu de l'API reste 404. L'année et le statut viennent de l'API ;
  le front ne compare que des chaînes.
- **Canonical** : adresse modèle → propre (inchangé) ; adresse millésime de l'année en cours → adresse modèle ; adresse
  millésime supplantée → propre ; vélo nommé comme sa famille (`model_path` nul, 3 vélos au 14 octobre) → son adresse
  millésime reste canonique même en cours, l'adresse modèle appartenant à la famille. `seoFor` reçoit `canonicalPath`
  (canonical et `og:url`) ; **les hreflang restent ceux de l'adresse servie** (millésime ↔ millésime, issue #15), avec les
  catchalls `ar` / `en` et `x-default` → `en-sa`. Le `Product` et le fil d'Ariane du JSON-LD suivent le canonical.
- **Tags de cache** (`buildCacheTags`) : l'API invalide toutes les éditions d'un modèle par `build:{marque}:{slug du
  modèle}` (`CatalogChanged::buildTag`, `canonical_slug` commun). `getBuild` et `getSimilarBuilds` portent donc, sur une
  adresse millésime, le tag du slug demandé **et** celui du modèle ; l'adresse modèle garde son seul tag. Aucun nouveau
  type de tag : le contrat du 2 septembre est inchangé.
- **Laissés de côté** : le sélecteur de millésimes et le bandeau « modèle actuel » (nouveaux textes à valider), le bloc
  « ce qui change » (`changes_since_previous` n'est pas servi), les liens internes (les cartes lient déjà l'adresse
  modèle, bâtie sur `slug` et non sur `model_path`) et le sitemap (les adresses millésime n'y sont pas : web #74), le 404 de l'adresse modèle d'un vélo
  nommé comme sa famille (attend la page famille, #14).
- **Tests** : `build-address.spec.ts` (résolveur, tags, `canonicalPath`, sur des réponses synthétiques) ;
  `edition-address.spec.ts` (pages réelles, attentes lues dans l'API : Trek Fuel+ EX 9.8 Eagle 90 Gen 2, 2026 et 2027 ;
  200 sans `Location`, année affichée, canonical, hreflang, `Product`, 404 d'une année jamais publiée, purge du tag du
  modèle qui re-rend l'édition supplantée, en anglais et en arabe).
- **En production depuis le 15 octobre 2026 vers 00:34 UTC+1** (PR #72, `main` `aa7ad45`, release `20261014233318`, retour arrière
  `20261014202407`, sur le « Oui, mets en ligne » du fondateur) : typecheck, lint et build verts ; 70 specs ciblées ; suite complète
  avec un seul échec, étranger à la PR (`annotated-photo.spec.ts`, cibles tactiles : sur le Vado SL 2 5.0 Step-Through EQ, la pastille
  du phare servie par l'API depuis le lot 7 est à 16 px de celle du guidon à 320 px — issue api #76, règle de distance minimale entre
  deux ancres à écrire côté API ; le test est juste et reste tel quel) ; contrôle de production en lecture seule, sans suivre les
  redirections : 475 vérifications, 0 écart — 40 éditions non courantes annotées en 200 avec leurs notes et un canonical propre,
  9 Trek Fuel 2027 en 200 avec canonical vers l'adresse modèle et sans notes, 10 adresses modèle inchangées.

### Decision du 5 octobre 2026 - web #42, en-tetes des redirections ISR

- **Cause** : Next 16.3.0 ecrit `Location` pendant le rendu, puis son replay ISR appelle le `appendHeader`
  natif de Node avec la meme valeur. Une reproduction minimale executee sans proxy, `next.config`, API ni
  `generateMetadata` reproduit deux lignes au `MISS`, une au `HIT`. Ce n'est pas le double appel a `resolve()`.
  References : [Next #82117](https://github.com/vercel/next.js/issues/82117),
  [PR amont #95913](https://github.com/vercel/next.js/pull/95913), encore ouverte a cette date.
- **Decision** : backporter le replay via `NodeNextResponse.appendHeader`, le wrapper deja present dans Next,
  avec `patches/next+16.3.0.patch` (templates CJS et ESM). Ce wrapper n'ajoute pas une valeur deja presente,
  mais conserve les valeurs distinctes des en-tetes multiples. Aucun filtre HTTP global ni suppression en sortie.
  Les pages, `permanentRedirect`, proxy, statut 308, ISR 86400 et tags restent inchanges.
- **Installation** : `patch-package` 8.0.1 est une dependance de production, appliquee avec `--error-on-fail`
  au `postinstall` et au `prebuild`. `npm ci` puis `npm run build` suffisent ; ne pas appeler `next build`
  directement apres une installation avec `--ignore-scripts`. Un patch incompatible doit faire echouer le build.
  Next reste fixe a 16.3.0 : aucune montee de version decidee ici. A chaque mise a jour Next, revoir ce patch,
  puis le supprimer seulement apres preuve de correction amont et regression MISS/HIT/revalidation verte.
  Une difference de version seule produit un avertissement de patch-package si le patch s'applique encore :
  le verrou de version reste package.json/package-lock.json, pas l'option --error-on-fail.
- **Portee mesuree avant correction** : ancien slug EN/AR et deux URL millesimees ont le doublon au MISS ;
  racine `/` vers `/ar-sa`, casse et slash final n'en ont pas (redirections avant le rendu ISR).
  Les millesimes sont observes seulement : leur politique reste du ressort de #15. Aucun second ancien slug
  renomme n'a ete identifie parmi les autres candidats testes (404 API), sans en inventer un pour la preuve.
- **Production observee sans purge** : le 5 octobre a 15:41:45 UTC, le GET arabe de l'ancien slug rend
  308/MISS avec une seule Location, puis HIT avec une seule ; a 15:47:17 UTC, une URL millesimee arabe fait
  de meme en HTTP/2. Noindex intact. Aucun doublon visible a l'interface publique sur ces echantillons ;
  l'origine Next derriere nginx n'a pas ete inspectee et aucun diagnostic nginx n'est affirme.
  La redirection racine ne porte deja pas X-Robots-Tag en local avant le patch ; ce comportement reste hors #42.
- **Decisions toujours ouvertes** : choix 301/308, autorisation des deux E2E de production #37,
  libelle arabe `scope.unresolved`, valeurs unresolved de la mention commune et memoisation de date API.
  Cette PR ne tranche aucun de ces points et n'autorise ni purge distante ni deploiement.

## Cache — rendre une fois, invalider au changement

Contrat partagé avec l'API : `../tasks/2026-09-02-cache-contrat.md`. Les tags y sont la référence ; aucun autre n'est inventé sans le mettre à jour.

- **Lectures API** (`src/lib/api.ts`) : `cache: 'force-cache'` + `next: { tags, revalidate: 86400 }`. Les 24 h sont un filet, l'invalidation par tag est le mécanisme. `getBuild` → `build:{brand}:{slug}` (plus `build:{brand}:{slug du modèle}` sur une adresse millésime, web #15) · `getCatalog` → `catalog` · `getFinderTree` / `getFinderResults` → `bikefinder` · `getCompare` → `compare`.
- **Pages** : fiche vélo, pages marque et catégorie, étapes du finder sont rendues au premier appel puis servies du cache (`revalidate = 86400`, `dynamicParams = true`, `generateStaticParams` vide — sans lui, même vide, Next rend la route à chaque requête). Accueil et racine du finder sont prérendus par locale avec le même `revalidate`. Catalogue et comparateur restent dynamiques (`searchParams`), mais leurs appels API sont cachés.
- **Route `POST /api/revalidate`** (`src/app/api/revalidate/route.ts`) : `Authorization: Bearer $REVALIDATE_SECRET` (comparaison en temps constant, secret absent = tout refusé), corps `{ "tags": [...], "reason": "..." }`. Réponses : `200 { revalidated, reason, at }` · `401 { "error": "unauthorized" }` · `422 { "error": "tags required" }`. Chaque tag expire immédiatement (`revalidateTag(tag, { expire: 0 })` : la requête suivante re-rend, jamais de page périmée servie après un import) ; `all` = `revalidatePath('/', 'layout')`. Une ligne `[revalidate] {"status","tags","reason","ms"}` par appel dans la sortie du serveur.
- **Preuve** : l'en-tête `x-nextjs-cache` sur toute page cachée — `MISS` au premier rendu, `HIT` ensuite, de nouveau `MISS` après le tag. Uniquement sous `npm run build && npm start` : `next dev` ne cache rien. Vérifié par `tests/e2e/cache.spec.ts`.
- **Purger en local** (secret de `.env.local`, jamais commité ; la valeur suivante est un exemple local uniquement,
  pas une valeur par defaut du spec) :

  ```bash
  curl -X POST http://127.0.0.1:3000/api/revalidate \
    -H "Authorization: Bearer secret-local-de-test" -H "Content-Type: application/json" \
    -d '{"tags":["all"],"reason":"purge manuelle"}'
  ```

- **Limite connue** : le cache handler par défaut de Next garde les invalidations de tags **en mémoire du processus** (`tags-manifest.external`) ; le HTML est sur disque, mais avec plusieurs workers PM2 seul celui qui reçoit le webhook purge, les autres servent l'ancienne page jusqu'au filet de 24 h. Un seul worker, ou un cache handler partagé, avant de passer en cluster.

### Tests de catalogue et revalidation (web #37)

- Les six specs accueil/catalogue/collections/SEO/redirections/cache lisent les nombres, facettes et fiches depuis
  `API_BASE_URL`, avec la locale et les filtres de la page. Les types viennent du contrat genere, aucune API simulee
  pour ces assertions. Une API indisponible ou une fiche requise absente fait echouer le test, sans valeur de secours.
- L'API fournit `meta.total`, `count` et `label`, **pas de compteur preformate**. Les attentes de texte utilisent un
  oracle linguistique independant ; des cas litteraux verifient aussi les formes arabe/anglais de `bikesCount`.
- `API_BASE_URL` et `REVALIDATE_SECRET` doivent etre exportes dans le processus Playwright et correspondre au serveur teste ; Playwright ne
  lit pas automatiquement son `.env.local`. Aucune API locale de secours n'est utilisee. Le secret est rogne avant usage.
  Sans ces variables, le setup echoue avant tout POST avec la commande a exporter.
  Les tests explicites sans secret/mauvais secret restent actifs. Aucun skip, aucune valeur locale implicite.
- La config impose **un seul worker**, car le tag `all` purge aussi l'accueil partage avec les autres specs.
  Le `globalSetup` purge `all` une fois avant les specs : les pages et les attentes repartent du meme catalogue,
  meme si le cache Next sur disque a survecu au build. Une surcharge `--workers>1` est refusee.
  Ne pas lancer deux suites contre le meme Next. Recette locale PowerShell, depuis le worktree :

  Terminal serveur (API de production en lecture seule, Next et secret locaux) :

  ```powershell
  $env:API_BASE_URL = 'https://api.darrajabikes.com/api'
  $env:REVALIDATE_SECRET = 'secret-local-de-test'
  npm run build
  node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101
  ```

  Terminal tests (meme API et meme secret que le terminal serveur) :

  ```powershell
  $env:API_BASE_URL = 'https://api.darrajabikes.com/api'
  $env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3101'
  $env:REVALIDATE_SECRET = 'secret-local-de-test'
  npm test
  ```

  Pour une cible distante, l'API doit etre celle du site teste. **Production : accord distinct avant ces commandes**,
  car le setup ET les tests invalident reellement son cache, meme pour une selection de specs. Ne jamais copier le secret dans un rapport ou publier des traces/HTML
  bruts contenant des appels authentifies ; privilegier le workflow manuel avec les logs masques GitHub.

## SEO — ouvert à Google le 23 octobre 2026

Décisions du 2 septembre 2026 (`../CLAUDE.md`, « Routes et locales », points 1 à 5 ; rapport `../notes/seo-strategie-2026-09-02.md`). Tout a été mis en place sous verrou, **levé le 23 octobre 2026** (dernier point de cette liste).

- **`src/lib/seo.ts` — `seoFor({ locale, path, title?, description?, indexable? })`**, appelé par chaque page (`generateMetadata`) : canonical absolu, auto-référent, **sans query** (`SITE_URL` = `https://darrajabikes.com`, `metadataBase` posé dans le layout) ; hreflang `ar-SA` / `en-SA` dérivés de `LOCALES` (`ae` y entrera tout seul le jour où il sera servi), catchalls `ar` → `ar-sa` et `en` → `en-sa` (fixes sur `sa`, voir ci-dessous) + `x-default` → `en-sa` ; Open Graph (`locale`, `alternateLocale`, `url`, `siteName`) ; `robots`. La réciprocité des hreflang vient de là : toutes les pages émettent le même groupe. Titre = libellé existant de la page + ` · Darraja Bikes` ; fiche = `bikePageTitle(locale, build)` — en anglais `bikeTitle` (marque, modèle, millésime tel que libellé par l'API, seulement s'il est connu), en arabe la marque en lettres arabes (point suivant) ; description absente = signature — **sauf la fiche, qui a la sienne** : `bikeDescription(locale, build)` (« دراجة {marque} {modèle} {année} : المواصفات الكاملة، الهندسة حسب المقاس ({n} مقاسات)… » / « {brand} {model} {year}: full specs, geometry by size ({n} sizes)… »), bâtie sur les champs rendus par l'API, un champ absent omis (millésime inconnu, aucune taille), coupée au dernier mot entier au-delà de 160 caractères. La catégorie n'y entre pas tant que `BuildResource` ne l'expose pas.
- **La marque en lettres arabes dans les titres arabes — décision du fondateur du 27 octobre 2026.** Fiche :
  « دراجة {brand.name_ar} {modèle} {millésime} · Darraja Bikes » (`bikePageTitle`, `src/lib/seo.ts`) ; page marque :
  « دراجات {name_ar} · Darraja Bikes » (`TITLE_NAME`, `src/app/[locale]/bikes/[brand]/page.tsx`). Le nom arabe vient de
  l'API (`brand.name_ar` de la fiche, `name_ar` des seaux de la facette `brands`, nul s'il n'est pas connu → titre latin,
  comme en anglais). **Seul le `<title>` (et `og:title`) change** : la description garde la marque en latin — le résultat
  Google porte les deux écritures —, H1, fil d'Ariane et JSON-LD gardent le nom canonique. Pourquoi : au relevé du
  27 octobre (Google, région Arabie), le site était absent de « دراجة كانيون », « دراجه تريك مارلن », et les sites qui
  sortaient écrivaient la marque en arabe dans leur titre ; l'autocomplétion saoudienne montre que « دراجة » + la marque en
  arabe est une recherche réelle (« دراجة كانيون للبيع », « دراجة تريك مارلين 6 »), alors que la marque seule en arabe veut
  dire autre chose (la voiture GMC, une société de livraison) — mesures dans `../notes/data/marques-arabe-2026-10-27/`.
  Les 5 noms (كانيون، تريك، جاينت، سكوت، سبيشلايزد) sont validés par le fondateur et écrits par l'API (migration du
  27 octobre). Tests : `tests/e2e/seo.spec.ts` (« titre des fiches », page marque).
- **Vocabulaire arabe mesuré — `src/lib/vocabulary.ts`** (décision du 4 septembre 2026, `../CLAUDE.md` « Routes et
  locales » point 6, mesures dans `../notes/vocabulaire-verification-2026-09-04.md`) : le générique « vélo » est
  « دراجة / دراجات ». **« سيكل » a été retiré du site** — l'autocomplétion saoudienne le rend d'abord comme médicament
  et cycle menstruel, puis comme vélo d'enfant (رامبو, كوبرا, مقاس 20). Le générique est **complet — « الدراجات
  الهوائية » / « دراجات هوائية »** — partout où le texte est isolé dans un résultat de recherche : H1 et `<title>` du
  catalogue et des catégories, fil d'Ariane du JSON-LD ; « دراجات » nu au pluriel appelle la moto. Ailleurs, le contexte
  étant posé par la page, « دراجة » seul suffit : compteurs, boutons, description de fiche (« دراجة {marque} {modèle} »,
  la forme du distributeur Trek officiel en Arabie). La marque « درّاجة » / « Darraja Bikes », `SITE_NAME_AR` et la
  signature ne changent pas. Les compteurs passent par `bikesCount(locale, n)` — accord par `Intl.PluralRules` (3 à 10 →
  « دراجات », 11 à 99 → l'accusatif « دراجةً », le reste → « دراجة » ; « 1 bike » / « bikes »), jamais `{n} {mot}` à la
  main. Les libellés de catégories viennent de l'API et ne se touchent pas ici.
- **Tout nom propre latin rendu dans une page arabe passe par `<bdi>`.** Marque, famille, modele, libelle du
  selecteur de comparaison. Sans lui, l'algorithme bidirectionnel rattache un signe FINAL (`+`, `!`, `"`, `)`) a la
  direction de la page et le rend de l'autre cote du mot : « Borrego+ » s'affiche « +Borrego » (constate en
  production le 4 septembre 2026, 11 modeles sur 634 concernes — Borrego+, Talon E+, Ponto Go!, Townie Go!,
  Precaliber 12"/16"/20", quatre TCR a suffixe entre parentheses). **Le DOM est juste, seul le rendu est faux** :
  un test qui lit le texte ne voit rien, il faut mesurer la position des boites (`tests/e2e/bidi.spec.ts` compare
  le x du premier et du dernier caractere). `<bdi>` isole son contenu — direction resolue seule, sans contaminer
  la phrase ni etre contamine par elle. Ce que `<bdi>` ne couvre pas : le `<title>` de l'onglet et les
  `<meta>`, qui sont du texte pur — un nom a signe final peut s'y afficher retourne, sans correction propre
  possible.
- **`INDEXING_LOCKED = false` depuis le 23 octobre 2026** (posé, il forçait `noindex, nofollow` partout ; le reposer **avec** l'en-tête `X-Robots-Tag` de `next.config.ts` est le retour arrière d'urgence, leurs commentaires disent comment — l'un sans l'autre annule tout). `indexable: false` (catalogue avec query, comparateur avec query, étapes du bikefinder) donne `noindex, follow`. Le `robots: noindex` du layout reste le défaut d'une page qui n'appellerait pas le helper. **Préparé le 19 octobre 2026 pour l'ouverture** (plan du 16 octobre, `../tasks/plans/2026-10-16-levee-noindex.md`) : la politique est la fonction pure `robotsPolicy(locked, indexable)` ; **`noimageindex` toujours**, verrou posé ou levé (les photos sont celles des constructeurs, leurs droits ne sont pas documentés : elles restent hors de Google Images ; les médias, servis par l'API, restent derrière son `robots.txt` `Disallow: /`) ; fiche, marque et catégorie passent l'`indexable` **décidé par l'API** (photo, seuil de 5 vélos, adresse provisoire d'api #25) — le front ne le recalcule pas.
- **JSON-LD** : `src/lib/jsonld.ts` construit, `src/components/JsonLd.tsx` rend — un `<script type="application/ld+json">` par bloc, dans la langue de la page, tout vient de la réponse API (un champ absent est omis). Accueil : `WebSite` (+ `alternateName` « دراجة », `inLanguage`) et `Organization`, sans `SearchAction`. Fiche : `BreadcrumbList` (Accueil → Vélos → Marque `/bikes/{brand}` → Fiche) et `Product` (`name`, `brand`, `url`) **sans `image`** (décision du 16 octobre 2026 : les photos restent hors de Google tant que leurs droits ne sont pas documentés), **sans `offers`, sans prix, sans `aggregateRating`**. Catalogue nu : `ItemList` des cartes de la page ; jamais sur un catalogue filtré. Pages légales : `BreadcrumbList` (Accueil → Page) et `WebPage`, ou `ContactPage` pour le contact (`legalPageJsonLd`).
- **`robots.txt` et `sitemap.xml` — générés, derrière le verrou** (levé le 23 octobre 2026 : la branche « déverrouillé » est servie). `src/app/robots.ts` rend `robotsRules(INDEXING_LOCKED)` (`src/lib/seo.ts`) : verrouillé, `User-Agent: *` / `Disallow: /` sans ligne `Sitemap:` — le contenu de l'ancien `public/robots.txt`, supprimé (un fichier statique ne coexiste pas avec la route ; Next écrit `User-Agent` avec sa capitale, la casse d'un champ est libre) ; déverrouillé, tout permis sauf `/api/` (le webhook), plus `Sitemap: https://darrajabikes.com/sitemap.xml` — **plus de `Disallow` sur `/{locale}/compare?` ni `/*per_page=` depuis le 16 octobre 2026** : Google ne lit pas le `noindex` d'une adresse qu'on lui interdit de visiter, et chaque fiche lie une dizaine de comparaisons ; elles restent `noindex, follow` par leur propre balise. `src/app/sitemap.ts` rend `sitemapEntries(INDEXING_LOCKED, données)` (`src/lib/sitemap.ts`, fonction pure) : verrouillé, un `urlset` vide sans appel à l'API ; déverrouillé, un seul fichier par locale servie — **seulement ce que l'API dit indexable** (décision du 16 octobre 2026) : accueil, catalogue nu, `/finder`, les quatre pages légales, pages marque (facette `brands`) et catégorie (facette `categories` sauf `uncategorized`, slug de `routes.ts`) indexables, fiches indexables à leur adresse canonique (`currentBuildPath` : l'adresse millésime pour un vélo nommé comme sa famille), lues par `getCatalog` à `per_page=800` (borne haute de l'API, ramenée silencieusement, absente du contrat) puis par curseur — chacune avec son groupe hreflang (`hreflangGroup`, le même que le `<head>`). `lastmod` = `last_changed_at` des fiches (api #13) ; les autres pages n'ont pas de date fiable et n'en reçoivent aucune ; ni `changefreq` ni `priority`. `revalidate = 86400`, re-rendu sur le tag `catalog`.
- **Tests** : `tests/e2e/indexation.spec.ts` (ex-`noindex.spec.ts`, retourné à l'ouverture) — les routes telles que servies : aucune réponse du site ne porte `X-Robots-Tag` (le remettre seul désindexerait tout), `robots.txt` ouvert sauf le webhook et sitemap annoncé, chaque page en `index, follow, noimageindex` ou `noindex, follow, noimageindex` selon l'avis de l'API **au moment du test** (son oracle, jamais le code du site), le sitemap égal aux fiches que l'API dit indexables. `tests/e2e/seo.spec.ts` — canonical, hreflang réciproques, JSON-LD, balise robots, et le `<head>` reçu par un robot sans JavaScript (UA Bingbot : Next diffère sinon les métadonnées des pages dynamiques dans le `<body>`). `tests/e2e/sitemap.spec.ts` — les fonctions pures, verrou posé et levé.
- **Prérequis de la levée** (droits d'images documentés · `indexable` + `last_changed_at` exposés par l'API · Search Console · mesure TTFB depuis Riyad · audit crawler et Rich Results Test), *état au 23 octobre 2026* : `noimageindex` tient lieu de droits documentés ; `indexable` et `lastmod` faits (api #79 en production le 19 octobre) ; pages légales en production le 22 (section suivante) ; audit crawler du 16 octobre (JSON-LD valide partout) ; Search Console validée le 22 (propriété de domaine, DNS chez Cloudflare) ; **mesure depuis Riyad non faite** (Cloudflare toujours sans proxy : aucun bord devant le site).
- **Ouverture à Google — en production le 23 octobre 2026**, sur le « Ouvre » du fondateur : PR #89 (`main` `62d21bb`, arbre = tête testée `cc46ffa`), release `20261023140420` (retour arrière `20261022153101` : `current` → cette release, `pm2 reload site-3364441`, purge — ou le retour arrière d'urgence du verrou ci-dessus) ; CI verte ; suite e2e complète **896/898** avant fusion (les 2 échecs connus api #76, mot pour mot ceux du 22 octobre sur le code de `main`) ; purge (`compare:version` 43). Contrôle de prod en lecture seule : les **1 042** adresses du sitemap une à une (998 fiches avec `lastmod`, les huit pages légales) — 200 sans redirection, aucun `X-Robots-Tag`, `index, follow, noimageindex`, canonical = adresse du sitemap, cinq hreflang réciproques — plus `robots.txt` ouvert avec `Sitemap:`, racine en 308, `robots.txt` de l'API toujours `Disallow: /` et une photo servie en `X-Robots-Tag: noindex` : **0 écart** ; comparateur avec `?bikes=` et catalogue filtré en `noindex, follow, noimageindex`, canonical vers la page nue. **Search Console** : sitemap `https://darrajabikes.com/sitemap.xml` envoyé le même jour et lu aussitôt — « Opération effectuée », 1 042 pages découvertes (affiché « Impossible de récupérer » pendant la première minute : l'état d'un sitemap pas encore lu, pas une erreur). **Reste** : mesure depuis Riyad, Bing Webmaster Tools, facettes et pagination (web #19).

### Catchalls hreflang — décision du 5 septembre 2026, appliquée le 5 octobre (web #18)

`hreflangGroup()` ajoute `ar` → `ar-sa` et `en` → `en-sa` à `ar-SA`, `en-SA` et `x-default` → `en-sa` : cinq liens.
Ces deux catchalls restent fixes sur `sa` quand d'autres pays seront servis (`en-ae` entrera dans le groupe sans
déplacer `en`) ; aucune route `/ar` ou `/en` n'est créée. Les huit types de page passant par `seoFor()` héritent du
groupe : accueil, catalogue (nu ou filtré), fiche vélo, marque, catégorie, comparateur, entrée du finder et étapes du
finder — même groupe depuis les deux locales, canonical propre inchangé. Le sitemap consomme déjà ce helper : ses
tests de politique cible, verrou simulé à `false`, attendent aussi les cinq liens ; son code ne change pas.
`INDEXING_LOCKED`, le noindex global, `robots.txt`, le sitemap servi vide et la signature de `seoFor` restaient inchangés (verrou levé le 23 octobre 2026, voir « SEO »).

## Pages légales (web #16) — rédigées le 19 octobre 2026, validées par le fondateur le 22

Exigées avant l'ouverture à Google (plan du 16 octobre 2026). Quatre pages, deux langues : `/{locale}/privacy`
(confidentialité), `/{locale}/image-rights` (droits des images et retrait), `/{locale}/contact` (contact et informations
légales), `/{locale}/terms` (conditions d'utilisation).

- **Code** : une route par page (`src/app/[locale]/{page}/page.tsx`, Server Components prérendus, `seoFor`), un rendu commun
  (`src/components/LegalPage.tsx`), les textes dans `src/lib/legal-copy.ts` (source unique, lue aussi par les tests), les
  **faits que seul le fondateur peut donner** dans `LEGAL_FACTS` (`src/lib/legal.ts`). Un fait à `null` affiche une marque
  visible (`data-legal-missing`) et fait échouer `legal-pages.spec.ts` : aucune page ne part en ligne avec un blanc. Les noms
  latins des textes arabes passent par `<bdi>`.
- **Décisions du fondateur** : responsable de la publication « فريق Darraja Bikes » / « the Darraja Bikes team », **ni son nom
  ni son pays** (21 octobre) ; **pas de droit applicable** (21 octobre, section « التعديلات » / « Changes ») ; e-mail
  `contact@darrajabikes.com` (21 octobre), un renvoi **Cloudflare Email Routing** vers sa boîte (DNS du domaine passés de
  GoDaddy à Cloudflare le 22 octobre, sans proxy) ; journaux du serveur « deux mois au plus » (`maxage 60` appliqué par lui le
  21 octobre ; aucun journal des visites, `access_log off`) ; retrait d'une image sous 48 heures (16 octobre). Textes relus sur
  une page privée (v4) et **validés par son « OK » du 22 octobre 2026**, avec la phrase sur le miroir de l'accueil ; date de
  « dernière mise à jour » : 22 octobre 2026 (`LEGAL_FACTS.updatedAt`, même forme que les dates servies par l'API).
- **Droits des images** : la page dit « sans retouche » **sauf l'accueil**, dont la photo de droite est affichée en miroir
  (exception décidée le 21 octobre, section « Accueil » ci-dessous). Si l'accueil change, la phrase change :
  `legal-pages.spec.ts` vérifie que la page le dit tant que l'accueil montre une photo en miroir.
- **Autour** : quatre liens au pied de page de tout le site ; JSON-LD `BreadcrumbList` + `WebPage` / `ContactPage` ; les quatre
  pages sont au sitemap depuis la levée du verrou, le 23 octobre 2026.
- **Pas un avis juridique** : les cookies et l'adresse IP de Google Analytics 4 ont été vérifiés dans l'aide Google le
  19 octobre ; une relecture par un avocat saoudien reste souhaitable après l'ouverture.
- **Tests** : `tests/e2e/legal-pages.spec.ts` — page, titre, canonical, hreflang, JSON-LD et balise robots (`index, follow, noimageindex` depuis le 23 octobre 2026) des huit
  pages ; liens du pied de page (cible tactile de 24 px) ; aucun défilement en largeur à 320 px ; `<bdi>` ; liens entre pages ;
  le miroir de l'accueil dit par la page Droits des images ; aucun fait manquant.
- **En production le 22 octobre 2026** (PR #87, `main` `b427f63`, arbre = tête testée `1deabe4`, release `20261022153101`, retour
  arrière `20261021190508`), sur « Oui, fusionne et mets en ligne » du fondateur, le verrou d'indexation toujours posé : CI verte ;
  suite e2e complète 894/896 avant fusion (les 2 échecs connus api #76, cibles tactiles du Vado SL 2 à 320 px) ; purge
  (`compare:version` 42) ; contrôle de prod en lecture seule **58 vérifications conformes** (les huit pages en 200, en-tête
  `X-Robots-Tag` et `noindex, nofollow, noimageindex`, aucun fait manquant, date du 22 octobre, phrase du miroir, e-mail, quatre
  liens au pied de page des deux accueils, paire de vélos, `robots.txt` `Disallow: /`, sitemap vide, une fiche et une photo en 200).
  **Search Console** : propriété de domaine `darrajabikes.com` validée le même jour, par la validation automatique Google ↔ Cloudflare
  (une ligne TXT `google-site-verification` ajoutée à la zone : **ne jamais la supprimer**) ; sitemap envoyé à l'ouverture, le 23 octobre (voir « SEO »).

## Pages d'erreur (web #10)

- `[locale]/not-found.tsx` conserve la langue, le cadre du site et les liens accueil/catalogue. Le catch-all
  `[locale]/[...rest]` couvre les chemins inconnus profonds ; les routes existantes gardent la priorite.
- Les locales invalides utilisent `app/not-found.tsx`, les routes sans correspondance `global-not-found.tsx`
  (`experimental.globalNotFound`). Les deux rendent le meme document bilingue, sans redirection et en HTTP 404.
- `[locale]/error.tsx` utilise `retry`, stable dans Next 16.3 : rechargement des donnees et nouveau rendu.
  Aucun message technique ni digest dans l'interface.
- **Premier rendu ISR en panne** : Next contourne les error boundaries App Router. Le secours statique
  `pages/500.tsx` conserve HTTP 500, affiche les deux langues et recharge l'URL au clic. `_app` et `_document`
  servent uniquement ce secours ; aucune politique de cache n'est modifiee. La coexistence Pages/App rend
  les hooks de navigation nullable dans les types Next, d'ou les gardes dans les composants concernes.
- `ThemeScript` applique le meme choix memorise dans les trois documents ; la 404 racine peut etre montee
  cote client, d'ou `next/script` afterInteractive dans ce seul repli. Plus d'en-tête `X-Robots-Tag` depuis le 23 octobre 2026 :
  Google n'indexe pas une réponse 404 ou 500, et `not-found.spec.ts` garde l'absence de l'en-tête.
- `tests/e2e/not-found.spec.ts` lance ses propres serveurs Next **de production** et API simulee sur ports libres.
  Construire d'abord avec une API disponible (`API_BASE_URL`), puis `npx playwright test tests/e2e/not-found.spec.ts`.
  Les autres specs conservent leur serveur externe. Les captures sont des pieces jointes du rapport Playwright,
  jamais des fichiers committes. Les nouveaux libelles arabes restent soumis a la validation du fondateur.

## Bikefinder — teintes de la question racine (décision du 9 octobre 2026)

Les cinq tuiles de la **première** question (`/{locale}/finder`) portent chacune une teinte ; les écrans suivants restent
neutres. Demande du fondateur, d'après la page du bikefinder de Trek (sa capture, teintes relevées au pixel).

- **Palette** : lavande `#D0B9D3`, vert sauge `#83A487`, bleu `#6CA8BB` et pêche `#FFB495` sont les quatre teintes de Trek ;
  le jaune beurre `#F6D77C` de Kids est une proposition, choisie par le fondateur. Jaune parce que c'est la seule famille de
  teinte absente de cette palette ; le rose a été écarté (écart de couleur ΔE76 de 15,7 à la lavande, contre au moins 27,4
  entre deux teintes de Trek). Variante écartée : `#F4D35E`, plus vive.
- **Attribution** (table `TILES`, `src/app/[locale]/finder/question.tsx`, teinte et illustration) : Road lavande · Mountain sauge · **Gravel &
  cyclocross bleu** · City & fitness pêche · Kids jaune. Le bleu est celui de l'« E-Bike » chez Trek, libre ici parce que
  l'assistance électrique est une question de deuxième niveau ; si une tuile « électrique » devient racine, elle recevra sa
  propre teinte. Écarté : Gravel en lavande comme « Road or Gravel » chez Trek (deux tuiles identiques, bleu inutilisé).
- **Thème** : mêmes teintes en clair et en sombre, encre fixe `#171717` (contraste d'au moins 6,5:1, seuil AA 4,5). Tokens
  `--tone-*` de `globals.css`, jamais redéfinis par le thème sombre.
- **Clé inconnue** : une option que l'API ajouterait n'a pas de teinte et garde la tuile neutre — jamais une teinte devinée.
  Pure présentation : aucune règle métier, aucun champ d'API, le contrat n'est pas touché.
- **Tests** : `tests/e2e/finder.spec.ts` (les cinq fonds exacts en AR et EN, contraste du texte en clair et en sombre) et
  `tests/e2e/finder-tones.spec.tsx` (la règle « racine seulement » et la clé inconnue, sur des questions synthétiques ; le
  composant porte `@jsxImportSource react`, convention des specs `.tsx`). Changer une teinte = ces deux specs, `globals.css`
  et `question.tsx` dans le même commit.

### Illustrations des tuiles (décisions du 9 octobre 2026)

> **Direction visuelle du projet (fondateur, 9 octobre 2026)** : un **système d'illustrations éditoriales dessinées à la
> main** — traits d'encre, textures de crayon, quelques touches de couleur — qui donne à chaque catégorie de vélo une image
> expressive, reconnaissable et cohérente avec l'ensemble du site. Formulation complète : `../CLAUDE.md`, « Direction
> visuelle ». Les tuiles du Bikefinder en sont la première application.

Demande du fondateur : des images dans les blocs de couleur, Road et Mountain d'abord (en production le 9 octobre 2026,
web #47), puis les trois autres le même jour : les cinq tuiles de la racine portent leur illustration. Mise en page validée
par lui sur un aperçu de la vraie page.

- **Provenance et droits** : cinq PNG à fond transparent fournis par le fondateur le 9 octobre 2026 (dossier
  `Downloads/velos/illustration`, originaux conservés hors dépôt) : `road_bike_endurace_illustration_dessinee_main.png`
  (Road, 1672×941), `velo_illustration_dessinee_main.png` (Mountain, 1673×940),
  `gravel_cyclocross_grail_cf7_illustration_dessinee_main.png` (Gravel & cyclocross, 1672×941),
  `city_fitness_precede_on_illustration_dessinee_main.png` (City & fitness, 1672×940),
  `kids_grand_canyon_young_hero_illustration_dessinee_main.png` (Kids, 1672×940). **Déclarées créées de zéro (par lui ou par
  une IA), pas d'après une photo de constructeur** — sa réponse à la règle « Images » du `CLAUDE.md` racine : le 9 octobre 2026
  pour Road et Mountain, puis, le même jour, « mêmes conditions » pour Gravel, City et Kids. Les noms de fichiers citent des
  modèles de constructeurs (Canyon, Trek) : c'est pourquoi la question est reposée à chaque nouvelle illustration. Une
  illustration tirée d'une photo de constructeur relève de la posture droits d'images encore à trancher avant la levée du
  noindex.
- **Mise en page** : vélo ENTIER, jamais rogné, collé en bas de la tuile, libellé inchangé en haut ; **jamais retourné en
  arabe** (miroiter l'image ferait passer la transmission du côté opposé). Les tuiles de la racine sont des colonnes flex dont
  la cellule `li` s'étire : toutes les tuiles d'une rangée ont la hauteur de la plus haute (128 → 156 px sur grand écran, mesuré
  avec les cinq illustrations).
  Décorative : `alt=""`, le nom accessible reste le libellé.
- **Fichiers** : `public/finder-art/{road,mountain,gravel,city,kids}-{320,480}-v1.webp` (le nom de base n'est pas toujours la
  clé d'option : `gravel-cx` → `gravel`, `city-fitness` → `city`), 22–27 Ko à 320 px et 41–50 Ko à 480 px, servis en
  `srcset` en largeurs avec un `sizes` calculé sur la grille (2, 3 puis 5 colonnes). Le `-v1` est la version : remplacer une
  image = un nouveau nom, jamais l'ancien écrasé, parce que `next.config.ts` les sert en
  `Cache-Control: public, max-age=31536000, immutable` (Next sert `public/` en `max-age=0` par défaut). Un `<img>` et non
  `next/image` : le loader du site est global et réservé aux médias de l'API (règle 3).
- **Recette d'une illustration** (Pillow) : rogner à l'emprise visible (alpha > 6) plus 3 px, redimensionner en Lanczos à
  320 et 480 px de large, WebP qualité 70, `alpha_quality` 90, `method` 6 ; contrôler les bords sur la teinte réelle de la
  tuile (aucun halo). Les dimensions réservées (`width` / `height` de `TILES`) sont celles du fichier de 480 px.
- **Ajouter une illustration** : fichiers dans `public/finder-art/`, entrée `art` dans `TILES` (`question.tsx`),
  `ILLUSTRATIONS` dans `tests/e2e/finder-tones.spec.tsx` et ce paragraphe, dans le même commit.
- **Tests** : `finder-tones.spec.tsx` (attributs des cinq tuiles, deux largeurs, décorative, aucune image hors racine ni sur
  une clé inconnue) ; `finder.spec.ts` (image chargée, entière dans sa tuile, proportions réservées = fichier, hauteurs égales
  par rangée, dix fichiers servis en WebP immuable).

## Logo (décision du fondateur du 15 octobre 2026)

Le mot « درّاجة » dessiné à la main — trait d'encre, shadda posé sur une touche de crayon jaune — remplace le nom en texte
dans l'en-tête, le pied de page et les deux pages d'erreur autonomes (404 racine, 500). Composant `BrandLogo`
(`src/components/BrandLogo.tsx`).

- **Provenance et droits** : quatre PNG à fond transparent (1536×1024) fournis par le fondateur le 15 octobre 2026, générés
  par lui avec ChatGPT à partir de son propre logo dessiné ; originaux conservés hors dépôt. Ni photo ni marque de tiers.
  Deux encres — **noire pour le thème clair, blanche pour le sombre** (le shadda reste noir sur son jaune) — et deux formes :
  le mot seul (`wordmark`) et le mot avec « DARRAJA BIKES » dessous (`lockup`).
- **Où** : en-tête = le mot seul, **20 px de haut sur téléphone, 32 px dès `sm`** ; « Darraja Bikes » reste dans le lien, en
  `sr-only` sur tous les écrans (décision du 16 octobre 2026, ci-dessous), et le nom accessible du lien ne change pas (« درّاجة Darraja Bikes », texte alternatif en
  `lang="ar"`). 20 px parce qu'à 360 px, en anglais, la barre n'avait que 15 px de marge pour tenir sur une ligne (mesuré le
  15 octobre 2026 : le nom en texte faisait 36,5 px de large, le mot dessiné en fait 48). Conséquence mesurée : l'en-tête
  arabe, qui tenait sur une ligne à 320 px, y passe désormais sur deux (une ligne dès 330 px) ; l'anglais ne change pas (une
  ligne dès 360 px). Pied de page = le logo complet, **176 px de large** (`w-44`), au-dessus de la signature. Pages d'erreur
  autonomes = le mot seul, comme l'en-tête.
- **Plus de nom latin dans l'en-tête (décision du fondateur du 16 octobre 2026)** : le texte « Darraja Bikes » en petites
  capitales (`text-xs uppercase tracking-[0.2em] text-muted`), jusque-là affiché dès `sm` à côté du mot dessiné, n'est plus
  affiché sur aucun écran. Même gris et même graisse que les liens du menu, il se lisait comme un quatrième lien et alourdissait
  la barre (mesuré le 16 octobre : le lien de la marque faisait 209 px de large, dont 124 pour ce texte, contre 77 pour le mot
  dessiné ; il en fait 77 et la barre garde ses 59 px de haut). Il **reste dans le lien, en `sr-only`** : sans lui, l'image
  serait le seul nom du lien — le nom accessible et `getByRole('link', { name: 'Darraja Bikes' })` ne changent pas. Le nom latin
  reste visible au pied de page (logo complet et ©), dans le `<title>` de chaque page et sur les pages d'erreur 404 et 500, dont
  l'en-tête autonome n'a ni menu ni pied de page et garde le nom écrit. Ordinateur et téléphone sont désormais pareils (seule la
  hauteur du mot change). Conséquence assumée : en haut de page, sur ordinateur, un lecteur anglais ne voit plus le nom latin.
  Revenir en arrière = rendre au `<span>` de `SiteHeader.tsx` ses anciennes classes (`max-sm:sr-only text-xs font-medium
  uppercase tracking-[0.2em] text-muted`).
- **Thème** : les deux encres sont dans le DOM et le CSS n'affiche que la bonne (`.logo-on-light` / `.logo-on-dark`,
  `globals.css`). Le logo passe par les **deux portes** du thème, comme les couleurs : `data-theme` posé par le script,
  sinon la préférence du système. La variante `dark:` ne suit que `data-theme` : sans JavaScript, ou avant le script d'une
  page d'erreur, elle laisserait le logo noir sur le fond sombre. Ces règles sont hors couche et priment sur les
  utilitaires : ne jamais poser `hidden` ou `block` sur ces images.
- **Chargement** : en-tête en `eager` (les deux encres partent, 4 à 10 Ko chacune : la bascule de thème n'attend rien) ;
  pied de page en `lazy` — l'encre masquée n'est jamais téléchargée.
- **Fichiers** : `public/brand/{wordmark,lockup}-{black,white}-{largeur}-v1.webp` — mot seul en 120 × 50 et 240 × 100
  (4 à 10 Ko, même boîte dans les deux encres : rien ne bouge à la bascule de thème), logo complet en 400 et 600 px de large
  (noir 600 × 285, blanc 600 × 306 : la signature n'est pas à la même distance dans les deux dessins ; 18 à 44 Ko), en
  `srcset` en largeurs. Servis en `Cache-Control: public, max-age=31536000, immutable` (`next.config.ts`) : changer de logo =
  de nouveaux noms (`-v2`), jamais les anciens écrasés, et les dimensions de `SHAPES` mises à jour (celles du plus grand
  fichier de chaque encre).
- **Recette** (Pillow) : rogner à l'emprise visible (alpha > 6 — la toile porte un voile d'alpha 1 à 6) plus 4 px ;
  compléter la toile, transparente et centrée, jusqu'aux proportions **exactes** de la cible (sinon l'arrondi de la petite
  hauteur décale la place réservée : 1 % mesuré, test rouge) ; redimensionner en Lanczos **en alpha prémultiplié**
  (`RGBa`), sinon la couleur des pixels transparents bave sur les bords ; WebP qualité 90, `alpha_quality` 100, `method` 6
  (le sans-perte pèse 1,5 à 2,5 fois plus).
- **Tests** : `tests/e2e/brand-logo.spec.ts` (noir en clair, blanc en sombre, choix gardé au rechargement, préférence du
  système, sans JavaScript, encre masquée du pied de page jamais téléchargée, tailles, place réservée = proportions du
  fichier, huit fichiers en WebP immuable, nom latin de l'en-tête sans place à l'écran) ; `not-found.spec.ts` (logo dans les 404 et la 500, encre blanche en sombre).
- **Pas fait, à décider** : le `logo` de l'`Organization` en JSON-LD, une image Open Graph. Le favicon est fait : section
  « Favicon » ci-dessous (28 octobre 2026).
- **En production le 15 octobre 2026** (PR #75, `main` `510488b`, release `20261015160517`, retour arrière
  `20261014233318`), sur « Oui, fusionne et déploie » du fondateur : suite e2e complète 806/808 avant fusion (les 2 échecs
  sont le défaut de données connu api #76, les cibles tactiles du Vado SL 2 à 320 px, identiques sur `main`), purge
  (`compare:version` 35), contrôle de prod en lecture seule : **210 vérifications, 0 écart** (huit fichiers servis en WebP
  immuable ; les deux encres dans le HTML de neuf pages, `noindex` intact ; la bonne encre chargée en clair et en sombre,
  en arabe et en anglais, à 1280, 390 et 360 px ; tailles 32 / 20 / 176 px ; en-tête sur une ligne, aucun défilement en
  largeur ; bascule au clic ; 404 autonome en sombre ; aucune erreur de console).
- **En production le 16 octobre 2026** (PR #77, `main` `6e67384`, release `20261016140408`, retour arrière
  `20261015160517`), sur « Oui, mets en ligne » du fondateur — le nom latin n'est plus affiché dans l'en-tête (décision du
  16 octobre, plus haut) : CI verte, suite e2e complète 808/810 avant fusion (les 2 échecs sont le défaut de données connu
  api #76, les cibles tactiles du Vado SL 2 à 320 px, **rejoués à l'identique sur le code de `main`** : mêmes messages,
  « point 1 / point 2 : cible de 16.2 px »), purge (`compare:version` 36), contrôle de prod en lecture seule : **216
  vérifications conformes** (HTML de dix pages en arabe et en anglais : nom latin en `sr-only`, plus de petites capitales dans
  l'en-tête, deux encres, pied de page, titre, `noindex` ; navigateur en arabe et en anglais, clair et sombre, à 1280, 768,
  390 et 360 px : en-tête de 59 px sur une ligne, lien de la marque de 76,8 px dès 640 px et de 48 px en dessous, bonne
  encre, nom accessible du lien inchangé, aucun défilement en largeur, aucune erreur de console), plus la 404 racine lue dans
  un navigateur (nom latin écrit visible, bonne encre ; son seul message de console est celui de toute réponse 404).

## Favicon (décision du fondateur du 28 octobre 2026)

Jusqu'au 28 octobre 2026, le site servait le favicon de `create-next-app`, le triangle de Next.js, et Google l'affichait à côté de
ses résultats. Décision du fondateur, après plusieurs essais montrés en vraie taille dans des onglets clairs et sombres : **un vélo
de route classique, silhouette noire, sur une pastille jaune #FACB3B** aux coins arrondis. Ce jaune est celui du crayon du logo,
mesuré sur son dessin (médiane des pixels opaques du trait jaune).

- **Provenance et droits** : une image de 512 × 512 fournie par le fondateur le 28 octobre 2026, dessinée par lui avec ChatGPT
  **de zéro, à partir d'une description en mots, sans image de départ** (déclaré par lui le même jour) ; l'original est conservé
  hors dépôt. Une première version a été écartée : ChatGPT l'avait redessinée d'après la photo et le dessin de géométrie d'un vélo
  de marque, et sa silhouette gardait la forme de ce cadre (règle « Images » du `CLAUDE.md` racine ; et un site qui compare les
  marques ne prend pas pour symbole le vélo vedette de l'une d'elles). Le cadre classique à tubes ronds n'appartient à aucune marque.
- **Fichiers**, à la racine de `src/app` (convention de Next 16 : il écrit lui-même les balises `<link>` de chaque page, avec `type`
  et `sizes` lus dans le fichier et une empreinte dans l'adresse) :
  - `favicon.ico` : 16, 32 et 48 pixels ;
  - `icon.png` : 192 × 192, un multiple de 48 comme Google le demande pour l'icône des résultats de recherche ;
  - `apple-icon.png` : 180 × 180, **carré plein sans transparence** (RVB) — l'iPhone noircit la transparence et arrondit lui-même
    les coins.
- **Recette** (Pillow, depuis l'image de 512) : la pastille réduite en Lanczos **en alpha prémultiplié**. Pour 16, 32 et 48 pixels,
  le noir du vélo est d'abord élargi (filtre maximum de 7, 4 et 2 points de rayon, mesurés à 512) : simplement réduits, ses tubes
  fins pâlissaient jusqu'à presque disparaître (mesuré sur le 16 pixels : 8 points nettement foncés en réduction simple, 61 avec le
  trait élargi). Le dessin ne change pas, seule l'épaisseur du trait change aux petites tailles. `icon.png` est l'image réduite telle
  quelle ; `apple-icon.png` est l'image posée sur un carré du même jaune, puis réduite.
- **Ce qui ne change pas** : le logo, la règle « Images », `robots.txt` (ces adresses restent ouvertes : Google doit pouvoir lire le
  favicon). Google met à jour l'icône de ses résultats à son propre rythme, en quelques jours ou quelques semaines.
- **Tests** : `tests/e2e/favicon.spec.ts` — `favicon.ico` servi tel qu'il est dans le dépôt, en 16, 32 et 48 pixels, et plus le
  triangle de `create-next-app` ; sur l'accueil arabe et anglais, le catalogue et une fiche : un `favicon.ico`, un `icon.png` de
  192 × 192 et un `apple-touch-icon` de 180 × 180 déclarés, servis tels qu'ils sont dans le dépôt, le dernier sans transparence.
- **Changer d'icône** : ces trois fichiers, ce test et cette section, dans le même commit. Les adresses portent une empreinte posée
  par Next, donc aucun ancien fichier n'est servi après un changement ; les navigateurs, eux, gardent un favicon en cache.
- **En production le 28 octobre 2026** (PR #94, `main` `f8691f0`, arbre = tête testée `18db7ac`, release `20261028153054`, retour arrière
  `20261028082243`), sur « Oui, mets en ligne » du fondateur : CI verte ; suite e2e complète **916/918** avant fusion (les 2 échecs connus
  api #76, cibles tactiles du Vado SL 2 à 320 px, « cible de 16.2 px ») ; purge `ajala:revalidate-web --all` (`compare:version` 46) ;
  contrôle de prod en lecture seule, sans navigateur : **232 vérifications conformes, 0 écart** — les trois fichiers servis octet pour
  octet comme dans le dépôt, l'ico en 16, 32 et 48 pixels, plus de triangle, l'icône du téléphone en RVB ; onze pages en arabe et en
  anglais (accueil, catalogue, deux fiches, marque, catégorie, comparateur, confidentialité, bikefinder), pour un navigateur et pour un
  robot : 200, les trois balises exactes (48x48, 192x192, 180x180), leurs adresses servies, plus l'ancienne empreinte du favicon,
  `noimageindex` intact, aucun `X-Robots-Tag`. Le même contrôle relevait 120 écarts avant le déploiement. Google remplace l'icône de ses
  résultats à son propre rythme.

## Pilote des hotspots éditoriaux (web #49, étape 1) — décisions du fondateur du 10 octobre 2026

La vraie photo de la fiche, intacte, avec autour des notes « de connaisseur » à l'esprit dessiné à la main (direction
visuelle du 9 octobre, `../CLAUDE.md`). Spec : issue #49, réécrite le 10 octobre avec les décisions du fondateur.

**Aperçu retiré le 14 octobre 2026 (phase 4.1 de web #52, décision du fondateur).** Les cinq fiches publiques ont été comparées à leurs
aperçus ce jour-là. Le style est le même ; les points diffèrent : l'aperçu montrait l'amortisseur, la tige télescopique, les roues, le
porte-bagages et le phare, que le registre de l'API ne couvre pas (notés côté API, « restes de l'API »). Décision : « Oui, retire
l'aperçu ». Ont été supprimés :
- la route `/{locale}/preview/hotspots/{bike}` et son drapeau `BIKE_HOTSPOT_PREVIEW` ;
- `src/lib/hotspot-pilot.ts`, les notes saisies du pilote ;
- `AccentPicker` ;
- `playwright.hotspot-preview.config.ts` et `tests/preview` (le test pur de `bidi.ts` a rejoint `tests/e2e/bidi-runs.spec.ts`) ;
- `scripts/hotspot-pilot-captures.mjs`.

Restent, au service de la fiche publique : `BuildDetails`, `AnnotatedPhoto`, `bidi.ts`, `leader.ts` et `scene.ts`. Les puces
ci-dessous gardent l'historique du pilote ; celles qui décrivent le composant valent toujours. **En production le 14 octobre 2026**
(PR #63, `main` `0f92f27`, release `20261014145210`, accord du fondateur ; e2e complète 650/650 avant fusion) : le drapeau est retiré
du `.env` de production, et le contrôle en lecture seule trouve les cinq aperçus en 404 et les cinq fiches pilotes annotées, en arabe
et en anglais.

- **Aperçu derrière un drapeau** *(retiré le 14 octobre 2026)* : `/{locale}/preview/hotspots/{talon|anthem|madone|checkpoint|vado}` rendait 404 sans
  `BIKE_HOTSPOT_PREVIEW=1`, avant toute lecture de paramètre ou de l'API ; `noindex` ; jamais lié. **Décision du fondateur
  du 11 octobre 2026 : l'aperçu est en ligne** (drapeau dans le `.env` de production, liens non publiés) pour qu'il le voie
  sur son téléphone — elle lève, pour ces cinq pages seulement, la règle du 10 octobre « les valeurs saisies pour le pilote ne
  se déploient pas » ; retirer le drapeau referme l'aperçu (404) sans redéployer. *Jusqu'au 12 octobre 2026*, les fiches
  publiques ne passaient pas par là et ne chargeaient ni le code ni les styles du pilote. **Depuis web #52, la fiche publique
  porte les notes que l'API sert, par le même composant** : voir « Notes dessinées sur la fiche publique » ci-dessous.
- **`BuildDetails`** porte le corps de la fiche (partagé avec l'aperçu jusqu'au 14 octobre 2026). `annotated` (`{ imageId, photo }`)
  élargit la fiche à 1264 px pour laisser aux notes leurs marges (décision du fondateur du 12 octobre 2026). La composition
  est rendue par la page (`headAnnotation`) et passée en *slot* à `BikeGallery`, qui n'importe rien de `hotspots/` ; la clé
  n'est posée que si elle existe.
- **Données : `src/lib/hotspot-pilot.ts`** *(retiré le 14 octobre 2026)* — cinq vélos ; chaque point a `dot` (en % de la photo `detail`), `label` (en % de
  la scène, côté `left|right|top|bottom`), une ligne principale (marque + modèle + chiffre clé), le nom de la pièce et une note
  de connaisseur en EN et AR (explique, ne juge jamais), et ses **sources citées mot pour mot** (`equipment_specs`,
  `components[].description`, `sizes[].wheel_size`). Saisi ou servi se lit **à la source, jamais au point** (`isEntered`) :
  une valeur tirée d'un texte libre (`components`) a été saisie pour le pilote, c'est ce que Laravel devra servir ;
  `equipment_specs` et `sizes` sont servis normalisés (relecture du 10 octobre : un drapeau par point, posé sur les 34, ne
  distinguait plus rien). `pilotFor()` refuse toute autre photo ou identité : la fiche retombe alors sur la galerie ordinaire.
  Terminologie arabe de l'API (`الهيكل` = cadre, `الإطار` = pneu). Pièges : « Max brake rotor sizes » et « Max fork travel »
  (Trek) sont des compatibilités, jamais l'équipement monté.
- **Composant : `src/components/hotspots/AnnotatedPhoto.tsx`** — scène à proportions fixes (photo à 52 % de la largeur,
  marges de 24 %), points positionnés en % de la photo, traits SVG (Bézier déterministe, `leader.ts`, `vector-effect:
  non-scaling-stroke`), notes dans les marges. La ligne principale ne se coupe qu'au « · » et chaque morceau porte son
  soulignement `--hotspot-accent` (réglé dans `globals.css` depuis le 12 octobre 2026). Polices : Caveat (latin) + Aref
  Ruqaa (arabe), `fonts.ts`. Sous 900 px de conteneur : points seuls, une explication sous la photo
  (fermeture, Échap, retour du focus). **Cible tactile** (relecture du 10 octobre) : un disque de diamètre min(44 px, distance
  au point voisin le plus proche), calculée par le composant (`--reach`) — deux cibles ne se recouvrent jamais, un toucher va
  toujours au point le plus proche, jamais moins de 24 px (WCAG 2.5.8) à 320 px, ancres inchangées. **Panneau stable** :
  l'indication et toutes les explications partagent une cellule de grille, seule la choisie est visible (les autres `inert`) —
  la hauteur est celle de la plus longue à cette largeur, la sélection ne déplace rien ; un morceau plus long que la ligne
  s'y replie dans sa propre boîte. Masquer les notes rend le focus à la case. Fond clair et encre fixes dans les deux
  thèmes. **Conteneur des notes en `ltr`** :
  l'alignement contre le trait est physique ; seuls les textes portent `dir="rtl"`, et tout latin passe par `<bdi>`, découpé
  par `bidi.ts` : la ponctuation de phrase (`. , : ;`) reste à l'arabe, le signe d'un nom (`E500+`, `Go!`, `20"`) reste au
  nom, et une parenthèse n'entre dans le `<bdi>` qu'avec sa jumelle — sinon « Madone. » rend son point entre le nom et
  l'arabe, et « (aero) » ses deux parenthèses du même côté. **Décision du 13 octobre 2026 (lot Canyon) : un deux-points COLLÉ à la
  lettre ou au chiffre qui le suit fait partie du nom** (« Canyon Strive:ON », « Spectral:ONfly », « Canyon:ON HB0057 ») ; sans lui,
  l'arabe coupait le nom en trois `<bdi>` et l'affichait « ON:Canyon Strive ». Celui d'une phrase (suivi d'une espace ou d'arabe) reste
  à la phrase, avec le nombre qui le suit (« (Gravel): 700 ») ; assertion avant seulement, jamais de lookbehind (Safari avant 16.4).
  **Décision du 13 octobre 2026 (lots Giant, Canyon, Specialized) : le NOM d'une ligne principale, plus long que la marge de sa note
  (22 % de la scène), se replie aux espaces** (`.main > span:first-child > .segment`, `white-space: normal`) ; le cadre de la galerie
  (`overflow: hidden`) en coupait sinon la fin (« Advanced-Grade Composite front and rear » : +12 px à 960 px, 9 fiches en ligne
  touchées entre 960 et 1 024 px). Un nom qui tient reste sur une ligne ; le chiffre clé après « · » ne se replie jamais. Le test
  « 960, 1024 et 1440 » mesure désormais le TEXTE de chaque note (pas seulement sa boîte) et couvre trois fiches aux noms longs.
  **Décision du 13 octobre 2026 (lot Specialized) : le nombre qui OUVRE un nom latin peut être collé à ses lettres** (« 840Wh
  battery », « 900Wh Battery », « 3D-forged alloy »). Sans cela, « 840 » restait hors du `<bdi>` et l'arabe affichait « Wh
  battery840 » (19 lignes en ligne, toutes Specialized). Un nombre suivi d'arabe ou d'un signe (« 27.5×2.4 », « 500مم ») ne mène à
  aucune lettre latine et reste à l'arabe.
  Image en erreur : aucun point, une alerte. Photo jamais retournée.
- **`AccentPicker`** *(retiré le 14 octobre 2026)* : sélecteur de l'aperçu (jaune, noir en trait, teinte de la catégorie, couleur
  libre). **Couleur retenue par le fondateur le 11 octobre 2026 : le jaune** (`--tone-butter`), sur la planche des trois couleurs,
  réglée dans `globals.css` depuis le 12 octobre.
- **Tests** *(ceux de l'aperçu sont retirés le 14 octobre 2026)* : `tests/preview` couvrait les données saisies, le drapeau et les
  cinq aperçus ; la fiche publique a les siens (`tests/e2e/annotated-photo.spec.ts`, ci-dessous), et la découpe du latin de
  `bidi.ts` est gardée par `tests/e2e/bidi-runs.spec.ts`.
- **Captures** *(script retiré le 14 octobre 2026)* : les captures de photos de constructeur restent **obligatoirement hors du
  dépôt** (dépôt public).
- **Piège mesuré le 11 octobre** : la fiche publique déborde déjà en largeur, défaut de `main` hors du pilote. La liste des
  composants ne coupe pas un mot sans espace : à 320 px, `80mm(27.5")/100mm(29")` (Talon) suffit ; le Vado déborde dès
  390 px, à cause d'un lien Markdown brut de 64 caractères servi dans « Compliance Certification ». En émulation mobile et en
  arabe, ce débordement fait dériver les coordonnées des clics de Playwright. Corrigé par la PR #51, fusionnée et
  déployée le 11 octobre ; la donnée elle-même est signalée dans le scraper (#29) et l'API (#62).

Un serveur Next local se lance depuis l'outil PowerShell : depuis Bash, `Start-Process` laisse le serveur tenir la sortie de
Bash ouverte et la commande ne rend jamais la main.

La généralisation est décidée le 11 octobre 2026 (issue #52) : voir la section suivante.

## Notes dessinées sur la fiche publique (web #52) — décisions du 11 et du 12 octobre 2026

Le rendu du pilote devient celui de la photo de tête de **chaque fiche dont l'API sert les notes** : Python mesure la photo,
Laravel place les points et les notes et rédige les textes (api #51, `hotspot_image`), Next affiche. La mise en ligne se fait
marque par marque **côté API** (`ajala:hotspots:place --apply --brand=…`) : le site n'a rien à redéployer pour un nouveau lot.

**En production depuis le 13 octobre 2026 (lot 1, `main` `fd0ec2b`, release `20261013164325`).** Les cinq fiches du
pilote affichent leurs notes à 1264 px ; toutes les autres fiches n'ont pas changé (896 px, aucune clé `annotated` dans la
charge RSC). Preuves avant la fusion : suite e2e complète 494/494 (Next local contre l'API de production en lecture
seule). Preuves après : 91 contrôles HTTP (HTML brut et charge RSC) et 28 pages en navigateur (ordinateur et mobile, arabe
et anglais) sans écart de fond. Piège de contrôle : un script navigateur lancé contre le site compte des `requestfailed` sur
`…?_rsc=…` à la fermeture de la page ; ce sont des préchargements de liens annulés, pas des erreurs du site. **Phase 4.1 faite le
14 octobre 2026** : après la comparaison des cinq fiches avec leurs aperçus et sur l'accord du fondateur, la route d'aperçu, son
drapeau, les notes saisies, le sélecteur et les tests de l'aperçu sont retirés (section précédente).

- **Branchement** : la page de la fiche appelle `headAnnotation` (`src/components/hotspots/annotation.tsx`), qui rend
  `AnnotatedPhoto` — le composant de l'aperçu, qui ne lit plus que la forme de l'API. Pas de notes si l'API n'en sert pas
  (`hotspot_image` nul, ou absent d'une API antérieure à #52), si elles ne portent pas sur la photo de tête, si leur scène n'est
  pas `scene-v1` (`scene.ts`, partagé avec `MarginLayout` de l'API) ou sans aucun point : la fiche garde alors sa galerie, à
  896 px, sans clé `annotated` dans sa charge RSC. Avec des notes : 1264 px (décision du fondateur du 12 octobre).
- **Rien n'est calculé ici** : points, numéros (`n`, de 1 à N sans trou depuis api `HotspotLayout` 2.1.0), place et côté de
  chaque note, nom de la pièce (`main`), partie (`part`) et explication (`note`) viennent de l'API dans la langue de la page.
  Sans nom de pièce servi (`main` nul : Trek « Max brake rotor sizes »…), la partie prend la ligne manuscrite, sans seconde
  ligne. Les libellés accessibles de chaque point sont composés côté serveur par `headAnnotation` : le composant client ne
  compose aucun texte (règle de `BikeGallery`).
- **Accent** : `--hotspot-accent` est réglé à un seul endroit, `globals.css` (le jaune `--tone-butter`, décision du 11 octobre) ;
  la fiche publique n'a pas de sélecteur.
- **Polices** (`fonts.ts`) : `preload: false` — la fiche importe les polices manuscrites, annotée ou non ; préchargées, elles
  partiraient sur toutes les fiches, dans les deux alphabets, en concurrence avec la photo. Sans préchargement, une fiche sans
  notes n'en télécharge aucune, une fiche anglaise ne télécharge que Caveat, une fiche arabe dont les lignes ne sont que des
  noms latins aussi. **Le texte arabe d'une ligne manuscrite passe par `.handArabic`** (Aref Ruqaa d'abord) : relevé le
  12 octobre (et présent dans le pilote), le secours que Next ajoute à Caveat est Arial sans plage de caractères ; sur Windows,
  où Arial a des glyphes arabes, il prenait toute ligne arabe (« الفرامل » en Arial gras). `adjustFontFallback: false` ne le
  retire pas au build (Turbopack, constaté), d'où la `<span>` posée par le composant autour de l'arabe. En tête de sa
  pile, Caveat SEUL (`--font-hand-latin-face`, lu sur l'objet de police par `handLatinFace`, jamais écrit à la main) :
  chiffres, espaces et ponctuation d'un chiffre clé arabe (« 150 مم ») restent manuscrits comme les noms, les lettres
  arabes vont à Aref Ruqaa.
- **Cible tactile = disque découpé** (`.dot::before`, `clip-path: circle(50%)`, le bouton lui-même sans toucher) :
  relevé le 12 octobre sur le Vado à 320 px (cadre et moteur à 26,6 px), Chrome testait le toucher sur la boîte
  CARRÉE du bouton malgré `border-radius` — un toucher dans le disque du cadre, tombé dans le coin du carré du moteur,
  allait au moteur. Le point dessiné et son anneau de focus ne sont pas découpés.
- **Moteur et batterie** (9 points au plus sur un vélo électrique, api #51 `HotspotLayout` 2.2.0) : rien à faire ici,
  le composant affiche ce que l'API sert ; les tests portent sur le Vado (9 points).
- **Coût accepté** (mesuré le 12 octobre, build de production) : la route de la fiche charge le code et le style des notes même
  sans notes — environ 11 Ko compressés sur 209 Ko (CSS 2,8 Ko, JS 8,5 Ko). La relecture du 10 octobre l'interdisait quand
  aucune fiche publique n'en avait ; la plupart en auront (480 vélos sur 632 calculés sur la copie de la prod du 3 octobre).
  Next ne découpe pas le code d'un composant client importé par un composant serveur, et un import dynamique côté client
  risquait un flash sans style sur la photo de tête.
- **Aperçu** : retiré le 14 octobre 2026 (phase 4.1 de #52), après la comparaison des cinq fiches publiques avec leurs aperçus
  et sur l'accord du fondateur — route, drapeau, `hotspot-pilot.ts`, `AccentPicker`, `tests/preview` et sa config.
- **Contrat** : `src/types/api.ts` est régénéré depuis l'`openapi.json` d'api #51 (`hotspot_image`, `HotspotImageResource`).
  **Ordre de mise en ligne : l'API d'abord** — une fiche servie sans la clé n'a simplement pas de notes.
- **Tests** : `tests/e2e/annotated-photo.spec.ts` (16 tests, ordinateur et mobile), attentes lues dans l'API au moment du test.
  Candidates : les cinq fiches du pilote et un cadre nu exclu (`giant/propel-advanced-pro-ff`, jamais mesuré). Le premier test
  exige au moins une fiche annotée **et** une sans notes ; les autres exigent une fiche annotée. **L'API visée doit donc servir
  les notes des fiches du pilote** (api #51 déployée, `place --apply` passé sur elles) : contre une API qui n'en sert pas, la
  suite échoue, voulu. Couverture : la fiche suit l'API dans les deux sens (largeur, clé RSC, numéros), notes hors photo et
  sans chevauchement de 960 à 1440 px, ligne manuscrite = nom servi ou partie, panneau et hauteur stable à 320 et 390 px,
  toucher au point le plus proche, `<bdi>` et ordre d'un nom qui commence par un nombre en arabe, thème sombre, image bloquée,
  autre photo de la galerie, jaune sans sélecteur, alignement physique, polices téléchargées (contexte neuf par fiche : une page
  suivante dans le même onglet relit du cache les polices de la précédente).

Recette locale contre une copie de la prod (API de la PR #51 dans son worktree, base de travail `ajala_hotspots_dev`) :

```powershell
# API (worktree de la PR api #51) — les médias se lisent sur la prod, en lecture seule
$env:MEDIA_URL = 'https://api.darrajabikes.com/storage/media'; $env:DB_DATABASE = 'ajala_hotspots_dev'; $env:WEB_URL = ''
php artisan serve --host=127.0.0.1 --port=8051 --no-reload
# Site (ce dépôt)
$env:API_BASE_URL = 'http://127.0.0.1:8051/api'; npm run build
$env:REVALIDATE_SECRET = 'secret-local-de-test'
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3152
# Tests (mêmes API_BASE_URL et secret, PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3152')
npx playwright test tests/e2e/annotated-photo.spec.ts
```

## Vélos proches sur la fiche (web #35) — décision du 14 octobre 2026

Décision du fondateur du 2 octobre 2026 (issue #35) : afficher sur la fiche les vélos proches que l'API calcule depuis le
1er octobre (api #52, méthode `1-draft.2`, encore un brouillon tant que le jeu doré n'est pas calibré : le calibrage changera
l'ordre des cartes, pas leur affichage). Chantier lancé le 14 octobre, sur son choix « Vélos proches ».
**En production le 14 octobre 2026** (PR #58, `main` `ba9a8ec`, release `20261014083707`) : e2e complète 558/558 avant fusion,
contrôles de prod 106/106.

- **Où** : `<section id="similar">` en dernier bloc — après `#geometry` depuis le 14 octobre 2026 au soir (web #65 ; auparavant après
  `#components`) —, avant le pied de fraîcheur (`src/components/SimilarBikes.tsx`, Server
  Component, **zéro JavaScript** : les deux replis sont des `<details>` natifs). Titre `h2`, `method.title`, critères repliés sous
  « How we choose », `msrp_disclaimer` une seule fois ; 4 cartes, les suivantes sous « Show all (N) » (N = `total`, chiffres
  latins). Chaque carte est le `BikeCard` du catalogue en `h3` (prop `headingLevel`, défaut `h2` : `bidi.spec.ts` en dépend) ;
  SOUS la carte, hors de son lien : `reasons[].text` tels que servis (3 au plus, ordre servi, isolats FSI/PDI intacts), puis
  « Compare » vers `compare_path` tel quel (nom du vélo en `sr-only`). **Rien n'est calculé, trié ni filtré ici.**
- **Règle unique** `hasSimilar()` : le bloc ET son ancre `#similar` n'existent que si l'API sert au moins un vélo (un cadre nu
  exclu répond `total: 0` : ni titre, ni ancre).
- **Lecture** : `getSimilarBuilds` (`src/lib/api.ts`), lancée par la page en même temps que `getBuild`, hors de `resolve()` et de
  `generateMetadata` (SEO, JSON-LD, noindex inchangés). L'aperçu du pilote ne passe pas `similar` : il reste identique.
  **Inverse de `getBuild`** : 404, autre statut, panne réseau ou JSON illisible → `null` (hors 404, une ligne `[similar]` au
  journal du serveur) — la fiche ne tombe jamais à cause d'un bloc secondaire. **Tag `build:{marque}:{slug}` seul**, comme la
  fiche ; l'issue ajoutait `all`, mais aucune lecture ne porte ce tag (le webhook le traite par `revalidatePath`).
  `ajala:similar:rebuild --apply` invalide les fiches dont la liste change. **Limite connue** : une fiche rendue pendant une panne
  de l'endpoint reste en cache sans le bloc jusqu'à la prochaine invalidation de son tag (au plus 24 h).
- **Grille par largeur du BLOC** (requêtes de conteneur Tailwind : `@container`, `@xl:grid-cols-2`, `@5xl:grid-cols-4`) : la
  fiche fait 896 px, ou 1264 px avec des notes dessinées ; quatre cartes donnent 1, 2 ou 4 colonnes, jamais 3 + 1 (une grille
  calée sur l'écran, comme `RecentBikes`, aurait laissé une carte seule).
- **Barre d'ancres** : `flex-wrap gap-x-5 gap-y-2`. Avec le 4ᵉ lien, la fiche mesurait 336 px à 320 px en anglais (Talon 1,
  `reflow.spec.ts` rouge) ; la barre passe à la ligne, 24 px entre deux rangées (cible tactile minimale). Sur deux rangées elle
  mesure 57 px (Pixel 7, anglais) : **les quatre sections passent à `scroll-mt-16`** (64 px) — à 48 px, le saut cachait leur titre
  sous la barre collante.
- **Textes arabes validés par le fondateur à la mise en ligne (14 octobre 2026)** : « دراجات مشابهة » (titre et ancre), « كيف نختار »,
  « عرض الكل ({n}) », « قارن ».
- **Tests** : `api-query.spec.ts` (6 cas : adresse, tag, 404 silencieux, 503, 422, panne réseau, JSON illisible) ;
  `similar-bikes.spec.tsx` (composant seul, oracle des libellés en toutes lettres : 0 vélo → rien, 4 + « Show all (6) », raisons,
  liens, `<bdi>`, aucun lien dans un lien, `h2`/`h3`) ; `similar.spec.ts` (pages réelles, attentes lues dans l'API : la Madone
  SL 6 Gen 8 — 10 proches le 14 octobre — et le cadre nu `giant/propel-advanced-pro-ff` à `total: 0` ; ordre, « Show all (N) »,
  comparaison ouverte, chaque ancre de la barre pose son titre sous la barre, aucun défilement en largeur, rangées pleines,
  arabe). `build-page.spec.ts` : titre, prix et millésime lus dans l'en-tête de la fiche (`main > header`), les cartes en
  affichent aussi ; le contrôle « aucun zéro » ne cherche plus la sous-chaîne « 0.00 », qui attrapait « 7,000.00 US$ » d'une
  carte, mais un montant nul isolé.
- **Relevé à porter à la calibration (API, pas ce dépôt)** : la raison « Same category: … » est servie sur chaque carte.

## Équipements sur la fiche (web #36) — décision du 14 octobre 2026

Choix du fondateur du 14 octobre 2026, après la mise en ligne des vélos proches : afficher `equipment_specs`, que l'API sert dans la
réponse de la fiche depuis le 1er octobre — des valeurs **publiées par le constructeur, avec leur preuve et leur date**. Aucun nouvel
appel : la donnée arrive avec `getBuild()`. Contrat vérifié ce jour : types régénérés depuis l'API `main` = 0 différence.
**En production le 14 octobre 2026** (PR #59, `main` `2cfd47c`, release `20261014093858`) : e2e complète 622/622 avant fusion, contrôles
de prod 548/548 ; le fondateur garde affichées, comme l'API les sert, les 4 fiches Trek à une seule valeur (Marlin 4 à 7 Gen 3).

- **Où** : `<section id="equipment">`, **premier bloc sous la barre depuis le 14 octobre 2026** (web #65 ; auparavant entre `#geometry` et
  `#components`) (`src/components/EquipmentSpecs.tsx`, Server Component, **zéro JavaScript**). `ComponentList` suit, inchangé : le premier
  bloc donne les valeurs normalisées, le second la liste brute.
- **Règle unique** `hasEquipment()` : le bloc ET son ancre `#equipment` n'existent que pour une publication `current` avec au moins une
  valeur (`stale`, `unavailable` ou 0 valeur : ni titre, ni ancre).
- **En tête** : `coverage.label`, « Checked: {date} » (`checked_at_formatted`, qui dit lui-même « date non renseignée » quand il le faut),
  lien « Manufacturer page » vers `source_url` (`target="_blank"`, `rel="nofollow noopener noreferrer"`), et la condition commune
  (`shared_conditions_formatted`, Canyon « taille M ») une seule fois — alors jamais par ligne.
- **Liste** : `<dl>` dans l'ordre servi — depuis web #65 en **deux colonnes** (`md:grid-cols-2`, une seule sous `md`), chaque ligne avec
  son libellé au début et sa valeur à la fin ; `data-new-role` est posé quand `role` change (pure mise en page, la donnée arrive groupée
  par rôle ; le filet visuel a disparu avec les deux colonnes). Valeur en `<bdi>`, `precision_label` après « · », `conditions_formatted`
  en petit, badge `status_label` pour `ambiguous` / `conflict` — les candidats restent ceux de `value_formatted`, le site n'en choisit
  aucun.
- **Preuves** repliées sous « Source text » (`<details>` natif) : extrait entre guillemets, en `<bdi>` (texte brut, échappé par React, jamais
  `dangerouslySetInnerHTML`), **puis l'unité d'origine** (décision du jour, hors issue : le poids Canyon a pour preuve « 15.74 » en `lbs` ;
  sans l'unité, « 7.14 kg » à côté de « 15.74 » passerait pour une erreur — la valeur brute reste visible à côté de la normalisée), la
  catégorie d'origine et la date d'observation, chacune seulement si non nulle.
- **Relevé de la prod (540 fiches)** : blocs sur Specialized 149, Scott 80, Giant 69, Canyon 57 — et **Trek 4** : l'API sert `current` sur
  ses 165 fiches mais une seule valeur sur 4 d'entre elles (« Maximum fork travel », ambigu, une compatibilité libellée comme telle). Aucun
  filtre par marque ici ; masquer Trek serait une décision d'API (`unavailable`). L'aperçu du pilote (même `BuildDetails`, même `build`)
  montre aussi le bloc.
- **Textes arabes validés tels quels par le fondateur (14 octobre 2026)** : « التجهيزات » (titre et ancre), « تاريخ التحقق: {date} », « صفحة الشركة المصنّعة »,
  « القيم المنشورة لـ: {…} », « نص المصدر ».
- **Barre d'ancres** : depuis web #65, une seule ligne qui défile en largeur dans sa boîte à 320 px, sous les 64 px de `scroll-mt-16`
  (voir « Structure de la fiche vélo ») ; testé.
- **Tests** : `equipment-specs.spec.tsx` (composant seul, oracle des libellés : rien hors `current`, en-tête, condition commune, ordre,
  filets, badges, preuves et unité, « < » et « & » en texte, `<bdi>`) ; `equipment.spec.ts` (pages réelles, attentes lues dans l'API :
  `canyon/aeroad-cfr-axs`, `specialized/aethos-2-expert-shimano-ultegra-di2`, `specialized/chisel-hardtail` (ambigu), `giant/cypress-2`
  (conflit), `trek/madone-sl-6-gen-8` (aucune valeur), `scott/scale-920` (« & ») ; aucun défilement ; ancres à 320 px ; arabe).

## Structure de la fiche vélo (web #65) — décision du 14 octobre 2026

Décision du fondateur du 14 octobre 2026, validée sur une maquette arabe de la fiche du Giant Talon 1, d'après son propre croquis
(« la fiche éditoriale ») : le bas de la fiche se lit **du résumé vérifié au détail**, **dans la colonne centrale** — 896 px, 1264 px
avec la photo annotée, **jamais la pleine largeur** (une proposition pleine largeur a été refusée le même soir).
**En production le 14 octobre 2026 au soir** : PR #67 (`main` `f02182a`, release `20261014175535`, e2e complète 676/676 avant fusion), puis
PR #68 (`main` `20be075`, release `20261014184508`, correctif du bloc courant, e2e 684/684). Contrôles de production en lecture seule :
HTTP 200 contrôles sur 20 pages des cinq marques (ordre des sections, ancres, ni specs clés ni silhouette, `noindex`), navigateur 12 pages
à 390 et 1280 px (largeur, barre sous la galerie, barre collée, bloc courant) sans écart après #68.

- **Ordre** (`src/components/BuildDetails.tsx`) : photo annotée, inchangée → barre d'ancres → `#equipment` → `#components` →
  `#geometry` → `#similar` → fraîcheur. Les `id` et `scroll-mt-16` des sections ne changent pas.
- **Barre d'ancres** (`src/components/SectionNav.tsx`, Client Component — le seul JavaScript de la décision) : **sous la photo**,
  collante (`sticky top-0`), **seulement des ancres** — `equipment.spec.ts` et `similar.spec.ts` parcourent `main nav a` et attendent un
  `h2` sous chaque cible ; un lien « Comparer » y casserait les tests, à décider plus tard. **Le bloc courant** (`aria-current="true"`)
  est le dernier dont la section commence au-dessus de la ligne de lecture (66 px, juste sous la barre : là où `scroll-mt-16` pose un
  titre après un saut d'ancre), et le dernier bloc quand la page est au bout — sauf si un bloc vient d'être posé sous la barre. Un
  clic sur la barre **épingle** le bloc choisi jusqu'au prochain geste de lecture (molette, toucher, clavier) : le dernier bloc d'une
  page courte ne monte pas toujours jusqu'à la barre. Relevé par le contrôle de production du 14 octobre 2026, sur le Scale 600 (une
  taille, géométrie courte, vélos proches plus hauts qu'elle) : la première règle, « le bloc le plus visible », soulignait le bloc
  SUIVANT dès que l'écran faisait 900 px de haut — le projet desktop des tests n'en fait que 720, d'où des tests à hauteur fixée.
  Sans JavaScript, de simples liens. **Une seule ligne**, qui défile en largeur dans sa propre boîte à 320 px : la
  page ne s'élargit pas (règle du 11 octobre), et la barre reste sous les 64 px de `scroll-mt-16` — deux rangées de `text-sm` les
  dépasseraient. Défilement doux : `html { scroll-behavior: smooth }` sous `prefers-reduced-motion: no-preference` (`globals.css`).
- **Retirés** : le bloc « Specs clés » (`#highlights` ; `build.highlights` n'est plus rendu, il répétait les notes de la photo et les
  équipements) et la silhouette Specialized servie dans `geometry_chart` (205 fiches : une image grise sans aucune cote, dont 8
  « image coming soon » ; décision du 13 septembre 2026, silhouettes et placeholders exclus ; le champ reste dans le contrat, pour le
  document officiel de web #30).
- **Titres** : `SECTION_TITLE` (`text-2xl font-bold tracking-tight`) pour les quatre blocs, `EquipmentSpecs` et `SimilarBikes` compris.
- **Équipements en deux colonnes** : voir « Équipements sur la fiche » ; balisage interne et attributs `data-equipment-*` inchangés.
- **Aucun changement d'API, aucun nouveau texte** : les libellés de la barre sont les titres des blocs (`equipmentTitle`, `similarTitle`,
  `COPY.components`, `COPY.geometry`).
- **Tests** : `build-structure.spec.ts` — `giant/talon-1` (annotée, équipements, vélo proche), `trek/fuel-mx-9-8-xt-gen-7` (aucune
  valeur d'équipement : ni bloc ni ancre, premier bloc Composants), `scott/scale-600` (non annotée, 896 px), `specialized/allez-elite`
  (plus d'image sous la géométrie), barre collée et bloc courant, deux colonnes à 1280 px et une à 390 px, 320 px sans défilement ;
  `gallery.spec.ts` (absence d'image sous la géométrie sur Specialized et Trek).
- **Étape 2 : web #66** — la géométrie complète, section suivante.

## Géométrie sur la fiche (web #66) — décision du 14 octobre 2026

Étape 2 de la structure du 14 octobre 2026 ; elle réalise web #29 sous la forme décidée ce jour (le point 5 de #29, « image
constructeur repliée », était caduc depuis le 13 septembre). **Aucun changement d'API, aucun nouveau texte** : le dessin et les
repères par taille sont ceux d'api #40, le glossaire celui d'api #41, les libellés ceux du comparateur.
**En production le 14 octobre 2026 au soir** (PR #70, `main` `ce60764`, release `20261014202407`) : suite e2e complète 734/734 puis
733/734 sur le build final (le seul échec mesurait une ancre pendant le défilement doux ; tests d'ancres stabilisés par
`tests/e2e/helpers/scroll.ts`), contrôles de production en lecture seule : HTTP sur 20 pages des cinq marques (tableau, lignes
`data-row`, colonne choisie, bascule, dessin présent ou absent selon la fiche, valeur douteuse sur l'Enduro Comp, plus de lettre
A, B, C, `noindex`), navigateur à 390 et 1280 px (largeur, dessin à gauche en arabe ou au-dessus, survol → repère, « ? » →
explication, taille → colonne et dessin).

- **Où** : `section#geometry`, `src/components/GeometryMatrix.tsx` (Client Component ; `SizePicker` et `GeometryTable` sont
  supprimés). Boutons de taille comme avant (`button[aria-pressed]` + `<span>` du libellé, césure : `reflow.spec.ts`) ; la
  première taille est choisie par défaut (aucune règle métier côté front).
- **Le dessin de la taille choisie à GAUCHE, le tableau de TOUTES les tailles à droite** — `flex flex-wrap rtl:flex-row-reverse` :
  à gauche en arabe comme en anglais (un cadre n'est jamais retourné en miroir, `dir="ltr"` reste posé sur le dessin seul dans
  `GeometryFigure`), au-dessus du tableau quand la ligne se replie (téléphone, fiche non annotée à 896 px). Le dessin est
  `GeometryFigure` tel quel, nourri par `singleBikeFigure()` (`src/lib/geometry-matrix.ts`), qui met `sizes[].figure` dans la
  forme du comparateur — un changement de forme, aucun point recalculé. Non dessinable : le message `nothingToDraw` du
  comparateur, aucun SVG, le tableau reste.
- **Tableau** (`matrixRows()`, `headRows()`) : lignes de tête `wheel_size` / `rider_height` / `rider_inseam` seulement si une
  taille les porte (Trek et Canyon publient la taille du cycliste, Trek seul l'entrejambe) ; puis les cotes, **dans l'ordre source
  de la première taille**, suivies des clés que seules d'autres tailles portent (Canyon `rim_height`, Scott
  `maximum_seatpost_insertion`) ; cellule absente = `dash` ; cellules en `<bdi>` ; colonne de la taille choisie `data-selected`
  et `bg-surface` ; première colonne collante (`sticky start-0`) dans une boîte `overflow-x-auto` ; chaque ligne porte
  `data-row="{clé}"`. L'ordre du registre reste servi par le comparateur seul — à servir un jour par l'API si on le veut ici.
- **Bascule** « Value » / « As published » (`COPY.value` / `COPY.source` de `BuildDetails`, deux `button[aria-pressed]`) : la
  valeur normalisée par Laravel, ou la valeur telle que publiée avec son unité d'origine (Trek : « 42.6 cm » sous « 426 mm »).
  **Une anomalie n'est jamais normalisée** : la cellule montre la valeur publiée avec le libellé `doubtful` (Specialized Enduro
  Comp 2025, angle de direction publié en millimètres sur ses 4 tailles).
- **Surlignage** : survol, focus ou clic d'une ligne pose `activeMark` sur le dessin (`[data-mark="{clé}"]` sur le repère),
  seulement pour une cote que le dessin de la taille choisie sait repérer ; un clic maintient, Échap efface — les gestes du
  comparateur. Le repère positionnel A, B, C de l'ancien tableau a disparu : il ne renvoyait à aucun dessin.
- **Glossaire** : un bouton « ? » (`aria-expanded`) par cote connue du glossaire ouvre `GeometryGlossaryPanel` sous la ligne
  (`src/components/GeometryGlossaryPanel.tsx`, extrait de `GeometryBlock` et partagé avec le comparateur, dont le rendu ne
  change pas). La page lit le glossaire en parallèle de la fiche (`glossaryFor()`, `page.tsx`) dans un `try` : une panne donne
  `null` et une fiche sans « ? », jamais une fiche en erreur — même doctrine que les vélos proches.
- **Libellés partagés** : `src/lib/geometry-copy.ts` (`GEOMETRY_COPY`), déplacés tels quels depuis la page de comparaison ; le
  titre du dessin sur la fiche est celui du bloc (« Geometry » / « الهندسة »).
- **Légende du dessin** : le nom se coupe (`max-w-full`, `wrap-break-word`) — Scott nomme une taille de 48 caractères sans
  espace, qui élargissait le Gambler 10 à 377 px sur 320 (règle du 11 octobre).
- **Tests** : `geometry-matrix.spec.tsx` (composant seul : pivot, anomalie, mode publié, lignes de tête, adaptateur, rendu,
  « ? », non dessinable, arabe) ; `geometry-matrix.spec.ts` (pages réelles, attentes lues dans l'API : `giant/talon-1`,
  `trek/fuel-mx-9-8-xt-gen-7`, `trek/checkpoint-alr-5-gen-3`, `scott/scale-925`, `scott/scale-600`, `specialized/enduro-comp`,
  dessin à gauche en arabe à 1280 px et au-dessus à 390 px) ; `build-page.spec.ts` adapté (la colonne choisie, la bascule) ;
  `geometry-figure.spec.tsx`, `compare.spec.ts` inchangés et verts. Pièges rencontrés : un composant rendu dans un spec `.tsx`
  porte le pragma `@jsxImportSource react` ; React écrit `29&quot;` dans le HTML statique.

## Comparateur — l'exemple de la page nue (décision du 16 octobre 2026)

Demande du fondateur du 16 octobre 2026 : « Comparer » ne s'ouvre plus sur un tableau vide (une phrase et une case « Ajouter
un vélo ») mais sur une vraie comparaison de deux vélos, qui montre d'emblée ce que fait le comparateur, dessin de géométrie compris.

- **La paire** (`src/lib/compare-example.ts`, `EXAMPLE_COMPARISON`) : **Trek Marlin 6 Gen 3 et Giant Talon 1, en taille M** — choix
  éditorial du fondateur parmi trois paires vérifiées le jour même contre l'API (même catégorie, même prix constructeur, dessin affiché
  en M) : deux semi-rigides cross-country à 999,99 $ et 1 000 $ US (prix constructeur), millésime 2027, roues de 29" en taille M
  (le `wheel_size` de la carte du catalogue, 27,5", n'est pas celui de la taille M). Écartées : Trek Marlin 7 Gen 3 / Scott Scale 970
  (1 399,99 $ chacun) et Trek Fuel EX 8 Gen 7 / Canyon Spectral CF 7 (3 999,99 $ et 3 999 $). La taille est posée pour les deux
  vélos et affichée dans leurs sélecteurs : sans taille, l'API ne sert pas la géométrie (`requires_sizes`, `figure` nul), donc pas de
  dessin ; jamais de comparaison silencieuse entre tailles. Ce n'est pas une règle métier : une paire choisie automatiquement (la plus
  comparée, par pays…) vivrait dans Laravel.
- **Quand** (`exampleSelection()`) : seulement sur la page nue — aucun `bikes` dans l'adresse ; un lien de campagne (`utm_*`) reste la
  page nue. Une sélection dans l'adresse l'emporte toujours, même vide : `?bikes=` donne le tableau vide d'avant. Si le catalogue ne
  sert plus l'un des deux vélos, ou si l'API refuse ou tombe sur la comparaison, la page nue redevient le tableau vide d'avant —
  jamais une erreur.
- **Étiquette** : « Example » / « مثال » (pastille `bg-tone-butter`, encre `text-tone-ink` : le jaune du logo), devant l'intro qui reste
  affichée — personne ne doit y lire sa propre sélection. Seul texte nouveau ; « مثال » validé par le fondateur sur la planche du
  16 octobre 2026 (« Oui, mets en ligne »).
- **Gestes** : le sélecteur complète la sélection de l'ADRESSE, jamais l'exemple — depuis la page nue, choisir un vélo démarre sa propre
  comparaison (deux choix pour comparer deux vélos, comme avant ; il en aurait fallu quatre). « Remove » sur un vélo de l'exemple garde
  l'autre (`?bikes=giant/talon-1&sizes=M`) ; changer une taille ou « Differences only » fixe la paire dans l'adresse : ce n'est plus un
  exemple. L'état vit toujours dans l'URL (règle 4) : la page nue a un contenu fixe et son adresse ne change pas.
- **SEO** : rien ne change — même canonical (`/{locale}/compare`), page nue toujours indexable comme cible, `noindex` verrouillé ; son
  contenu est désormais réel et stable. À revoir avec la liste blanche `/compare/{a}-vs-{b}` le jour où elle existera.
- **Tests** : `compare-example.spec.ts` — la règle seule (page nue, campagne, sélection même vide, vélo sorti du catalogue), le garde-fou
  (l'API sert les deux vélos et leur géométrie en M : si un vélo disparaît, le site retombe sans bruit sur la page vide, ce test le dit),
  les pages réelles en arabe et en anglais (étiquette, deux colonnes, M sur les deux cartes, dessin), choisir un vélo depuis l'exemple,
  retirer un vélo de l'exemple, même paire choisie dans l'adresse, `?bikes=` vide. `compare.spec.ts` inchangé et vert (« choisir deux
  vélos par le sélecteur » part de la page nue) ; `reflow.spec.ts` couvre la page nue avec l'exemple à 320 et 390 px. Changer de paire =
  `compare-example.ts`, ce spec et cette section, dans le même commit.
- **En production le 16 octobre 2026** (PR #79, `main` `c3b365b`, release `20261016155820`, retour arrière `20261016140408`), sur
  « Oui, mets en ligne » du fondateur, qui a validé « مثال » sur la planche : CI verte ; suite e2e complète 827/830 avant fusion (les 2
  échecs connus api #76, cibles tactiles du Vado SL 2 à 320 px, et `annotated-photo.spec.ts` « polices manuscrites » sur ordinateur,
  vert 3 fois sur 3 au rejeu : test instable, sans lien avec la page) ; purge (`compare:version` 37) ; contrôle de prod en lecture seule :
  **52 vérifications conformes** (HTML en arabe et en anglais : étiquette, les deux vélos, `noindex`, canonical inchangé, `?bikes=` vide
  et paire choisie sans étiquette ; navigateur à 1280, 390 et 320 px : étiquette, deux colonnes, M sur les deux cartes, dessin de
  géométrie, aucun défilement en largeur, aucune erreur de console ; choisir un vélo depuis l'exemple démarre sa propre comparaison).

## Comparateur — les adresses se composent au clic, jamais dans le code de la page (décision du 28 octobre 2026)

Relevé du 28 octobre 2026 (Search Console, cinq jours après l'ouverture à Google) : **142 000 requêtes de Googlebot en cinq jours**,
68 % en `?_rsc=` (la charge interne de Next) et 31 % en HTML ; dans les exemples des deux familles, huit requêtes sur dix visaient des
comparaisons libres à trois vélos (`/compare?bikes=a,b,c`, `&diff=1`) — des pages `noindex, follow` que personne ne lie. Cause mesurée
sur une comparaison à deux vélos en production : son code embarquait **539 adresses à trois vélos** (le sélecteur « ajouter un vélo »
recevait du serveur une adresse toute faite par vélo du catalogue, sérialisée dans les données de Next même si l'écran ne montre que
des boutons) et 32 adresses de taille, pour 3 vrais liens. Google lit ces adresses comme des liens et les visite une à une ; chaque
page à trois vélos en porte d'autres. Décision du fondateur (« Oui, prépare la PR ») : fermer le piège à la racine, sans toucher à la
politique robots ni à la décision du 16 octobre.

- **Règle** : le code d'une page de comparaison ne contient aucune adresse de comparaison hors de ses vrais liens (« Remove »,
  « Differences only » / « All rows », le canonical). Le sélecteur (`ComparePicker`), le menu de taille de la carte (`SizeSelect`) et
  celui de la planche (`GeometryBlock`) reçoivent la **sélection** (`CompareSelection` : vélos `marque/slug`, tailles alignées, filtre)
  et des noms ; l'adresse se compose **au clic** par `compareHref()` (`src/lib/compare-url.ts`, avec `withBike`, `withSize`,
  `withoutColumn`, `toggleDiff`), une fonction pure partagée par le serveur et le navigateur — une seule construction, les mêmes
  adresses qu'avant (`URLSearchParams`), et l'état vit toujours dans l'URL (règle 4). La page distingue la sélection de l'**adresse**
  (que le sélecteur complète, jamais l'exemple) de la sélection **affichée** (l'exemple ou l'adresse : tailles, retrait et filtre).
- **Inchangé** : `noindex, follow, noimageindex` sur toute comparaison avec sélection, canonical vers la page nue, aucun `Disallow`
  sur le comparateur dans `robots.txt` (décision du 16 octobre 2026 : Google ne lit pas le `noindex` d'une adresse interdite). Le
  bruit `?_rsc=` (préchargement des liens par Next pendant le rendu de Google) n'est pas traité : à remesurer deux semaines après la
  mise en ligne, dans les statistiques d'exploration de Search Console.
- **Garde** : `compare.spec.ts`, « le code d'une comparaison ne contient aucune adresse de comparaison hors de ses vrais liens » — lit
  le HTML servi, ramène `&amp;` et la forme échappée de « & » des données de Next à une seule graphie, et exige que toute adresse
  `/compare?` du code soit un `<a href>` de la page. Rouge sur le code d'avant (547 adresses de trop sur Farley 5 / Farley 7), vert
  après. Les fonctions pures ont leurs cas littéraux dans le même spec (adresses identiques à celles d'avant, tailles alignées).
- **En production le 28 octobre 2026** (PR #92, `main` `fc2f9f8`, arbre = tête testée `1f24482`, release `20261028082243`, retour arrière
  `20261027134848`), sur « tu peux merger, mettre en ligne » du fondateur : CI verte ; suite e2e complète **906/908** avant fusion (les 2 échecs
  connus api #76, cibles tactiles du Vado SL 2 à 320 px, « cible de 16.2 px ») ; purge `ajala:revalidate-web --all` ; contrôle de prod en lecture
  seule, sans navigateur : **67 vérifications conformes, 0 écart** (comparaisons à un, deux et trois vélos, avec tailles et filtre, en arabe et en anglais : aucune adresse
  hors des vrais liens, `noindex, follow, noimageindex`, canonical ; page nue avec l'exemple ; accueil, une fiche et le sitemap inchangés).
  **À remesurer vers le 11 novembre 2026** dans Search Console (Paramètres → Statistiques sur l'exploration) : part des comparaisons dans les
  exemples HTML, volume `?_rsc=`.

## Mesure d'audience — Google Analytics 4 (décision du 16 octobre 2026)

Décision du fondateur du 16 octobre 2026 : mesurer l'audience avant et après la levée du noindex du 21 octobre (`../CLAUDE.md`,
« Indexation »). Il a créé lui-même le compte « Darraja Bikes », la propriété **darrajabikes.com** (fuseau Arabie saoudite, devise SAR) et
son flux Web (mesures améliorées activées : pages vues, y compris les navigations de l'application par l'historique du navigateur,
défilement, clics sortants vers les marques). **ID de mesure `G-PNW83E7CDS`** — public, il figure dans chaque page.

- **Où** : `src/lib/analytics.ts` (`GA_MEASUREMENT_ID`, `GA_HOSTNAME`, `analyticsBootstrap()`) et `src/components/AnalyticsScript.tsx`, un
  script en ligne rendu par le serveur dans le `<head>` du layout, comme `ThemeScript` : la file `dataLayer`, `js`, `config` (qui envoie la
  page vue) puis le chargeur gtag.js en asynchrone — rien ne bloque l'affichage. Pas de dépendance nouvelle, pas de `next/script`.
- **Seulement sur l'hôte de production** : le script s'arrête avant toute file de mesure si `location.hostname` n'est pas
  `darrajabikes.com` — jamais en local, jamais pendant la suite e2e (des centaines de visites qui fausseraient les chiffres), jamais sur un
  autre hôte. **Aucune variable d'environnement** : rien à configurer sur le serveur, un build local ne peut pas mesurer par erreur. `www`
  est redirigé vers l'apex par nginx avant toute page.
- **Contrôles de production** : tout script navigateur lancé contre darrajabikes.com (contrôles après déploiement) doit bloquer
  `googletagmanager.com` et `google-analytics.com` (`page.route` → abort), sinon il compte des visites dans les statistiques du fondateur.
- **Non mesuré** : les deux documents d'erreur autonomes (404 racine, 500) n'ont pas la balise.
- **Consentement** : pas de bandeau pour l'instant (choix du fondateur du 16 octobre 2026) ; la page « Confidentialité » de la levée du
  noindex doit dire que le site dépose les cookies d'Analytics ; le bandeau reste une décision à prendre (obligatoire pour les visiteurs
  européens).
- **Tests** : `tests/e2e/analytics.spec.ts` — l'ID et l'hôte de la propriété ; chaque page arabe et anglaise porte la balise dans son HTML
  serveur et, sur l'hôte de test, ne contacte jamais Google ni ne crée de `dataLayer` ; le même code exécuté avec l'hôte du test et un
  chargeur simulé (`page.route`) demande `gtag/js?id=…` avec le bon ID et pose `js` puis `config` ; un autre hôte ne charge rien. Changer
  de propriété = `analytics.ts`, ce test et cette section, dans le même commit.
- **En production le 16 octobre 2026** (PR #81, `main` `10d02e3`, release `20261016165547`, retour arrière `20261016155820`), sur
  « Oui, mets en ligne » du fondateur : CI verte ; suite e2e complète 838/840 avant fusion (les 2 échecs connus api #76, cibles tactiles du
  Vado SL 2 à 320 px) ; purge (`compare:version` 38) ; la balise est dans le `<head>` de cinq pages servies (arabe et anglais, accueil,
  catalogue, comparateur, fiche). **Preuve dans Analytics** : un navigateur neuf charge `gtag.js?id=G-PNW83E7CDS` et envoie la page vue de
  `/ar-sa/bikes` puis, au clic sur « قارن » (navigation de l'application, sans rechargement), celle de `/ar-sa/compare` — réponses 204 ; le
  rapport « temps réel » de la propriété les affiche avec leurs titres arabes. Relevé à garder : dans le Chrome du fondateur, un envoi a
  reçu un 503 et une navigation interne n'a rien envoyé (une extension qui filtre Google, très probablement) — ses propres visites ne sont
  donc comptées qu'en partie, ce qui ne touche pas les visiteurs.

## Accueil — deux vrais vélos face à face (décision du fondateur du 21 octobre 2026)

Demande du fondateur du 21 octobre 2026, d'après le hero de 99 Spokes : sous les deux boutons de l'accueil, **deux vélos nez à
nez et deux flèches de comparaison** — dire « ici on compare » avant toute lecture, et donner une identité au site.

- **De vraies photos, pas des dessins** : trois paires dessinées en code (encre et crayon, géométrie médiane du catalogue) lui
  ont été montrées ; refusées (« je veux deux vélos réels »). Il voulait aussi des vélos « sans la marque » : une photo de marque
  ne se retouche pas (règle « Images » du `CLAUDE.md` racine), les photos sont donc **choisies, sans retouche**, parmi les
  1 099 photos des 116 vélos de route en ligne ce jour-là, pour leur logo ton sur ton, illisible à cette taille.
- **La paire affichée : la blanche**, Trek Madone SL 5 Gen 8 (média 3608) face à Trek Madone SL 7 Gen 8 (média 3363), la même dans les
  deux thèmes — choisie par lui sur les planches claire et sombre de trois paires de même couleur (« la meilleure dans les deux
  thèmes ») ; restent prêtes la noire (Madone SL 5 Gen 8 3598 / Canyon Endurace CF 7 5535) et la grise (Scott Foil RC Ultimate
  5713 / Addict RC Team 5718). Une paire qui changerait toute seule (évoqué : toutes les 3 à 5 semaines) serait une règle : elle
  vivrait dans Laravel. Changer de paire affichée = `ACTIVE_HERO_PAIR` (`src/lib/home-hero.ts`).
- **EXCEPTION à « image non modifiée », décidée par le fondateur pour l'accueil seulement** : aucune galerie ne publie la vue du
  côté gauche, la photo de DROITE est donc **affichée en miroir** (`-scale-x-100` sur son cadre ; le fichier servi par l'API reste
  intact). Il avait le choix entre « côte à côte, photos intactes » (recommandé) et « face à face » : il a choisi face à face.
  Effet connu : une inscription de la photo retournée se lit à l'envers (la jante « Aeolus » de la Madone SL 7). **La page
  « Droits des images » dit cette exception** depuis le 22 octobre 2026 (section « Pages légales »).
- **Crédit — retiré de l'accueil le 21 octobre 2026 au soir (décision du fondateur)** : la ligne « © Trek Bicycle Corporation » sous
  la paire (crédit de l'API, mis en ligne avec #83) a été retirée sur sa demande. Choix proposé et retenu : la provenance des photos
  est dite **au pied de page de tout le site** — « المواصفات والصور من المواقع الرسمية للشركات المصنعة. » / « Specifications and photos
  from manufacturers' official websites. » (« والصور » / « and photos » ajoutés, texte arabe validé par lui) ; l'alternative « retirer
  sans rien ajouter » a été écartée. Les fiches gardent le crédit de chaque photo (galerie). Second écart à la posture des images
  pour cet emplacement (photo retournée ET sans crédit sous l'image), décidé par lui ; la paire n'exige plus d'`attribution`.
  **En production le 21 octobre 2026 au soir** (PR #85, `main` `e47e4db`, release `20261021190508`, retour arrière `20261021182916`) :
  suite complète 856/858 (api #76), purge `compare:version` 41, contrôle de prod 91/91 (le seul message de console : gtag.js bloqué par le
  contrôle) ; plus de « © » dans l'accueil, la phrase du pied de page en arabe et en anglais.
- **Cadrage** (`frame`) : les conversions gardent des marges transparentes (Trek 22 % en haut, Scott 39 %). Chaque photo est posée
  dans un cadre aux proportions de son vélo, agrandie et décalée de ses marges : les deux roues tombent sur la même ligne et les
  deux vélos sont à la même échelle. Valeurs mesurées sur l'alpha de `detail_2x`, identiques sur les quatre conversions à 0,3 % près ;
  changer de photo = les remesurer.
- **Mise en page** (`src/components/home/HomeHeroPair.tsx`) : un `div` (`data-hero-pair`) en `dir="ltr"` — la paire ne se retourne pas avec la page
  arabe ; entièrement décorative (`aria-hidden`, photos en `alt=""`) ; cadres à 44 % de la largeur, flèches à 10 % (le jaune du logo, mesuré
  `#F8C848`, pointe `#F2B705`) ; `priority` (dans le premier écran sur ordinateur et téléphone, la plus grande chose de la page) ;
  `sizes` = 480 px dès 1024 px, 50vw en dessous — sur téléphone, `card` (400 px). Le hero resserre son bas (`pb-10`) quand la paire
  est là : les vélos suivent les boutons et la figure finit sur la bande des marques.
- **Thème sombre** : un halo clair derrière la figure (`.hero-pair-stage`, `globals.css`, les deux portes du thème comme le logo) ;
  rien en thème clair.
- **Lecture** (`src/app/[locale]/page.tsx`) : en plus du catalogue, la fiche de chacun des deux vélos (`getBuild`, tag
  `build:{marque}:{slug}` : l'accueil se re-rend quand l'un d'eux change). **Bloc secondaire** : un vélo absent, une photo retirée,
  une API en panne → pas de paire, l'accueil d'avant à l'identique, une ligne `[hero]` au journal en cas d'erreur.
- **Tests** : `tests/e2e/home-hero.spec.ts` — la règle seule (ordre, miroir à droite, repli sans paire), le
  garde-fou (l'API sert les six photos), les pages réelles en arabe et en anglais (photos de l'API, place réservée, même ordre dans
  les deux langues, miroir à droite seulement, sous les boutons, aucun crédit sous les vélos, provenance au pied de page), **le cadrage lu sur la photo
  servie elle-même** (alpha relu dans le navigateur, en-tête CORS ajouté par le test : chaque vélo remplit son cadre à 2 px près),
  le halo en sombre et son absence en clair. Les assertions du miroir et du cadrage ont été prouvées par mutation (miroir retiré,
  cadrage faussé : rouges). `reflow.spec.ts` couvre l'accueil à 320 et 390 px. Changer une paire = `home-hero.ts`, ce spec et cette
  section, dans le même commit.
- **En production le 21 octobre 2026** (PR #83, `main` `bbe84af`, release `20261021182916`, retour arrière `20261016165547`), sur
  « mets ça en prod, go » du fondateur : CI verte ; suite e2e complète 858/860 avant fusion (les 2 échecs connus api #76, cibles
  tactiles du Vado SL 2 à 320 px) ; purge (`compare:version` 40) ; contrôle de prod en lecture seule, Google Analytics bloqué : **84
  vérifications conformes** (arabe et anglais, 1440, 390 et 320 px, clair et sombre : paire présente, photos 3608 et 3363 de l'API
  chargées, miroir à droite seulement, ordre et roues alignés, crédit, halo en sombre seulement, aucun défilement en largeur,
  `noindex` intact). Les seules erreurs de console relevées sont le chargeur gtag.js que le contrôle bloque exprès.

## Budgets performance

LCP ≤ 2,5 s p75 mobile · INP ≤ 200 ms · CLS ≤ 0,1 · TTFB page cachée ≤ 800 ms depuis le Golfe

## Ne pas committer

`.claude/` · `.env.local` · `src/types/api.ts` modifié à la main

@AGENTS.md
