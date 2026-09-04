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

La CI télécharge `openapi.json` depuis la dernière release de `ajalabikes-api`, régénère, et **échoue si le résultat diffère de ce qui est committé**. Une interface redéclarée à la main contourne ce garde-fou et produit un `NaN SAR` en production trois semaines plus tard.

## Commandes

```bash
npm run dev
npm run typecheck && npm run lint && npm run build
npx playwright test          # desktop + mobile + RTL
```

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
  `fuel-mx-9-8-xt` → `…-gen-7-81563` est en `test.fixme` jusqu'à la semence côté API (vérifié en local contre une API
  simulée qui renvoie la fiche vivante sur l'ancien slug).

## Cache — rendre une fois, invalider au changement

Contrat partagé avec l'API : `../tasks/2026-09-02-cache-contrat.md`. Les tags y sont la référence ; aucun autre n'est inventé sans le mettre à jour.

- **Lectures API** (`src/lib/api.ts`) : `cache: 'force-cache'` + `next: { tags, revalidate: 86400 }`. Les 24 h sont un filet, l'invalidation par tag est le mécanisme. `getBuild` → `build:{brand}:{slug}` · `getCatalog` → `catalog` · `getFinderTree` / `getFinderResults` → `bikefinder` · `getCompare` → `compare`.
- **Pages** : fiche vélo, pages marque et catégorie, étapes du finder sont rendues au premier appel puis servies du cache (`revalidate = 86400`, `dynamicParams = true`, `generateStaticParams` vide — sans lui, même vide, Next rend la route à chaque requête). Accueil et racine du finder sont prérendus par locale avec le même `revalidate`. Catalogue et comparateur restent dynamiques (`searchParams`), mais leurs appels API sont cachés.
- **Route `POST /api/revalidate`** (`src/app/api/revalidate/route.ts`) : `Authorization: Bearer $REVALIDATE_SECRET` (comparaison en temps constant, secret absent = tout refusé), corps `{ "tags": [...], "reason": "..." }`. Réponses : `200 { revalidated, reason, at }` · `401 { "error": "unauthorized" }` · `422 { "error": "tags required" }`. Chaque tag expire immédiatement (`revalidateTag(tag, { expire: 0 })` : la requête suivante re-rend, jamais de page périmée servie après un import) ; `all` = `revalidatePath('/', 'layout')`. Une ligne `[revalidate] {"status","tags","reason","ms"}` par appel dans la sortie du serveur.
- **Preuve** : l'en-tête `x-nextjs-cache` sur toute page cachée — `MISS` au premier rendu, `HIT` ensuite, de nouveau `MISS` après le tag. Uniquement sous `npm run build && npm start` : `next dev` ne cache rien. Vérifié par `tests/e2e/cache.spec.ts`.
- **Purger en local** (secret de `.env.local`, jamais commité — `REVALIDATE_SECRET=secret-local-de-test` est la valeur par défaut du spec, surchargeable par la variable d'environnement) :

  ```bash
  curl -X POST http://127.0.0.1:3000/api/revalidate \
    -H "Authorization: Bearer secret-local-de-test" -H "Content-Type: application/json" \
    -d '{"tags":["all"],"reason":"purge manuelle"}'
  ```

- **Limite connue** : le cache handler par défaut de Next garde les invalidations de tags **en mémoire du processus** (`tags-manifest.external`) ; le HTML est sur disque, mais avec plusieurs workers PM2 seul celui qui reçoit le webhook purge, les autres servent l'ancienne page jusqu'au filet de 24 h. Un seul worker, ou un cache handler partagé, avant de passer en cluster.

## SEO — préparé, verrouillé

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
- **`INDEXING_LOCKED = true`** force `noindex, nofollow` partout. `indexable: false` (catalogue avec query, comparateur avec query, étapes du bikefinder) est la politique **cible** : `noindex, follow` à la levée. Le `robots: noindex` du layout reste le défaut d'une page qui n'appellerait pas le helper.
- **JSON-LD** : `src/lib/jsonld.ts` construit, `src/components/JsonLd.tsx` rend — un `<script type="application/ld+json">` par bloc, dans la langue de la page, tout vient de la réponse API (un champ absent est omis). Accueil : `WebSite` (+ `alternateName` « دراجة », `inLanguage`) et `Organization`, sans `SearchAction`. Fiche : `BreadcrumbList` (Accueil → Vélos → Marque `/bikes/{brand}` → Fiche) et `Product` (`name`, `brand`, `url`, `image` = galerie en `detail`) **sans `offers`, sans prix, sans `aggregateRating`**. Catalogue nu : `ItemList` des cartes de la page ; jamais sur un catalogue filtré.
- **`robots.txt` et `sitemap.xml` — générés, derrière le verrou.** `src/app/robots.ts` rend `robotsRules(INDEXING_LOCKED)` (`src/lib/seo.ts`) : verrouillé, `User-Agent: *` / `Disallow: /` sans ligne `Sitemap:` — le contenu de l'ancien `public/robots.txt`, supprimé (un fichier statique ne coexiste pas avec la route ; Next écrit `User-Agent` avec sa capitale, la casse d'un champ est libre) ; déverrouillé, tout permis sauf `/{locale}/compare?`, `/*per_page=`, `/api/`, plus `Sitemap: https://darrajabikes.com/sitemap.xml`. `src/app/sitemap.ts` rend `sitemapEntries(INDEXING_LOCKED, données)` (`src/lib/sitemap.ts`, fonction pure) : verrouillé, un `urlset` vide sans appel à l'API ; déverrouillé, un seul fichier (≈ 1 300 URL) par locale servie — accueil, catalogue nu, `/finder`, pages marque (facette `brands`), pages catégorie (facette `categories` sauf `uncategorized`, slug de `routes.ts`), toutes les fiches, lues par `getCatalog` à `per_page=800` (borne haute de l'API, ramenée silencieusement, absente du contrat) puis par curseur — chacune avec son groupe hreflang (`hreflangGroup`, le même que le `<head>`). **Pas de `lastmod`** tant que l'API n'expose pas de date de changement fiable ; ni `changefreq` ni `priority`. `revalidate = 86400`, re-rendu sur le tag `catalog`.
- **Tests** : `tests/e2e/seo.spec.ts` — canonical, hreflang réciproques, JSON-LD, noindex, et le `<head>` reçu par un robot sans JavaScript (UA Bingbot : Next diffère sinon les métadonnées des pages dynamiques dans le `<body>`). `tests/e2e/sitemap.spec.ts` — les routes telles que servies (verrou posé) et les fonctions pures avec le verrou simulé à `false` : la politique cible se vérifie sans le lever. Son premier test échoue le jour de la levée : voulu, il dit de mettre à jour les attentes.
- **Avant la levée** : droits d'images documentés · `indexable` + `last_changed_at` exposés par l'API (contrat régénéré, puis `lastmod` dans le sitemap) · Search Console · mesure TTFB depuis Riyad · audit crawler et Rich Results Test. **Le jour J** : `INDEXING_LOCKED` à `false` **et** retrait de l'en-tête `X-Robots-Tag` de `next.config.ts`, ensemble — `robots.txt` et le sitemap suivent d'eux-mêmes.

## Budgets performance

LCP ≤ 2,5 s p75 mobile · INP ≤ 200 ms · CLS ≤ 0,1 · TTFB page cachée ≤ 800 ms depuis le Golfe

## Ne pas committer

`.claude/` · `.env.local` · `src/types/api.ts` modifié à la main

@AGENTS.md
