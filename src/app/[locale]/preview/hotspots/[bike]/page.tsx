import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BuildDetails } from '@/components/BuildDetails';
import { AccentPicker } from '@/components/hotspots/AccentPicker';
import { AnnotatedPhoto } from '@/components/hotspots/AnnotatedPhoto';
import { handFontsClassName } from '@/components/hotspots/fonts';
import { getBuild, isLocale } from '@/lib/api';
import { PILOT_COPY, pilotBike, pilotFor } from '@/lib/hotspot-pilot';

/**
 * Aperçu du pilote de hotspots éditoriaux (web #49, étape 1 — décisions du fondateur du
 * 10 octobre 2026) : les cinq fiches pilotes dans la vraie fiche de l'application.
 *
 * Fermé par défaut : sans `BIKE_HOTSPOT_PREVIEW=1`, 404 avant toute lecture de paramètre ou de
 * l'API. Jamais indexé (`robots` ici, en plus du layout et de `X-Robots-Tag`), jamais lié. Les fiches
 * publiques ne passent pas par ici.
 *
 * Décision du fondateur du 11 octobre 2026 : l'aperçu est EN LIGNE (drapeau posé dans le `.env` de
 * production) pour qu'il le voie sur son téléphone — liens non publiés, fiches publiques inchangées.
 * Retirer le drapeau le referme (404) sans redéployer le code.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hotspots pilot preview',
  robots: { index: false, follow: false },
};

type Props = PageProps<'/[locale]/preview/hotspots/[bike]'>;

export default async function HotspotPilotPreview({ params }: Props) {
  if (process.env.BIKE_HOTSPOT_PREVIEW !== '1') notFound();

  const { locale, bike: key } = await params;
  if (!isLocale(locale)) notFound();

  const bike = pilotBike(key);
  if (!bike) notFound();

  const build = await getBuild(locale, bike.brand, bike.slug);
  if (!build) notFound();

  // Une photo ou une identité qui ne correspond plus au pilote : fiche ordinaire, sans aucun point.
  // La composition est rendue ICI et passée à la galerie : seule cette route importe le composant.
  const annotated = pilotFor(build, key)
    ? {
        imageId: bike.media.id,
        photo: (
          <AnnotatedPhoto
            image={build.images[0]}
            config={{ bike, locale, copy: PILOT_COPY[locale], fontClassName: handFontsClassName }}
          />
        ),
      }
    : undefined;

  return (
    <>
      {annotated && <AccentPicker category={bike.category} locale={locale} />}
      <BuildDetails build={build} locale={locale} annotated={annotated} />
    </>
  );
}
