import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BuildDetails } from '@/components/BuildDetails';
import { AccentPicker } from '@/components/hotspots/AccentPicker';
import { headAnnotation } from '@/components/hotspots/annotation';
import { getBuild, isLocale } from '@/lib/api';
import { pilotBike, pilotFor, pilotHotspots } from '@/lib/hotspot-pilot';

/**
 * Aperçu du pilote de hotspots éditoriaux (web #49, étape 1 — décisions du fondateur du
 * 10 octobre 2026) : les cinq fiches pilotes dans la vraie fiche de l'application, avec les notes
 * SAISIES du pilote, par le même composant que les notes servies par l'API sur les fiches publiques
 * (web #52). Gardé jusqu'à la comparaison des cinq fiches publiques avec leurs aperçus (phase 4.1).
 *
 * Fermé par défaut : sans `BIKE_HOTSPOT_PREVIEW=1`, 404 avant toute lecture de paramètre ou de
 * l'API. Jamais indexé (`robots` ici, en plus du layout et de `X-Robots-Tag`), jamais lié.
 *
 * Décision du fondateur du 11 octobre 2026 : l'aperçu est EN LIGNE (drapeau posé dans le `.env` de
 * production) pour qu'il le voie sur son téléphone — liens non publiés. Retirer le drapeau le
 * referme (404) sans redéployer le code.
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
  const annotated = pilotFor(build, key)
    ? headAnnotation({ name: bike.key, head: build.images[0], hotspots: pilotHotspots(bike, locale), locale })
    : undefined;

  return (
    <>
      {annotated && <AccentPicker category={bike.category} locale={locale} />}
      <BuildDetails build={build} locale={locale} annotated={annotated} />
    </>
  );
}
