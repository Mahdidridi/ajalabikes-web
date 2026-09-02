import Link from 'next/link';
import type { Facets, Locale } from '@/lib/api';
import { brandPath } from '@/lib/routes';

/**
 * Les marques du catalogue. Bloc Tailwind Plus « Simple with heading »
 * (Marketing › Logo Clouds) — avec les NOMS en texte : aucun logo n'est
 * publié tant que ses droits ne sont pas documentés (règle Images du projet).
 *
 * Noms et décomptes viennent des facettes de l'API ; chaque marque ouvre SA
 * page (`/bikes/{brand}`). Alphabet latin canonique, comme partout.
 */
const COPY = {
  'ar-sa': { title: 'الماركات في الكتالوج', results: 'دراجة' },
  'en-sa': { title: 'Brands in the catalogue', results: 'bikes' },
} as const;

export function HomeBrands({ locale, brands }: { locale: Locale; brands: Facets['brands'] }) {
  const t = COPY[locale];

  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <h2 className="text-center text-lg/8 font-semibold">{t.title}</h2>
        <ul className="mx-auto mt-8 grid max-w-lg grid-cols-2 items-center gap-x-6 gap-y-4 sm:max-w-xl sm:grid-cols-3 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          {brands.map((b) => (
            <li key={b.key}>
              <Link
                href={brandPath(locale, b.key)}
                className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-3 transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="text-2xl font-extrabold tracking-tight">{b.label}</span>
                <span className="font-mono text-xs text-muted">
                  {b.count} {t.results}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
