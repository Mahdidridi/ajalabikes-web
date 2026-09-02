import type { MetadataRoute } from 'next';
import { getCatalog, LOCALES, type BuildCard, type CatalogPage, type Facets } from '@/lib/api';
import { categorySlug, hasCategoryPage } from '@/lib/routes';
import { absoluteUrl, hreflangGroup } from '@/lib/seo';

/**
 * Le sitemap (`src/app/sitemap.ts`) : quelles pages, dans quelles locales.
 *
 * Deux moities, pour que la liste se verifie sans toucher au verrou :
 * `loadSitemapData` LIT le catalogue (marques, categories, fiches) ;
 * `sitemapEntries` TRANSFORME ces donnees en entrees — une fonction pure,
 * testee sur une fixture par `tests/e2e/sitemap.spec.ts`.
 *
 * Pas de `lastmod` : l'API n'expose pas encore de date de changement fiable
 * par page, et une date inventee vaut moins que pas de date — Google l'ignore
 * des qu'il la prend en defaut. Ni `changefreq` ni `priority` : il ne les lit
 * plus.
 */

/** Un seau de facette reduit a sa cle : c'est le slug de la page marque, la source du slug de categorie. */
type Bucket = Pick<Facets['brands'][number], 'key'>;

export type SitemapData = {
  brands: Bucket[];
  /** La facette complete, `uncategorized` compris : c'est `sitemapEntries` qui l'ecarte. */
  categories: Bucket[];
  builds: Pick<BuildCard, 'slug' | 'brand'>[];
};

/** Ce que le sitemap recoit tant que le verrou est pose : rien n'est lu. */
export const NO_DATA: SitemapData = { brands: [], categories: [], builds: [] };

/**
 * La borne haute de `per_page` : l'API ramene toute valeur superieure a 800
 * (verifie le 2 septembre 2026 : `?per_page=1000` repond `meta.per_page: 800`,
 * sans 422). Le contrat ne la publie pas ; le curseur prend le relais au-dela.
 */
const PER_PAGE = '800';

/** Slugs et cles sont les memes dans toutes les locales : une seule lecture suffit. */
const SOURCE_LOCALE = LOCALES[0];

const cartes = (page: CatalogPage): SitemapData['builds'] =>
  page.data.map(({ slug, brand }) => ({ slug, brand }));

/**
 * Tout le catalogue, page de curseur apres page de curseur — chaque lecture
 * cachee et taguee `catalog` comme celles des pages. Les facettes de la
 * premiere page suffisent : sans filtre, elles sont completes.
 */
export async function loadSitemapData(): Promise<SitemapData> {
  const premiere = await getCatalog(SOURCE_LOCALE, { per_page: PER_PAGE });
  const builds = cartes(premiere);

  let { has_more, next_cursor } = premiere.meta;
  while (has_more && next_cursor) {
    const page = await getCatalog(SOURCE_LOCALE, { per_page: PER_PAGE, cursor: next_cursor });
    builds.push(...cartes(page));
    ({ has_more, next_cursor } = page.meta);
  }

  return { brands: premiere.facets.brands, categories: premiere.facets.categories, builds };
}

/**
 * Les entrees du sitemap, ou RIEN tant que le verrou est pose — quelles que
 * soient les donnees recues : un sitemap vide ne dit rien a Google, un
 * sitemap plein pendant un noindex lui dit deux choses contraires.
 *
 * Chaque page sort une fois par locale servie, avec le meme groupe hreflang
 * que son `<head>`. Aucun catalogue filtre, aucune etape du bikefinder,
 * aucune comparaison : ce sont des etats d'interface, `noindex` par politique.
 * Ordre : les pages fixes, les marques, les categories, puis les fiches.
 */
export function sitemapEntries(locked: boolean, data: SitemapData): MetadataRoute.Sitemap {
  if (locked) return [];

  const chemins = [
    '',
    '/bikes',
    '/finder',
    ...data.brands.map((b) => `/bikes/${b.key}`),
    // Seules les categories qui ont une page : la table de `routes.ts`, jamais un slug derive.
    ...data.categories.flatMap((c) => (hasCategoryPage(c.key) ? [`/${categorySlug(c.key)}`] : [])),
    ...data.builds.map((b) => `/bikes/${b.brand.slug}/${b.slug}`),
  ];

  return chemins.flatMap((chemin) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(locale, chemin),
      alternates: { languages: hreflangGroup(chemin) },
    })),
  );
}
