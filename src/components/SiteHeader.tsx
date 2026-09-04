import Link from 'next/link';
import { Suspense } from 'react';
import type { Locale } from '@/lib/api';
import { LangSwitch } from './LangSwitch';
import { ThemeToggle } from './ThemeToggle';

/**
 * La barre de navigation, présente sur toutes les pages : marque, Vélos,
 * Comparer, Bikefinder, langue, thème. Trois liens — pas de menu hamburger.
 * RTL natif : `ms-auto` et l'ordre du flux suffisent, rien n'est « retourné ».
 */
const COPY = {
  'ar-sa': {
    bikes: 'الدراجات',
    compare: 'قارن',
    finder: 'دليل اختيار الدراجة',
    finderShort: 'الدليل',
    theme: 'تبديل المظهر',
    lang: 'English',
  },
  'en-sa': {
    bikes: 'Bikes',
    compare: 'Compare',
    finder: 'Bike finder',
    finderShort: 'Finder',
    theme: 'Toggle theme',
    lang: 'العربية',
  },
} as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = COPY[locale];

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-5 px-4 py-3 sm:px-6">
        {/*
         * La marque : le nom arabe EST la marque, l'alphabet latin l'accompagne.
         * Sur téléphone la nav n'a pas la place des deux : « Darraja Bikes » passe
         * en sr-only — l'arabe seul reste à l'écran, le nom complet reste lu par
         * les lecteurs d'écran et par Playwright.
         */}
        <Link href={`/${locale}`} className="flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-tight">درّاجة</span>
          <span className="max-sm:sr-only text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Darraja Bikes
          </span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href={`/${locale}/bikes`} className="text-muted transition hover:text-foreground">
            {t.bikes}
          </Link>
          <Link href={`/${locale}/compare`} className="text-muted transition hover:text-foreground">
            {t.compare}
          </Link>
          {/*
           * Le bikefinder porte le nom du pied de page dès `sm`. Sur téléphone
           * (412 px), trois liens, la bascule de langue et « دليل اختيار الدراجة »
           * ne tiennent pas : la forme courte du pilier de l'accueil (« الدليل »,
           * « Finder ») prend le relais. Un seul lien, deux libellés — le nom
           * accessible est toujours celui qui s'affiche.
           */}
          <Link href={`/${locale}/finder`} className="text-muted transition hover:text-foreground">
            <span className="sm:hidden">{t.finderShort}</span>
            <span className="max-sm:hidden">{t.finder}</span>
          </Link>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {/* useSearchParams impose sa frontière de Suspense. */}
          <Suspense fallback={null}>
            <LangSwitch locale={locale} label={t.lang} />
          </Suspense>
          <ThemeToggle label={t.theme} />
        </div>
      </nav>
    </header>
  );
}
