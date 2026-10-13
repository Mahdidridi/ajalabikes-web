'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { sizeCatalogue, type Media } from '@/lib/images';

/** La composition annotée qui remplace la photo `imageId` : les notes dessinées de la photo de tête (web #52). */
export type GalleryAnnotation = { imageId: number; photo: ReactNode };

type Labels = {
  /** Libelle du groupe de vignettes, pour les lecteurs d'ecran. */
  thumbnails: string;
  /**
   * Un libelle DEJA compose par photo, dans l'ordre des images.
   *
   * Une fonction ne franchit pas la frontiere serveur/client : React refuse de
   * la serialiser et la page rend un 500. Ce composant ne compose donc aucun
   * texte — il affiche ce qu'on lui donne, comme le reste du front.
   */
  photoLabels: string[];
};

/**
 * La galerie de la fiche velo : une grande photo, des vignettes sous elle.
 *
 * Composant CLIENT parce qu'il change d'image au clic. Tout le reste de la
 * fiche reste rendu sur le serveur.
 *
 * L'ordre vient de l'API — l'image de tete est la premiere. Le front ne trie
 * pas : ce serait une seconde regle a maintenir en face de celle de Laravel.
 *
 * `annotated` (notes dessinees de la photo de tete, web #52) : la photo de tete est annotee si, et
 * seulement si, c'est la photo exacte que les notes decrivent ; toute autre vue reste une photo
 * ordinaire, sans aucun point. La composition arrive DEJA rendue par la page (`headAnnotation`) :
 * la galerie n'importe pas son composant, dont le code ne part qu'avec une fiche annotee
 * (relecture du 10 octobre 2026).
 */
export function BikeGallery({
  images,
  labels,
  annotated,
}: {
  images: Media[];
  labels: Labels;
  annotated?: GalleryAnnotation;
}) {
  const [actif, setActif] = useState(0);

  // Une image absente ne casse pas la page.
  if (images.length === 0) return null;

  const image = images[Math.min(actif, images.length - 1)];
  const grande = image.sizes.detail;
  const annotee = annotated && actif === 0 && image.id === annotated.imageId;

  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-hidden border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {annotee ? (
          annotated.photo
        ) : (
        <Image
          // Le catalogue des quatre tailles, lu par le loader. Il ne fabrique
          // aucune URL : il choisit parmi celles que l'API a fournies.
          src={sizeCatalogue(image)}
          alt={image.alt}
          // Largeur et hauteur VIENNENT DE L'API. C'est ce qui reserve la place
          // avant le chargement : sans elles, la page se decale sous les yeux.
          width={grande.w}
          height={grande.h}
          className="h-auto w-full object-contain"
          // La photo de tete est le plus grand element au-dessus de la ligne de
          // flottaison : la charger en differe repousserait le LCP.
          priority
        />
        )}
      </div>

      {images.length > 1 && (
        <ul
          // Une bande qui defile, jamais un retour a la ligne. Sur un telephone
          // quatre vignettes de 85 px depassent la largeur utile et se
          // repliaient sur plusieurs rangees, cassant l'ordre de lecture.
          className="flex snap-x gap-2 overflow-x-auto pb-1"
          aria-label={labels.thumbnails}
        >
          {images.map((vignette, rang) => {
            const petite = vignette.sizes.thumb;
            const choisie = rang === actif;

            return (
              <li key={vignette.id} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setActif(rang)}
                  aria-current={choisie}
                  aria-label={labels.photoLabels[rang]}
                  className={`block overflow-hidden border-2 bg-white transition dark:bg-neutral-900 ${
                    choisie
                      ? 'border-neutral-900 dark:border-neutral-100'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={sizeCatalogue(vignette)}
                    alt=""
                    width={petite.w}
                    height={petite.h}
                    className="h-16 w-auto object-contain"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {image.attribution && (
        // L'attribution accompagne la photo. Discrete, jamais absente.
        <figcaption className="font-mono text-[11px] opacity-75">© {image.attribution}</figcaption>
      )}
    </figure>
  );
}
