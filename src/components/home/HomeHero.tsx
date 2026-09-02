import Link from 'next/link';
import type { Locale } from '@/lib/api';
import { bikesCount } from '@/lib/vocabulary';
import { ArrowIcon } from './icons';

/**
 * Le hero. Bloc Tailwind Plus « Simple centered » (Marketing › Hero Sections),
 * adapté : sans sa barre de navigation (elle vit dans `SiteHeader`), halos sur
 * l'accent du site plutôt qu'un dégradé rose-indigo, et positions LOGIQUES —
 * `start-` et `rtl:` — pour que l'arabe soit un miroir, pas un retournement.
 *
 * Le titre est la signature de la marque : la même que les métadonnées et le
 * pied de page — elle ne suit pas le vocabulaire mesuré, le reste du texte
 * si (« سيكل / سياكل », `src/lib/vocabulary.ts`). Le compteur du bouton
 * vient de l'API, jamais écrit en dur. La pastille annonce la seule
 * nouveauté réelle : le bikefinder.
 */
const COPY = {
  'ar-sa': {
    pill: 'جديد: دليل اختيار السيكل',
    pillLink: 'جرّبه',
    title: 'منصة عربية لاكتشاف الدراجات ومقارنتها',
    subtitle:
      'مواصفات كاملة وهندسة موحّدة بالمليمتر من المواقع الرسمية للشركات المصنعة. قارن السياكل جنبًا إلى جنب، مقاسًا بمقاس.',
    browse: 'تصفح',
    compare: 'قارن السياكل',
  },
  'en-sa': {
    pill: 'New: the bike finder',
    pillLink: 'Try it',
    title: "The Gulf's bike comparison platform",
    subtitle:
      'Full specifications and geometry normalised to millimetres, from the manufacturers’ official websites. Compare bikes side by side, size by size.',
    browse: 'Browse',
    compare: 'Compare bikes',
  },
} as const;

/** La forme des halos, telle que livrée par le bloc. */
const HALO =
  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)';

export function HomeHero({ locale, total }: { locale: Locale; total: number }) {
  const t = COPY[locale];

  return (
    <section className="relative isolate overflow-hidden px-4 sm:px-6">
      {/*
       * Deux halos flous, décoratifs, posés sous le contenu (`-z-10` dans le
       * contexte `isolate` de la section). Leurs conteneurs `inset-x-0` +
       * `overflow-hidden` empêchent tout défilement horizontal.
       *
       * Deux écarts au bloc d'origine, tous deux vérifiés par Playwright :
       * la section rogne ses halos (`overflow-hidden`) pour qu'ils ne
       * débordent ni sur la navbar ni sur la bande des marques — une section
       * positionnée se peint PAR-DESSUS ses voisines statiques — et les halos
       * ne captent aucun clic (`pointer-events-none`) : sans cela, le halo du
       * bas interceptait les clics sur les marques, juste sous le hero.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          style={{ clipPath: HALO }}
          className="relative start-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-accent to-accent/40 opacity-25 rtl:translate-x-1/2 rtl:-rotate-30 sm:start-[calc(50%-30rem)] sm:w-288.75"
        />
      </div>

      <div className="mx-auto max-w-2xl py-20 text-center sm:py-28 lg:py-32">
        <div className="mb-8 flex justify-center">
          <p className="relative rounded-full px-3 py-1 text-sm/6 text-muted ring-1 ring-border transition hover:ring-muted">
            {t.pill}{' '}
            <Link href={`/${locale}/finder`} className="font-semibold text-accent">
              {/* Étend la zone cliquable à toute la pastille. */}
              <span aria-hidden="true" className="absolute inset-0" />
              {t.pillLink} <ArrowIcon className="inline size-4 align-[-0.2em]" />
            </Link>
          </p>
        </div>

        <h1 className="text-4xl font-extrabold text-balance sm:text-6xl ltr:tracking-tight">
          {t.title}
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-muted sm:text-xl/8">
          {t.subtitle}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/${locale}/bikes`}
            className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background shadow-xs transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {/* Le total vient de l'API — jamais écrit en dur ; seul son mot s'accorde ici. */}
            {t.browse} {bikesCount(locale, total)}
          </Link>
          <Link
            href={`/${locale}/compare`}
            className="rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold transition hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.compare}
          </Link>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
      >
        <div
          style={{ clipPath: HALO }}
          className="relative start-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-accent to-accent/40 opacity-25 rtl:translate-x-1/2 sm:start-[calc(50%+36rem)] sm:w-288.75"
        />
      </div>
    </section>
  );
}
