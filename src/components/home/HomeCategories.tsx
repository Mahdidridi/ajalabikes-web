import Link from 'next/link';
import type { Facets, Locale } from '@/lib/api';
import { catalogPath, categoryPath, hasCategoryPage } from '@/lib/routes';

/**
 * Les tuiles de catégories : libellés ET décomptes viennent des facettes de
 * l'API, déjà traduits. Chaque tuile ouvre la page de sa catégorie
 * (`/{slug}`, table de `routes.ts`) — sauf le seau « non catégorisé », qui
 * n'en a pas et garde le catalogue filtré : un résultat réel, jamais une
 * page vide.
 */
const COPY = {
  'ar-sa': { title: 'تصفح حسب الفئة', results: 'دراجة' },
  'en-sa': { title: 'Browse by category', results: 'bikes' },
} as const;

export function HomeCategories({
  locale,
  categories,
}: {
  locale: Locale;
  categories: Facets['categories'];
}) {
  const t = COPY[locale];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="text-xl font-bold sm:text-2xl ltr:tracking-tight">{t.title}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <li key={c.key} className="contents">
            <Link
              href={
                hasCategoryPage(c.key)
                  ? categoryPath(locale, c.key)
                  : catalogPath(locale, { category: c.key })
              }
              className="flex flex-col gap-0.5 rounded-xl border border-border p-4 transition hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
  );
}
