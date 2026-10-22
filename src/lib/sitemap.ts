import type { MetadataRoute } from 'next';
import { getCatalog, LOCALES, type BuildCard, type CatalogPage, type Facets } from '@/lib/api';
import { currentBuildPath } from '@/lib/build-address';
import { LEGAL_PAGES } from '@/lib/legal';
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
 * Ce qui entre, c'est ce que l'API dit indexable (decision du 16 octobre 2026,
 * plan de levee du noindex) : une marque ou une categorie sous le seuil de
 * 5 velos, une fiche sans photo ou a l'adresse encore provisoire (api #25)
 * n'y sont pas. `lastmod` = `last_changed_at` des fiches, la date de dernier
 * changement que l'API sert (api #13) ; les autres pages n'ont pas de date
 * fiable et n'en recoivent aucune — une date inventee vaut moins que pas de
 * date. Ni `changefreq` ni `priority` : Google ne les lit plus.
 */

/** Un seau de facette : sa cle (slug de la page marque, source du slug de categorie) et l'avis de l'API. */
type Bucket = Pick<Facets['brands'][number], 'key' | 'indexable'>;

export type SitemapData = {
  brands: Bucket[];
  /** La facette complete, `uncategorized` compris : c'est `sitemapEntries` qui l'ecarte. */
  categories: Bucket[];
  builds: Pick<BuildCard, 'slug' | 'brand' | 'indexable' | 'model_path' | 'year' | 'last_changed_at'>[];
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
  page.data.map(({ slug, brand, indexable, model_path, year, last_changed_at }) =>
    ({ slug, brand, indexable, model_path, year, last_changed_at }));

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
 * Chaque page indexable sort une fois par locale servie, avec le meme groupe
 * hreflang que son `<head>`. Aucun catalogue filtre, aucune etape du
 * bikefinder, aucune comparaison : ce sont des etats d'interface, `noindex`
 * par politique. Une fiche sort a son adresse canonique (`currentBuildPath`) :
 * l'adresse millesime pour un velo nomme comme sa famille. Ordre : les pages
 * fixes, les marques, les categories, puis les fiches.
 */
export function sitemapEntries(locked: boolean, data: SitemapData): MetadataRoute.Sitemap {
  if (locked) return [];

  const pages: { chemin: string; lastModified?: string }[] = [
    { chemin: '' },
    { chemin: '/bikes' },
    { chemin: '/finder' },
    // Les pages legales (web #16) : indexables, comme toute page du site.
    ...LEGAL_PAGES.map((page) => ({ chemin: `/${page}` })),
    ...data.brands.filter((b) => b.indexable).map((b) => ({ chemin: `/bikes/${b.key}` })),
    // Seules les categories qui ont une page : la table de `routes.ts`, jamais un slug derive.
    ...data.categories.flatMap((c) =>
      c.indexable && hasCategoryPage(c.key) ? [{ chemin: `/${categorySlug(c.key)}` }] : [],
    ),
    ...data.builds
      .filter((b) => b.indexable)
      .map((b) => ({ chemin: currentBuildPath(b), lastModified: b.last_changed_at })),
  ];

  return pages.flatMap(({ chemin, lastModified }) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(locale, chemin),
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages: hreflangGroup(chemin) },
    })),
  );
}
