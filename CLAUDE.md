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

### Decision du 5 octobre 2026 - web #18, catchalls hreflang

Application de la decision du 5 septembre : `hreflangGroup()` ajoute `ar` vers `ar-sa` et `en` vers
`en-sa`, en plus de `ar-SA`, `en-SA` et `x-default` vers `en-sa`. Ces deux catchalls restent fixes sur
`sa` quand d'autres pays seront servis ; aucune route `/ar` ou `/en` n'est creee.
Les huit types de page passant par `seoFor()` heritent du groupe : accueil, catalogue (nu ou filtre),
fiche velo, marque, categorie, comparateur, entree du finder et etapes du finder. Meme groupe depuis
les deux locales, canonical propre inchange. Le sitemap consomme deja ce helper : ses tests de
politique cible, avec verrou simule a `false`, attendent aussi les cinq liens. Son code ne change pas.
`INDEXING_LOCKED`, le noindex global, `robots.txt`, le sitemap servi vide et la signature de `seoFor`
restent inchanges. Aucun deploiement ni levee du verrou n'est autorise par cette livraison.

Décisions du 2 septembre 2026 (`../CLAUDE.md`, « Routes et locales », points 1 à 5 ; rapport `../notes/seo-strategie-2026-09-02.md`). Tout est en place **sans lever le noindex**.

- **`src/lib/seo.ts` — `seoFor({ locale, path, title?, description?, indexable? })`**, appelé par chaque page (`generateMetadata`) : canonical absolu, auto-référent, **sans query** (`SITE_URL` = `https://darrajabikes.com`, `metadataBase` posé dans le layout) ; hreflang `ar-SA` / `en-SA` dérivés de `LOCALES` (`ae` y entrera tout seul le jour où il sera servi) + `x-default` → `en-sa` ; Open Graph (`locale`, `alternateLocale`, `url`, `siteName`) ; `robots`. La réciprocité des hreflang vient de là : toutes les pages émettent le même groupe. Titre = libellé existant de la page + ` · Darraja Bikes` ; fiche = `bikeTitle` (marque, modèle, millésime tel que libellé par l'API, seulement s'il est connu) ; description absente = signature — **sauf la fiche, qui a la sienne** : `bikeDescription(locale, build)` (« دراجة {marque} {modèle} {année} : المواصفات الكاملة، الهندسة حسب المقاس ({n} مقاسات)… » / « {brand} {model} {year}: full specs, geometry by size ({n} sizes)… »), bâtie sur les champs rendus par l'API, un champ absent omis (millésime inconnu, aucune taille), coupée au dernier mot entier au-delà de 160 caractères. La catégorie n'y entre pas tant que `BuildResource` ne l'expose pas.
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

## Budgets performance

LCP ≤ 2,5 s p75 mobile · INP ≤ 200 ms · CLS ≤ 0,1 · TTFB page cachée ≤ 800 ms depuis le Golfe

## Ne pas committer

`.claude/` · `.env.local` · `src/types/api.ts` modifié à la main

@AGENTS.md
