import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BikeCard } from '@/components/BikeCard';
import { getCatalog, isLocale, type Locale } from '@/lib/api';

/**
 * L'accueil : l'entrée vers le catalogue, pas une vitrine promotionnelle.
 * Structure de 99 Spokes — la recherche en avant — avec notre habillage.
 *
 * Il n'y a PAS de recherche plein texte : l'API n'en expose pas. Un champ qui
 * ignorerait ce qu'on y tape serait un mensonge ; l'accroche est donc faite de
 * LIENS — le catalogue entier, une marque, une catégorie — qui mènent tous à
 * un résultat réel, pré-filtré par l'API.
 *
 * UN SEUL appel : la réponse du catalogue porte à la fois le total, les
 * facettes (marques et catégories avec leurs décomptes) et les cartes de
 * l'aperçu. Aucun chiffre de cette page n'est écrit en dur.
 */
const COPY = {
  'ar-sa': {
    title: 'اعثر على دراجتك القادمة',
    subtitle: 'مواصفات وهندسة وأسعار الدراجات من ماركات متعددة، في مكان واحد.',
    browse: 'تصفح',
    results: 'دراجة',
    compare: 'قارن الدراجات',
    brands: 'الماركات',
    categories: 'تصفح حسب الفئة',
    newest: 'أحدث الموديلات',
    viewAll: 'عرض الكل',
    what: 'ما تقدمه المنصة',
    args: [
      {
        title: 'كتالوج متعدد الماركات',
        text: 'مواصفات كاملة لدراجات من ماركات عالمية، في مكان واحد.',
      },
      {
        title: 'هندسة قابلة للمقارنة',
        text: 'قياسات موحّدة بالمليمتر، تُقارن مقاسًا بمقاس.',
      },
      {
        title: 'أسعار الخليج',
        text: 'الأسعار المحلية من الموزعين المعتمدين فقط.',
      },
    ],
  },
  'en-sa': {
    title: 'Find your next bike',
    subtitle: 'Bike specs, geometry and prices from multiple brands, in one place.',
    browse: 'Browse',
    results: 'bikes',
    compare: 'Compare bikes',
    brands: 'Brands',
    categories: 'Browse by category',
    newest: 'Newest models',
    viewAll: 'View all',
    what: 'What the platform does',
    args: [
      {
        title: 'Multi-brand catalogue',
        text: 'Full specifications for bikes from global brands, in one place.',
      },
      {
        title: 'Comparable geometry',
        text: 'Measurements normalised to millimetres, compared size by size.',
      },
      {
        title: 'Gulf pricing',
        text: 'Local prices from authorised retailers only.',
      },
    ],
  },
} as const;

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // `year_desc` est un tri de l'API, pas un choix éditorial : l'aperçu montre
  // les mêmes vélos que « Voir tout », qui rouvre ce tri dans le catalogue.
  const page = await getCatalog(locale, { per_page: '4', sort: 'year_desc' });
  const t = COPY[locale as Locale];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 pb-16 sm:gap-16 sm:px-6">
      <section className="flex flex-col items-center gap-5 pt-14 text-center sm:pt-24">
        <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          {t.title}
        </h1>
        <p className="max-w-xl text-balance text-muted">{t.subtitle}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}/bikes`}
            className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            {/* Le total vient de l'API — jamais écrit en dur. */}
            {t.browse} {page.meta.total} {t.results}
          </Link>
          <Link
            href={`/${locale}/compare`}
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium transition hover:border-foreground"
          >
            {t.compare}
          </Link>
        </div>

        {/* Les exemples de requêtes : les marques, avec leurs décomptes. */}
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <li className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            {t.brands}
          </li>
          {page.facets.brands.map((b) => (
            <li key={b.key}>
              <Link
                href={`/${locale}/bikes?brand=${b.key}`}
                className="flex items-baseline gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition hover:border-foreground"
              >
                {b.label}
                <span className="font-mono text-xs text-muted">{b.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-tight">{t.categories}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {page.facets.categories.map((c) => (
            <li key={c.key} className="contents">
              <Link
                href={`/${locale}/bikes?category=${c.key}`}
                className="flex flex-col gap-0.5 rounded-lg border border-border p-3 transition hover:border-foreground"
              >
                <span className="text-sm font-semibold">{c.label}</span>
                <span className="font-mono text-xs text-muted">
                  {c.count} {t.results}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">{t.newest}</h2>
          <Link
            href={`/${locale}/bikes?sort=year_desc`}
            className="text-sm font-medium text-muted transition hover:text-foreground"
          >
            {t.viewAll}
          </Link>
        </header>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {page.data.map((bike) => (
            <li key={`${bike.brand.slug}/${bike.slug}`} className="contents">
              <BikeCard bike={bike} locale={locale} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6 border-t border-border pt-10">
        <h2 className="text-xl font-bold tracking-tight">{t.what}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {t.args.map((a) => (
            <div key={a.title} className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">{a.title}</h3>
              <p className="text-sm text-muted">{a.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
