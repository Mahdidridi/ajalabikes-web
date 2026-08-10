# ajalabikes-web

**Next.js 16 (App Router) + React 19 + TypeScript — affichage uniquement.**

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

## Règles propres à ce dépôt

**1. Server Components par défaut.**
Client Components uniquement pour : filtres, comparateur, graphiques interactifs, overlay géométrie.

**2. RTL dès le design system.**
Jamais « retourner » une interface LTR à la fin. Les composants sont testés indépendamment du sens de lecture. Locales alimentées : `ar-sa`, `en-sa`, `ar-ae`, `en-ae`.

**3. Images : loader custom, pas d'optimisation `next/image` par-dessus.**
Les conversions sont déjà générées par Laravel et servies par le CDN. Les ré-optimiser double le coût et la latence. Conserver `<Image>` pour le lazy loading et la réservation d'espace — largeur et hauteur viennent toujours de l'API.

**4. L'état du comparateur vit dans l'URL.**
Source partageable et indexable. L'état local ne fait que la synchroniser.

**5. Invalidation par tags.**
`bike:{id}` · `family:{id}` · `brand:{id}` · `market:{code}`. Le webhook `/api/revalidate` est appelé par Laravel avec un secret partagé — **logger chaque invalidation**.

**6. Indexation contrôlée.**
Comparaisons : liste blanche uniquement, jamais les permutations d'un même ensemble. Recherche libre et filtres arbitraires : `noindex`.

**7. Jamais de `aggregateRating` fabriqué** dans les données structurées.

## Budgets performance

LCP ≤ 2,5 s p75 mobile · INP ≤ 200 ms · CLS ≤ 0,1 · TTFB page cachée ≤ 800 ms depuis le Golfe

## Ne pas committer

`.claude/` · `.env.local` · `src/types/api.ts` modifié à la main

@AGENTS.md
