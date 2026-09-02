import type { Locale } from '@/lib/api';

/**
 * Les chemins du site, en un seul endroit.
 *
 * Décision du 2 septembre 2026 (rapport SEO, § 1) : une marque et une
 * catégorie ont chacune une page à chemin propre, à côté du catalogue filtré.
 *
 *   /{locale}/bikes/{brand}               page marque
 *   /{locale}/{slug}                      page catégorie — `CATEGORY_SLUGS`
 *   /{locale}/bikes?brand=…&category=…    catalogue filtré
 *
 * La page catégorie vit À LA RACINE de la locale, hors `/bikes/`, pour ne
 * jamais entrer en collision avec un slug de marque. Les segments statiques
 * `bikes`, `compare` et `finder` gardent la main sur `[category]` — Next fait
 * gagner un segment littéral ; tout autre segment inconnu rend 404.
 */

/**
 * Clé de catégorie de l'API ↔ segment d'URL : LA RÉFÉRENCE tant que l'API ne
 * porte pas le slug (décision du 3 septembre 2026, CLAUDE.md « Routes et
 * locales », point 2). Les slugs sont PARLANTS, d'après les mesures
 * (`notes/seo-vocabulaire-golfe-2026-09-03.md`, § 6) : on cherche
 * « electric mountain bike », personne ne tape « e-mtb » — la clé de l'API
 * n'est pas un mot. Une clé ne se dérive donc plus en slug : elle s'y lit.
 *
 * Le seau `uncategorized` n'est pas une catégorie mais un état de la donnée
 * (canonisation à faire) : il n'a pas de page, et n'entre pas ici. Une clé
 * que l'API ajouterait avant cette table n'a pas de page non plus, jusqu'à ce
 * qu'on lui choisisse un slug — jamais un segment inventé.
 *
 * Le jour où l'API publiera le slug par seau de facette, cette table devient
 * sa copie, puis disparaît.
 */
export const CATEGORY_SLUGS = {
  city: 'city-bikes',
  cross_country: 'cross-country-bikes',
  cyclocross: 'cyclocross-bikes',
  dirt_jump: 'dirt-jump-bikes',
  downhill: 'downhill-bikes',
  e_city: 'electric-city-bikes',
  e_gravel: 'electric-gravel-bikes',
  e_mtb: 'electric-mountain-bikes',
  enduro: 'enduro-bikes',
  e_road: 'electric-road-bikes',
  fat: 'fat-bikes',
  gravel: 'gravel-bikes',
  kids: 'kids-bikes',
  road: 'road-bikes',
  trail: 'trail-bikes',
  triathlon: 'triathlon-bikes',
} as const satisfies Record<string, `${string}-bikes`>;

/** Une clé de catégorie QUI A UNE PAGE : celles de la table, et elles seules. */
export type CategoryKey = keyof typeof CATEGORY_SLUGS;

/** L'inverse strict de la table : un segment qui n'y est pas n'est pas une page. */
const KEY_BY_SLUG = new Map<string, CategoryKey>(
  (Object.keys(CATEGORY_SLUGS) as CategoryKey[]).map((key) => [CATEGORY_SLUGS[key], key]),
);

export function brandPath(locale: Locale, brand: string): string {
  return `/${locale}/bikes/${brand}`;
}

/**
 * Une catégorie a une page si la table lui donne un slug. Le seau « non
 * catégorisé » n'en a pas : sa tuile garde le catalogue filtré. `hasOwn`, pas
 * `in` : `constructor` n'est pas une catégorie.
 */
export function hasCategoryPage(key: string): key is CategoryKey {
  return Object.hasOwn(CATEGORY_SLUGS, key);
}

/** Le segment d'URL d'une catégorie, sans locale : `e_mtb` → `electric-mountain-bikes`. */
export function categorySlug(key: CategoryKey): string {
  return CATEGORY_SLUGS[key];
}

export function categoryPath(locale: Locale, key: CategoryKey): string {
  return `/${locale}/${categorySlug(key)}`;
}

/**
 * La clé de catégorie portée par un segment d'URL, ou `null` si le segment
 * n'est pas un slug de la table — la page rend alors 404 sans appeler l'API.
 * Les anciens slugs provisoires (`e-mtb-bikes`) ne sont pas redirigés : jamais
 * indexés, en ligne quelques heures.
 */
export function categoryKeyOf(segment: string): CategoryKey | null {
  return KEY_BY_SLUG.get(segment) ?? null;
}

/** Le catalogue filtré : les paramètres sont ceux de l'API, transmis tels quels. */
export function catalogPath(locale: Locale, filters: Record<string, string> = {}): string {
  const query = new URLSearchParams(filters).toString();

  return query ? `/${locale}/bikes?${query}` : `/${locale}/bikes`;
}
