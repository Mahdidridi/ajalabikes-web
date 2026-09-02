# ajalabikes-web

**Next.js 16 (App Router) + React 19 + TypeScript — affichage uniquement.**

**Projet : Darraja Bikes** (دراجة) — nom technique `darrajabikes`, domaine `darrajabikes.com`
(décision du 28 août 2026). Le dépôt garde son nom historique, comme `package.json` (`ajala-web`) et
`ajalaImageLoader` : seul le nom affiché change (header, footer, métadonnées — issue #6).
**Aucune indexation ni sitemap tant que les URL ne sont pas figées** : `robots: { index: false, follow: false }`
reste global dans `src/app/[locale]/layout.tsx` ; pas de `sitemap.ts`, rien n'est soumis à Search Console.

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

## Cache — rendre une fois, invalider au changement

Contrat partagé avec l'API : `../tasks/2026-09-02-cache-contrat.md`. Les tags y sont la référence ; aucun autre n'est inventé sans le mettre à jour.

- **Lectures API** (`src/lib/api.ts`) : `cache: 'force-cache'` + `next: { tags, revalidate: 86400 }`. Les 24 h sont un filet, l'invalidation par tag est le mécanisme. `getBuild` → `build:{brand}:{slug}` · `getCatalog` → `catalog` · `getFinderTree` / `getFinderResults` → `bikefinder` · `getCompare` → `compare`.
- **Pages** : fiche vélo et étapes du finder sont rendues au premier appel puis servies du cache (`revalidate = 86400`, `dynamicParams = true`, `generateStaticParams` vide — sans lui, même vide, Next rend la route à chaque requête). Accueil et racine du finder sont prérendus par locale avec le même `revalidate`. Catalogue et comparateur restent dynamiques (`searchParams`), mais leurs appels API sont cachés.
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

- **`src/lib/seo.ts` — `seoFor({ locale, path, title?, description?, indexable? })`**, appelé par chaque page (`generateMetadata`) : canonical absolu, auto-référent, **sans query** (`SITE_URL` = `https://darrajabikes.com`, `metadataBase` posé dans le layout) ; hreflang `ar-SA` / `en-SA` dérivés de `LOCALES` (`ae` y entrera tout seul le jour où il sera servi) + `x-default` → `en-sa` ; Open Graph (`locale`, `alternateLocale`, `url`, `siteName`) ; `robots`. La réciprocité des hreflang vient de là : toutes les pages émettent le même groupe. Titre = libellé existant de la page + ` · Darraja Bikes` ; fiche = `bikeTitle` (marque, modèle, millésime tel que libellé par l'API, seulement s'il est connu) ; description absente = signature.
- **`INDEXING_LOCKED = true`** force `noindex, nofollow` partout. `indexable: false` (catalogue avec query, comparateur avec query, étapes du bikefinder) est la politique **cible** : `noindex, follow` à la levée. Le `robots: noindex` du layout reste le défaut d'une page qui n'appellerait pas le helper.
- **JSON-LD** : `src/lib/jsonld.ts` construit, `src/components/JsonLd.tsx` rend — un `<script type="application/ld+json">` par bloc, dans la langue de la page, tout vient de la réponse API (un champ absent est omis). Accueil : `WebSite` (+ `alternateName` « دراجة », `inLanguage`) et `Organization`, sans `SearchAction`. Fiche : `BreadcrumbList` (Accueil → Vélos → Marque `/bikes/{brand}` → Fiche) et `Product` (`name`, `brand`, `url`, `image` = galerie en `detail`) **sans `offers`, sans prix, sans `aggregateRating`**. Catalogue nu : `ItemList` des cartes de la page ; jamais sur un catalogue filtré.
- **Tests** : `tests/e2e/seo.spec.ts` — canonical, hreflang réciproques, JSON-LD, noindex, et le `<head>` reçu par un robot sans JavaScript (UA Bingbot : Next diffère sinon les métadonnées des pages dynamiques dans le `<body>`).
- **Avant la levée** : droits d'images documentés · `indexable` + `last_changed_at` exposés par l'API (contrat régénéré) · `app/sitemap.ts` + `app/robots.ts` · pages marque / catégorie · Search Console · mesure TTFB depuis Riyad · audit crawler et Rich Results Test. **Le jour J** : `INDEXING_LOCKED` à `false` **et** retrait de l'en-tête `X-Robots-Tag` de `next.config.ts`, ensemble.

## Budgets performance

LCP ≤ 2,5 s p75 mobile · INP ≤ 200 ms · CLS ≤ 0,1 · TTFB page cachée ≤ 800 ms depuis le Golfe

## Ne pas committer

`.claude/` · `.env.local` · `src/types/api.ts` modifié à la main

@AGENTS.md
