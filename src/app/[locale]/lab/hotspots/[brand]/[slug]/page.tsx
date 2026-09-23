import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HotspotImage, type HotspotCopy } from '@/components/HotspotImage';
import { getBuildFresh, isLocale, type Locale } from '@/lib/api';

/**
 * La page cachée d'UN vélo : le composant seul, pleine largeur, pour juger le
 * rendu avant l'intégration dans la fiche (web #29). Voir la page d'index pour
 * la posture noindex.
 */
export const dynamic = 'force-dynamic';

const COPY = {
  'ar-sa': {
    back: 'كل الدراجات',
    other: 'English',
    none: 'لا توجد صورة بنقاط لهذه الدراجة بعد.',
    copy: {
      closeLabel: 'إغلاق',
      sizeLabel: 'المقاس',
      showDimensions: 'عرض المقاسات',
      hideDimensions: 'إخفاء المقاسات',
      listMode: 'النقاط',
      imageFailed: 'تعذر تحميل الصورة.',
    },
  },
  'en-sa': {
    back: 'All bikes',
    other: 'العربية',
    none: 'No hotspot image for this bike yet.',
    copy: {
      closeLabel: 'Close',
      sizeLabel: 'Size',
      showDimensions: 'Show dimensions',
      hideDimensions: 'Hide dimensions',
      listMode: 'Points',
      imageFailed: 'The photo could not be loaded.',
    },
  },
} as const satisfies Record<Locale, { back: string; other: string; none: string; copy: HotspotCopy }>;

type Props = PageProps<'/[locale]/lab/hotspots/[brand]/[slug]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, brand, slug } = await params;
  if (!isLocale(locale)) notFound();

  return { title: `Lab — ${brand} ${slug}`, robots: { index: false, follow: false } };
}

export default async function HotspotsLabBuild({ params }: Props) {
  const { locale, brand, slug } = await params;
  if (!isLocale(locale)) notFound();

  const build = await getBuildFresh(locale, brand, slug);
  if (!build) notFound();

  const t = COPY[locale];
  const other: Locale = locale === 'ar-sa' ? 'en-sa' : 'ar-sa';

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link className="text-sm underline" href={`/${locale}/lab/hotspots`}>
            {t.back}
          </Link>
          <h1 className="text-2xl font-semibold">
            <bdi>
              {build.brand.name} {build.model_name}
            </bdi>
          </h1>
        </div>
        <Link className="text-sm underline" href={`/${other}/lab/hotspots/${brand}/${slug}`}>
          {t.other}
        </Link>
      </header>

      {build.hotspot_image === null ? (
        <p className="text-sm text-muted" data-no-hotspots>
          {t.none}
        </p>
      ) : (
        <HotspotImage image={build.hotspot_image} sizes={build.sizes} locale={locale} copy={t.copy} />
      )}
    </main>
  );
}
