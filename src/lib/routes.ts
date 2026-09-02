import type { Locale } from '@/lib/api';

/**
 * Les chemins du site, en un seul endroit.
 *
 * Décision du 2 septembre 2026 (rapport SEO, § 1) : une marque et une
 * catégorie ont chacune une page à chemin propre, à côté du catalogue filtré.
 *
 *   /{locale}/bikes/{brand}               page marque
 *   /{locale}/{category}-bikes            page catégorie — SLUG PROVISOIRE
 *   /{locale}/bikes?brand=…&category=…    catalogue filtré
 *
 * Le slug d'une catégorie est DÉRIVÉ de sa clé API (`road` → `road-bikes`,
 * `e_mtb` → `e-mtb-bikes`) tant que l'API n'en publie pas un : provisoire, et
 * documenté comme tel dans CLAUDE.md. La page n'existe que si la clé
 * reconstituée est une catégorie réelle de l'API — c'est la page qui le
 * vérifie, sur la facette. Le seau `uncategorized` n'est pas une catégorie
 * mais un état de la donnée (canonisation à faire) : il n'a pas de page.
 *
 * La page catégorie vit À LA RACINE de la locale, hors `/bikes/`, pour ne
 * jamais entrer en collision avec un slug de marque. Les segments statiques
 * `bikes`, `compare` et `finder` gardent la main sur `[category]` — Next fait
 * gagner un segment littéral ; tout autre segment inconnu rend 404.
 */
const UNCATEGORIZED = 'uncategorized';
const CATEGORY_SUFFIX = '-bikes';

export function brandPath(locale: Locale, brand: string): string {
  return `/${locale}/bikes/${brand}`;
}

/** Le seau « non catégorisé » n'a pas de page : sa tuile garde le catalogue filtré. */
export function hasCategoryPage(key: string): boolean {
  return key !== UNCATEGORIZED;
}

export function categoryPath(locale: Locale, key: string): string {
  return `/${locale}/${key.replace(/_/g, '-')}${CATEGORY_SUFFIX}`;
}

/**
 * La clé de catégorie portée par un segment d'URL, ou `null` si le segment
 * n'en est pas un — la page rend alors 404 sans appeler l'API.
 */
export function categoryKeyOf(segment: string): string | null {
  if (!segment.endsWith(CATEGORY_SUFFIX)) return null;

  const key = segment.slice(0, -CATEGORY_SUFFIX.length).replace(/-/g, '_');

  return key !== '' && hasCategoryPage(key) ? key : null;
}

/** Le catalogue filtré : les paramètres sont ceux de l'API, transmis tels quels. */
export function catalogPath(locale: Locale, filters: Record<string, string> = {}): string {
  const query = new URLSearchParams(filters).toString();

  return query ? `/${locale}/bikes?${query}` : `/${locale}/bikes`;
}
