import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BuildDetails } from '@/components/BuildDetails';
import { handFontsClassName } from '@/components/hotspots/fonts';
import { getBuild, isLocale } from '@/lib/api';
import { PILOT_COPY, pilotBike, pilotFor } from '@/lib/hotspot-pilot';

/**
 * Aperçu LOCAL du pilote de hotspots éditoriaux (web #49, étape 1 — décisions du fondateur du
 * 10 octobre 2026) : les cinq fiches pilotes dans la vraie fiche de l'application.
 *
 * Fermé par défaut : sans `BIKE_HOTSPOT_PREVIEW=1`, 404 avant toute lecture de paramètre ou de
 * l'API. Jamais indexé (`robots` ici, en plus du layout et de `X-Robots-Tag`), jamais lié, jamais
 * déployé sans décision distincte du fondateur. Les fiches publiques ne passent pas par ici.
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
    ? { bike, locale, copy: PILOT_COPY[locale], fontClassName: handFontsClassName }
    : undefined;

  return <BuildDetails build={build} locale={locale} annotated={annotated} />;
}
