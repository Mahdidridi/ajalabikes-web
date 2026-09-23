import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHotspotsIndex, isLocale, type Locale } from '@/lib/api';

/**
 * Route CACHÉE de laboratoire (décision du 23 septembre 2026) : l'inventaire de
 * l'image à hotspots, pour regarder le résultat vélo par vélo avant de décider
 * de son intégration dans la fiche (web #29).
 *
 * Caché veut dire non lié et non indexé, pas privé : `noindex` explicite et
 * durable ici même (indépendant du verrou global du layout), en-tête
 * `X-Robots-Tag` dans `next.config.ts`, aucun lien depuis le site. Pas de
 * `Disallow` : un crawl interdit empêcherait Google de lire ce `noindex`.
 * Lecture sans cache : l'API locale de la démo n'a pas de webhook vers ce front.
 */
export const dynamic = 'force-dynamic';

const COPY = {
  'ar-sa': { title: 'مختبر — صورة بنقاط', intro: 'دراجة واحدة لكل صورة رأس تم قياسها.', other: 'English' },
  'en-sa': { title: 'Lab — hotspot image', intro: 'One bike per analysed head photo.', other: 'العربية' },
} as const satisfies Record<Locale, Record<string, string>>;

type Props = PageProps<'/[locale]/lab/hotspots'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return { title: COPY[locale].title, robots: { index: false, follow: false } };
}

export default async function HotspotsLabIndex({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const items = await getHotspotsIndex(locale);
  const t = COPY[locale];
  const other: Locale = locale === 'ar-sa' ? 'en-sa' : 'ar-sa';

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <Link className="text-sm underline" href={`/${other}/lab/hotspots`}>
          {t.other}
        </Link>
      </header>
      <p className="text-sm text-muted">{t.intro}</p>
      <ol className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {items.map((item) => (
          <li key={`${item.brand}/${item.slug}`} className="flex items-baseline justify-between gap-4 py-2">
            <Link className="underline" href={`/${locale}/lab/hotspots/${item.brand}/${item.slug}`}>
              <bdi>
                {item.brand} — {item.model_name}
              </bdi>
            </Link>
            <code className="text-xs text-muted">{item.status}</code>
          </li>
        ))}
      </ol>
    </main>
  );
}
