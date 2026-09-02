import type { MetadataRoute } from 'next';
import { INDEXING_LOCKED, robotsRules } from '@/lib/seo';

/**
 * `/robots.txt`, genere. Un fichier statique `public/robots.txt` ne peut pas
 * coexister avec cette route — et il ne connaissait pas le verrou.
 *
 * Tant que `INDEXING_LOCKED` est pose : `User-Agent: *` / `Disallow: /`, sans
 * ligne `Sitemap:` — le contenu de l'ancien fichier (Next ecrit `User-Agent`
 * avec sa capitale ; la casse d'un champ est libre, RFC 9309). A la levee, la
 * politique cible s'applique d'elle-meme : voir `robotsRules`.
 */
export default function robots(): MetadataRoute.Robots {
  return robotsRules(INDEXING_LOCKED);
}
