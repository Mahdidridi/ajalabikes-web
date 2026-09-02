import Link from 'next/link';
import { BikeCard } from '@/components/BikeCard';
import type { BuildCard, Locale } from '@/lib/api';
import { ArrowIcon } from './icons';

/**
 * L'aperçu des derniers millésimes — les MÊMES cartes que le catalogue, dans
 * le MÊME ordre : « Voir tout » rouvre exactement ce tri de l'API. L'accueil
 * ne met en avant aucun vélo que l'API n'ordonne pas elle-même.
 */
const COPY = {
  'ar-sa': { title: 'أحدث الموديلات', viewAll: 'عرض الكل' },
  'en-sa': { title: 'Newest models', viewAll: 'View all' },
} as const;

export function HomeNewest({ locale, bikes }: { locale: Locale; bikes: BuildCard[] }) {
  const t = COPY[locale];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold sm:text-2xl ltr:tracking-tight">{t.title}</h2>
        <Link
          href={`/${locale}/bikes?sort=year_desc`}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t.viewAll}
          <ArrowIcon className="size-4" />
        </Link>
      </header>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {bikes.map((bike) => (
          <li key={`${bike.brand.slug}/${bike.slug}`} className="contents">
            <BikeCard bike={bike} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
