import type { MetadataRoute } from 'next';
import { INDEXING_LOCKED } from '@/lib/seo';
import { loadSitemapData, NO_DATA, sitemapEntries } from '@/lib/sitemap';

/**
 * `/sitemap.xml` — un seul fichier : ~1 300 URL pour 634 fiches en deux
 * locales, loin des 50 000 d'un fichier.
 *
 * Tant que le verrou est pose, la liste est VIDE et l'API n'est pas appelee.
 * Deverrouille : rendu une fois, re-rendu sur le tag `catalog` porte par
 * `getCatalog`, 24 h de filet — le meme schema que les pages.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = INDEXING_LOCKED ? NO_DATA : await loadSitemapData();

  return sitemapEntries(INDEXING_LOCKED, data);
}
