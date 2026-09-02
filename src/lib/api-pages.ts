import { getCatalog, type CatalogPage, type Facets, type Locale } from '@/lib/api';

/**
 * Les lectures des pages de collection — marque, catégorie — bâties sur le
 * catalogue de `src/lib/api.ts`, sans nouvel endpoint : la réponse filtrée
 * porte déjà tout ce qu'une page montre. UN appel par page, caché et tagué
 * `catalog` comme toute lecture du catalogue.
 */

/** Un seau de facette : clé, libellé traduit par l'API, décompte. Type du contrat. */
export type FacetBucket = Facets['categories'][number];

export type CollectionPage = {
  /** Le seau de la collection : son nom tel que l'API le rend, dans la langue de la page. */
  bucket: FacetBucket;
  /** Le catalogue filtré : total, facettes DU FILTRE, cartes les plus récentes. */
  page: CatalogPage;
};

/** Trois rangées de quatre cartes sur grand écran. */
const RECENT = '12';

/**
 * La page d'une marque : le catalogue filtré `brand=…`, du plus récent au plus
 * ancien. Le nom de la marque est lu dans la facette `brands`, que l'API rend
 * COMPLÈTE même filtrée — pour que le sélecteur du catalogue permette de
 * revenir en arrière. Une clé absente est une marque inconnue : `null`, la
 * page rend 404.
 */
export async function getBrandPage(locale: Locale, brand: string): Promise<CollectionPage | null> {
  const page = await getCatalog(locale, { brand, sort: 'year_desc', per_page: RECENT });
  const bucket = page.facets.brands.find((b) => b.key === brand);

  return bucket && page.meta.total > 0 ? { bucket, page } : null;
}

/** La page d'une catégorie : même mécanique, sur la facette `categories`. */
export async function getCategoryPage(
  locale: Locale,
  category: string,
): Promise<CollectionPage | null> {
  const page = await getCatalog(locale, { category, sort: 'year_desc', per_page: RECENT });
  const bucket = page.facets.categories.find((c) => c.key === category);

  return bucket && page.meta.total > 0 ? { bucket, page } : null;
}
