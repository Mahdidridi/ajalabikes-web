# ajalabikes-web

**Next.js 16 (App Router) + React 19 + TypeScript — affichage uniquement.**

**Projet : Darraja Bikes** (دراجة) — nom technique `darrajabikes`, domaine `darrajabikes.com`
(décision du 28 août 2026). Le dépôt garde son nom historique, comme `package.json` (`ajala-web`) et
`ajalaImageLoader` : seul le nom affiché change (header, footer, métadonnées — issue #6).
**Aucune indexation ni sitemap actif tant que les URL ne sont pas figées** : `robots: { index: false, follow: false }`
reste global dans `src/app/[locale]/layout.tsx` ; `robots.ts` et `sitemap.ts` existent mais rendent « tout interdit » et un
`urlset` vide tant que `INDEXING_LOCKED` est posé (voir « SEO ») ; rien n'est soumis à Search Console.

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
anglais). Garde : `tests/e2e/reflow.spec.ts` (accueil, catalogue, bikefinder, comparateur, trois fiches ; AR et EN ; 320 et
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
- Marque ou catégorie inconnue → `notFound()`. Métadonnées minimales (`title`, `description`, noindex) en attendant le
  helper SEO. Même schéma de cache que la fiche (voir « Cache »), tag `catalog`.
- Liens entrants : tuiles de l'accueil (`HomeBrands`, `HomeCategories`) et nom de la marque sur la fiche. Les tuiles des
  pages elles-mêmes mènent au catalogue filtré (`/bikes?brand=…&category=…`), un résultat réel.
- **Une fiche, une URL** (`src/app/[locale]/bikes/[brand]/[slug]/page.tsx`, `resolve()` partagé par la page et
  `generateMetadata`) : si `getBuild` renvoie un build dont `slug` ou `brand.slug` diffère de l'URL — ancien slug résolu
  par la future table `slug_redirects` de l'API, fusion —, `permanentRedirect` (308, mis en cache ISR) vers
  `/{locale}/bikes/{brand.slug}/{slug}`. Un slug inconnu de l'API reste 404. `tests/e2e/redirects.spec.ts` : le cas
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

- **Lectures API** (`src/lib/api.ts`) : `cache: 'force-cache'` + `next: { tags, revalidate: 86400 }`. Les 24 h sont un filet, l'invalidation par tag est le mécanisme. `getBuild` → `build:{brand}:{slug}` · `getCatalog` → `catalog` · `getFinderTree` / `getFinderResults` → `bikefinder` · `getCompare` → `compare`.
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

## SEO — préparé, verrouillé

Décisions du 2 septembre 2026 (`../CLAUDE.md`, « Routes et locales », points 1 à 5 ; rapport `../notes/seo-strategie-2026-09-02.md`). Tout est en place **sans lever le noindex**.

- **`src/lib/seo.ts` — `seoFor({ locale, path, title?, description?, indexable? })`**, appelé par chaque page (`generateMetadata`) : canonical absolu, auto-référent, **sans query** (`SITE_URL` = `https://darrajabikes.com`, `metadataBase` posé dans le layout) ; hreflang `ar-SA` / `en-SA` dérivés de `LOCALES` (`ae` y entrera tout seul le jour où il sera servi), catchalls `ar` → `ar-sa` et `en` → `en-sa` (fixes sur `sa`, voir ci-dessous) + `x-default` → `en-sa` ; Open Graph (`locale`, `alternateLocale`, `url`, `siteName`) ; `robots`. La réciprocité des hreflang vient de là : toutes les pages émettent le même groupe. Titre = libellé existant de la page + ` · Darraja Bikes` ; fiche = `bikeTitle` (marque, modèle, millésime tel que libellé par l'API, seulement s'il est connu) ; description absente = signature — **sauf la fiche, qui a la sienne** : `bikeDescription(locale, build)` (« دراجة {marque} {modèle} {année} : المواصفات الكاملة، الهندسة حسب المقاس ({n} مقاسات)… » / « {brand} {model} {year}: full specs, geometry by size ({n} sizes)… »), bâtie sur les champs rendus par l'API, un champ absent omis (millésime inconnu, aucune taille), coupée au dernier mot entier au-delà de 160 caractères. La catégorie n'y entre pas tant que `BuildResource` ne l'expose pas.
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
- **`INDEXING_LOCKED = true`** force `noindex, nofollow` partout. `indexable: false` (catalogue avec query, comparateur avec query, étapes du bikefinder) est la politique **cible** : `noindex, follow` à la levée. Le `robots: noindex` du layout reste le défaut d'une page qui n'appellerait pas le helper.
- **JSON-LD** : `src/lib/jsonld.ts` construit, `src/components/JsonLd.tsx` rend — un `<script type="application/ld+json">` par bloc, dans la langue de la page, tout vient de la réponse API (un champ absent est omis). Accueil : `WebSite` (+ `alternateName` « دراجة », `inLanguage`) et `Organization`, sans `SearchAction`. Fiche : `BreadcrumbList` (Accueil → Vélos → Marque `/bikes/{brand}` → Fiche) et `Product` (`name`, `brand`, `url`, `image` = galerie en `detail`) **sans `offers`, sans prix, sans `aggregateRating`**. Catalogue nu : `ItemList` des cartes de la page ; jamais sur un catalogue filtré.
- **`robots.txt` et `sitemap.xml` — générés, derrière le verrou.** `src/app/robots.ts` rend `robotsRules(INDEXING_LOCKED)` (`src/lib/seo.ts`) : verrouillé, `User-Agent: *` / `Disallow: /` sans ligne `Sitemap:` — le contenu de l'ancien `public/robots.txt`, supprimé (un fichier statique ne coexiste pas avec la route ; Next écrit `User-Agent` avec sa capitale, la casse d'un champ est libre) ; déverrouillé, tout permis sauf `/{locale}/compare?`, `/*per_page=`, `/api/`, plus `Sitemap: https://darrajabikes.com/sitemap.xml`. `src/app/sitemap.ts` rend `sitemapEntries(INDEXING_LOCKED, données)` (`src/lib/sitemap.ts`, fonction pure) : verrouillé, un `urlset` vide sans appel à l'API ; déverrouillé, un seul fichier (≈ 1 300 URL) par locale servie — accueil, catalogue nu, `/finder`, pages marque (facette `brands`), pages catégorie (facette `categories` sauf `uncategorized`, slug de `routes.ts`), toutes les fiches, lues par `getCatalog` à `per_page=800` (borne haute de l'API, ramenée silencieusement, absente du contrat) puis par curseur — chacune avec son groupe hreflang (`hreflangGroup`, le même que le `<head>`). **Pas de `lastmod`** tant que l'API n'expose pas de date de changement fiable ; ni `changefreq` ni `priority`. `revalidate = 86400`, re-rendu sur le tag `catalog`.
- **Tests** : `tests/e2e/seo.spec.ts` — canonical, hreflang réciproques, JSON-LD, noindex, et le `<head>` reçu par un robot sans JavaScript (UA Bingbot : Next diffère sinon les métadonnées des pages dynamiques dans le `<body>`). `tests/e2e/sitemap.spec.ts` — les routes telles que servies (verrou posé) et les fonctions pures avec le verrou simulé à `false` : la politique cible se vérifie sans le lever. Son premier test échoue le jour de la levée : voulu, il dit de mettre à jour les attentes.
- **Avant la levée** : droits d'images documentés · `indexable` + `last_changed_at` exposés par l'API (contrat régénéré, puis `lastmod` dans le sitemap) · Search Console · mesure TTFB depuis Riyad · audit crawler et Rich Results Test. **Le jour J** : `INDEXING_LOCKED` à `false` **et** retrait de l'en-tête `X-Robots-Tag` de `next.config.ts`, ensemble — `robots.txt` et le sitemap suivent d'eux-mêmes.

