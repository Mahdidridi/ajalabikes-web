import Link from 'next/link';
import { Suspense } from 'react';
import type { Locale } from '@/lib/api';
import { LangSwitch } from './LangSwitch';
import { ThemeToggle } from './ThemeToggle';

/**
 * La barre de navigation, présente sur toutes les pages : marque, Vélos,
 * Comparer, langue, thème. Deux liens seulement — pas de menu hamburger.
 * RTL natif : `ms-auto` et l'ordre du flux suffisent, rien n'est « retourné ».
 */
const COPY = {
  'ar-sa': { bikes: 'الدراجات', compare: 'قارن', theme: 'تبديل المظهر', lang: 'English' },
  'en-sa': { bikes: 'Bikes', compare: 'Compare', theme: 'Toggle theme', lang: 'العربية' },
} as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = COPY[locale];

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-5 px-4 py-3 sm:px-6">
        {/* La marque : le nom arabe EST la marque, l'alphabet latin l'accompagne. */}
        <Link href={`/${locale}/bikes`} className="flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-tight">عجلة</span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Ajala</span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href={`/${locale}/bikes`} className="text-muted transition hover:text-foreground">
            {t.bikes}
          </Link>
          <Link href={`/${locale}/compare`} className="text-muted transition hover:text-foreground">
            {t.compare}
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
