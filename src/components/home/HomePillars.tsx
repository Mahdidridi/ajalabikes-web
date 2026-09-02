import Link from 'next/link';
import type { Locale } from '@/lib/api';
import { ArrowIcon, CompareIcon, CompassIcon, SearchIcon } from './icons';

/**
 * Les trois piliers — Découvrir, Comparer, Choisir. Bloc Tailwind Plus
 * « Simple three column with small icons » (Marketing › Feature Sections).
 *
 * Adapté en liste de titres h3 plutôt qu'en `<dl>` : la page garde une
 * hiérarchie de titres réelle. Chaque pilier mène à une page qui existe.
 */
const COPY = {
  'ar-sa': {
    eyebrow: 'كيف تعمل المنصة',
    title: 'اكتشف، قارن، ثم اختر',
    subtitle: 'ثلاث خطوات من التصفح إلى القرار، ببيانات من المواقع الرسمية للشركات المصنعة.',
    discover: {
      title: 'اكتشف',
      text: 'تصفح الكتالوج كاملًا حسب الماركة والفئة ومقاس العجلات، مع المواصفات الكاملة لكل موديل.',
      link: 'تصفح الكتالوج',
    },
    compare: {
      title: 'قارن',
      text: 'ضع الدراجات جنبًا إلى جنب: هندسة موحّدة بالمليمتر، ومكوّنات، وسعر الشركة المصنعة، مقاسًا بمقاس.',
      link: 'قارن الدراجات',
    },
    choose: {
      title: 'اختر مع دليل اختيار الدراجة',
      text: 'أجب عن بضعة أسئلة عن طريقة ركوبك وميزانيتك، واحصل على دراجات مطابقة من الكتالوج.',
      link: 'ابدأ الدليل',
    },
  },
  'en-sa': {
    eyebrow: 'How it works',
    title: 'Discover, compare, then choose',
    subtitle:
      'Three steps from browsing to a decision, with data from the manufacturers’ official websites.',
    discover: {
      title: 'Discover',
      text: 'Browse the whole catalogue by brand, category and wheel size, with full specifications for every model.',
      link: 'Browse the catalogue',
    },
    compare: {
      title: 'Compare',
      text: 'Put bikes side by side: geometry normalised to millimetres, components and manufacturer price, size by size.',
      link: 'Compare bikes',
    },
    choose: {
      title: 'Choose with the bike finder',
      text: 'Answer a few questions about how you ride and what you can spend, and get matching bikes from the catalogue.',
      link: 'Start the bike finder',
    },
  },
} as const;

/** La structure des piliers — destination et pictogramme — hors des libellés. */
const PILLARS = [
  { key: 'discover', path: 'bikes', Icon: SearchIcon },
  { key: 'compare', path: 'compare', Icon: CompareIcon },
  { key: 'choose', path: 'finder', Icon: CompassIcon },
] as const;

export function HomePillars({ locale }: { locale: Locale }) {
  const t = COPY[locale];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl lg:text-center">
        <p className="text-base/7 font-semibold text-accent">{t.eyebrow}</p>
        <h2 className="mt-2 text-3xl font-extrabold text-pretty sm:text-4xl lg:text-balance ltr:tracking-tight">
          {t.title}
        </h2>
        <p className="mt-4 text-lg/8 text-muted">{t.subtitle}</p>
      </div>

      <ul className="mx-auto mt-14 grid max-w-xl grid-cols-1 gap-x-8 gap-y-12 lg:max-w-none lg:grid-cols-3">
        {PILLARS.map(({ key, path, Icon }) => {
          const c = t[key];

          return (
            <li key={key} className="flex flex-col">
              <h3 className="flex items-center gap-x-3 text-base/7 font-semibold">
                <Icon className="size-5 flex-none text-accent" />
                {c.title}
              </h3>
              <p className="mt-3 flex-auto text-base/7 text-muted">{c.text}</p>
              <p className="mt-5">
                <Link
                  href={`/${locale}/${path}`}
                  className="inline-flex items-center gap-1 rounded-sm text-sm/6 font-semibold text-accent transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {c.link}
                  <ArrowIcon className="size-4" />
                </Link>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
