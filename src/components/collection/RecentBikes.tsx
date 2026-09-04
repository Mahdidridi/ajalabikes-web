import Link from 'next/link';
import { BikeCard } from '@/components/BikeCard';
import { ArrowIcon } from '@/components/home/icons';
import type { BuildCard, Locale } from '@/lib/api';

/**
 * Les vélos les plus récents d'une collection — les MÊMES cartes que le
 * catalogue, dans l'ordre `year_desc` de l'API. Le lien « tous » rouvre ce
 * filtre dans le catalogue : la page ne met en avant aucun vélo que l'API
 * n'ordonne pas elle-même. Même dessin que l'aperçu de l'accueil.
 */
export function RecentBikes({
  locale,
  title,
  bikes,
  viewAll,
}: {
  locale: Locale;
  title: string;
  bikes: BuildCard[];
  viewAll: { label: string; href: string };
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold sm:text-2xl ltr:tracking-tight">{title}</h2>
        <Link
          href={viewAll.href}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {viewAll.label}
          <ArrowIcon className="size-4" />
        </Link>
      </header>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bikes.map((bike) => (
          <li key={`${bike.brand.slug}/${bike.slug}`} className="contents">
            <BikeCard bike={bike} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
