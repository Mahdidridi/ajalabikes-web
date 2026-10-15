import Link from 'next/link';
import { Suspense } from 'react';
import type { Locale } from '@/lib/api';
import { BrandLogo } from './BrandLogo';
import { LangSwitch } from './LangSwitch';
import { ThemeToggle } from './ThemeToggle';

/**
 * La barre de navigation, présente sur toutes les pages : marque, Vélos,
 * Comparer, Bikefinder, langue, thème. Trois liens — pas de menu hamburger.
 * RTL natif : `ms-auto` et l'ordre du flux suffisent, rien n'est « retourné ».
 *
 * Sous 380 px, les espacements se resserrent ; si la place manque encore, la
 * barre passe à la ligne : langue et thème descendent sous les liens, toujours en
 * bout de ligne. Mesuré le 11 octobre 2026 : en anglais, elle débordait de 33 px à
 * 320 px et la page défilait en largeur. Une ligne dès 360 px, deux en dessous.
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
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 max-[379px]:gap-x-3 sm:px-6">
        {/*
         * La marque : le nom arabe EST la marque, l'alphabet latin l'accompagne.
         * Depuis le 15 octobre 2026, le nom arabe est le logo dessiné (`BrandLogo`) ;
         * son texte alternatif garde au lien le même nom accessible qu'avant.
         * Sur téléphone la nav n'a pas la place des deux : « Darraja Bikes » passe
         * en sr-only — le logo seul reste à l'écran, le nom complet reste lu par
         * les lecteurs d'écran et par Playwright. 20 px de haut sur téléphone :
         * à 360 px, en anglais, il restait 15 px de marge à la barre pour tenir
         * sur une ligne (mesuré le 15 octobre 2026) ; 32 px dès `sm`.
         */}
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <BrandLogo
            shape="wordmark"
            alt="درّاجة"
            lang="ar"
            sizes="(min-width: 640px) 77px, 48px"
            className="h-5 w-auto sm:h-8"
          />
          <span className="max-sm:sr-only text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Darraja Bikes
          </span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium max-[379px]:gap-3">
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
