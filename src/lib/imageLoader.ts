'use client';

import type { CatalogueEntry } from '@/lib/images';

/**
 * Loader `next/image` du projet.
 *
 * Les conversions sont deja generees par Laravel et servies par le CDN. Sans
 * ce loader, `next/image` les REOPTIMISERAIT : chaque photo repasserait par
 * `/_next/image`, doublant le cout et la latence pour un resultat identique.
 *
 * Le loader ne CONSTRUIT aucune URL. Il choisit, parmi les quatre que l'API a
 * fournies, la premiere assez large pour l'affichage demande. Fabriquer une URL
 * ici reviendrait a deviner un schema de nommage cote front, et a le casser le
 * jour ou le CDN change — la regle du projet l'interdit.
 *
 * Next appelle ce loader une fois par entree du `srcset`. Sans attribut
 * `sizes`, il en demande deux : la largeur nominale et son double. C'est
 * exactement `detail` et `detail_2x`.
 */
export default function ajalaImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
}): string {
  let catalogue: CatalogueEntry[];

  try {
    catalogue = JSON.parse(src) as CatalogueEntry[];
  } catch {
    // Une URL simple passe telle quelle : un logo ou une illustration statique
    // n'a pas de catalogue de tailles et ne doit pas faire echouer le rendu.
    return src;
  }

  if (!Array.isArray(catalogue) || catalogue.length === 0) return src;

  return (catalogue.find((taille) => taille.w >= width) ?? catalogue[catalogue.length - 1]).url;
}
