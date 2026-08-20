import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BikeCard } from '@/components/BikeCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { getCatalog, isLocale, type Locale } from '@/lib/api';

/**
 * Libelles d'interface uniquement. Tout ce qui decrit une donnee — libelles de
 * facettes, montants, millesimes — arrive deja traduit et mis en forme.
 */
const COPY = {
  'ar-sa': {
    title: 'الدراجات',
    results: 'دراجة',
    brand: 'الماركة',
    category: 'الفئة',
    wheelSize: 'مقاس العجلات',
    sort: 'الترتيب',
    reset: 'إزالة الفلاتر',
    empty: 'لا توجد دراجة تطابق هذا الاختيار.',
    more: 'عرض المزيد',
    sortOptions: [
      { value: 'name', label: 'الاسم' },
      { value: 'price_asc', label: 'السعر تصاعديًا' },
      { value: 'price_desc', label: 'السعر تنازليًا' },
      { value: 'year_desc', label: 'الأحدث' },
    ],
  },
  'en-sa': {
    title: 'Bikes',
    results: 'bikes',
    brand: 'Brand',
    category: 'Category',
    wheelSize: 'Wheel size',
    sort: 'Sort',
    reset: 'Clear filters',
    empty: 'No bike matches this selection.',
    more: 'Show more',
    sortOptions: [
      { value: 'name', label: 'Name' },
      { value: 'price_asc', label: 'Price, low to high' },
      { value: 'price_desc', label: 'Price, high to low' },
      { value: 'year_desc', label: 'Newest' },
    ],
  },
} as const;

export default async function CatalogPage({
  params,
  searchParams,
}: PageProps<'/[locale]/bikes'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = await searchParams;
  const plats = Object.fromEntries(
    Object.entries(query).map(([c, v]) => [c, Array.isArray(v) ? v[0] : v]),
  );

  const page = await getCatalog(locale, plats);
  const t = COPY[locale as Locale];

  // « Afficher plus » est CUMULATIF : le lien re-demande la même page avec un
  // per_page accru et le serveur re-rend la liste entière depuis le début. La
  // liste s'allonge, elle n'est jamais remplacée. Le bouton reste un lien :
  // sans JavaScript il fonctionne encore, et l'URL partagée reproduit
  // exactement ce qui était à l'écran. Le curseur de l'API, lui, sert au
  // défilement continu du mobile — un vieux lien qui en porte un est purgé ici.
  const suivante = new URLSearchParams(
    Object.entries(plats).filter(([c, v]) => v !== undefined && c !== 'cursor') as [
      string,
      string,
    ][],
  );
  suivante.set('per_page', String(page.meta.per_page + 24));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.title}</h1>
        {/* Le compteur vient de l'API : il compte TOUS les resultats du
            filtre, pas les cartes de la page courante. */}
        <p className="font-mono text-xs text-muted">
          {page.meta.total} {t.results}
        </p>
      </header>

      <CatalogFilters
        facets={page.facets}
        labels={{
          brand: t.brand,
          category: t.category,
          wheelSize: t.wheelSize,
          sort: t.sort,
          reset: t.reset,
          sortOptions: [...t.sortOptions],
        }}
      />

      {page.data.length === 0 ? (
        <p className="py-16 text-center text-muted">{t.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {page.data.map((bike) => (
            <li key={`${bike.brand.slug}/${bike.slug}`} className="contents">
              <BikeCard bike={bike} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      {page.meta.has_more && (
        // scroll={false} : on reste à sa position de lecture, les nouvelles
        // cartes apparaissent sous celles déjà vues.
        <Link
          href={`/${locale}/bikes?${suivante}`}
          scroll={false}
          className="mx-auto rounded-lg border border-border px-6 py-2 text-sm font-medium hover:border-foreground"
        >
          {t.more}
        </Link>
      )}
    </main>
  );
}