### Catchalls hreflang — décision du 5 septembre 2026, appliquée le 5 octobre (web #18)

`hreflangGroup()` ajoute `ar` → `ar-sa` et `en` → `en-sa` à `ar-SA`, `en-SA` et `x-default` → `en-sa` : cinq liens.
Ces deux catchalls restent fixes sur `sa` quand d'autres pays seront servis (`en-ae` entrera dans le groupe sans
déplacer `en`) ; aucune route `/ar` ou `/en` n'est créée. Les huit types de page passant par `seoFor()` héritent du
groupe : accueil, catalogue (nu ou filtré), fiche vélo, marque, catégorie, comparateur, entrée du finder et étapes du
finder — même groupe depuis les deux locales, canonical propre inchangé. Le sitemap consomme déjà ce helper : ses
tests de politique cible, verrou simulé à `false`, attendent aussi les cinq liens ; son code ne change pas.
`INDEXING_LOCKED`, le noindex global, `robots.txt`, le sitemap servi vide et la signature de `seoFor` restent inchangés.

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
  cote client, d'ou `next/script` afterInteractive dans ce seul repli. Le `X-Robots-Tag` global suffit.
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
- **Étape 2 : web #66** — tableau de toutes les tailles, dessin de la taille choisie à gauche (même en arabe), cote surlignée au
  survol, explications du glossaire, bascule valeur / « كما نشرتها الشركة » (remplace web #29).

## Budgets performance

LCP ≤ 2,5 s p75 mobile · INP ≤ 200 ms · CLS ≤ 0,1 · TTFB page cachée ≤ 800 ms depuis le Golfe

## Ne pas committer

`.claude/` · `.env.local` · `src/types/api.ts` modifié à la main

@AGENTS.md
