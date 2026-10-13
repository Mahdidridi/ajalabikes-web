import type { GalleryAnnotation } from '@/components/BikeGallery';
import type { HotspotImage, Locale } from '@/lib/api';
import type { Media } from '@/lib/images';
import { AnnotatedPhoto, type AnnotatedLabel } from './AnnotatedPhoto';
import { handFontsClassName, handLatinFace } from './fonts';
import { SCENE } from './scene';

/**
 * Libellés d'interface de la photo annotée. Ils ne décrivent aucune donnée : noms des pièces, parties et explications
 * arrivent de l'API, déjà traduits.
 */
const COPY = {
  'ar-sa': {
    toggle: 'الشروح',
    close: 'إغلاق',
    point: 'النقطة',
    unavailable: 'الصورة غير متاحة',
    hint: 'المس رقمًا لترى القطعة.',
  },
  'en-sa': {
    toggle: 'Annotations',
    close: 'Close',
    point: 'Point',
    unavailable: 'Photo unavailable',
    hint: 'Tap a number to see the part.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/**
 * La photo de tête annotée, prête pour la galerie — ou `undefined`, et la fiche garde sa photo ordinaire, à sa largeur
 * ordinaire (web #52, décisions du fondateur du 11 et du 12 octobre 2026 : les notes dessinées du pilote sur la photo de
 * tête de chaque fiche, mises en ligne marque par marque — c'est l'API qui décide quels vélos en ont).
 *
 * Pas de notes si l'API n'en sert pas (`hotspot_image` nul, ou absent d'une API antérieure à web #52), si elles ne
 * portent pas sur la photo de tête, si leur scène n'est pas celle que le composant dessine, ou sans aucun point : jamais
 * une note placée sur une autre photo ou dans une autre scène. Rendue ICI, côté serveur, et passée en slot à la galerie :
 * les libellés de chaque point sont composés avant la frontière du composant client, qui ne compose aucun texte.
 */
export function headAnnotation({
  name,
  head,
  hotspots,
  locale,
}: {
  name: string;
  head: Media | undefined;
  hotspots: HotspotImage | null | undefined;
  locale: Locale;
}): GalleryAnnotation | undefined {
  if (!head || !hotspots || hotspots.media_id !== head.id || hotspots.scene !== SCENE || hotspots.points.length === 0) {
    return undefined;
  }

  const { point, ...copy } = COPY[locale];
  const labels: AnnotatedLabel[] = hotspots.points.map((p) => {
    const announce = p.main === null ? p.part : `${p.part} — ${p.main}`;
    return { dot: `${point} ${p.n} : ${announce}`, announce };
  });

  return {
    imageId: head.id,
    photo: (
      <AnnotatedPhoto
        name={name}
        image={head}
        hotspots={hotspots}
        locale={locale}
        copy={copy}
        labels={labels}
        fonts={{ className: handFontsClassName, latinFace: handLatinFace }}
      />
    ),
  };
}
