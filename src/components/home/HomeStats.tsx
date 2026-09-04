import type { Facets, Locale } from '@/lib/api';

/**
 * Le catalogue en chiffres. Bloc Tailwind Plus « Simple grid » (Marketing ›
 * Stats), adapté : tuiles sur `surface`, filets par le fond `border` qui
 * affleure entre elles.
 *
 * QUATRE CHIFFRES, TOUS LUS DANS LA RÉPONSE DE L'API : le total du catalogue
 * et la longueur des trois listes de facettes. Aucun n'est écrit en dur, aucun
 * n'est calculé ici — la longueur d'une liste n'est pas un calcul.
 */
const COPY = {
  'ar-sa': {
    title: 'الكتالوج بالأرقام',
    subtitle: 'أرقام حيّة تُقرأ من الكتالوج مباشرةً.',
    bikes: 'الدراجات',
    brands: 'الماركات',
    categories: 'الفئات',
    wheelSizes: 'مقاسات العجلات',
  },
  'en-sa': {
    title: 'The catalogue in numbers',
    subtitle: 'Live figures, read straight from the catalogue.',
    bikes: 'Bikes',
    brands: 'Brands',
    categories: 'Categories',
    wheelSizes: 'Wheel sizes',
  },
} as const;

export function HomeStats({
  locale,
  total,
  facets,
}: {
  locale: Locale;
  total: number;
  facets: Facets;
}) {
  const t = COPY[locale];

  const stats = [
    { label: t.bikes, value: total },
    { label: t.brands, value: facets.brands.length },
    { label: t.categories, value: facets.categories.length },
    { label: t.wheelSizes, value: facets.wheel_sizes.length },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-balance sm:text-4xl ltr:tracking-tight">
          {t.title}
        </h2>
        <p className="mt-3 text-lg/8 text-muted">{t.subtitle}</p>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl bg-border text-center lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col bg-surface p-8">
            <dt className="text-sm/6 font-semibold text-muted">{stat.label}</dt>
            <dd className="order-first text-3xl font-semibold tabular-nums sm:text-4xl ltr:tracking-tight">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
