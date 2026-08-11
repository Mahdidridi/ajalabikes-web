import type { components } from '@/types/api';

/** Les types viennent du contrat genere. Ne jamais les redeclarer a la main. */
export type Media = components['schemas']['MediaResource'];
export type ImageSize = components['schemas']['ImageSizeResource'];

type Entree = { url: string; w: number };

/**
 * Encode les quatre tailles d'une image pour le loader `next/image`.
 *
 * POURQUOI passer par `src` plutot que par une URL. Un loader ne recoit que
 * `src` et une largeur : c'est la seule voie que l'API de Next laisse pour lui
 * transmettre des donnees par image. Sans ce catalogue, le loader n'aurait
 * qu'une URL et devrait DEVINER les autres en manipulant la chaine — c'est
 * exactement ce qui est interdit ici : l'API fournit les quatre URL completes,
 * le front n'en fabrique aucune.
 *
 * Trie par largeur croissante : le loader prend la premiere assez grande.
 */
export function sizeCatalogue(media: Media): string {
  const catalogue: Entree[] = Object.values(media.sizes)
    .map(({ url, w }) => ({ url, w }))
    .sort((a, b) => a.w - b.w);

  return JSON.stringify(catalogue);
}

export type { Entree as CatalogueEntry };
