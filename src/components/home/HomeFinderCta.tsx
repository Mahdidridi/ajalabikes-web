import Link from 'next/link';
import type { Locale } from '@/lib/api';
import { ArrowIcon } from './icons';

/**
 * L'appel final vers le bikefinder. Bloc Tailwind Plus « Simple justified »
 * (Marketing › CTA Sections), posé dans un panneau `surface` plutôt qu'en
 * bandeau sombre — la retenue chromatique du site : ce sont les vélos qui
 * apportent la couleur.
 */
const COPY = {
  'ar-sa': {
    title: 'لست متأكدًا من السيكل المناسب لك؟',
    line: 'دع دليل الاختيار يرشدك.',
    start: 'ابدأ دليل اختيار السيكل',
    browse: 'أو تصفح الكتالوج',
  },
  'en-sa': {
    title: 'Not sure which bike is right for you?',
    line: 'Let the bike finder narrow it down.',
    start: 'Start the bike finder',
    browse: 'Or browse the catalogue',
  },
} as const;

export function HomeFinderCta({ locale }: { locale: Locale }) {
  const t = COPY[locale];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-24">
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14">
        <h2 className="max-w-2xl text-3xl font-extrabold text-balance sm:text-4xl ltr:tracking-tight">
          {t.title}
          <br />
          {t.line}
        </h2>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 lg:mt-0 lg:shrink-0">
          <Link
            href={`/${locale}/finder`}
            className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-background shadow-xs transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.start}
          </Link>
          <Link
            href={`/${locale}/bikes`}
            className="inline-flex items-center gap-1 rounded-sm text-sm/6 font-semibold transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.browse}
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
