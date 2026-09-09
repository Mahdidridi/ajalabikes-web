import Link from 'next/link';
import type { Locale } from '@/lib/api';

/** Erreur attendue de sélection : garder le cadre du site et une sortie sans JS. */
const COPY = {
  'ar-sa': {
    bikes: {
      title: 'تعذّر تطبيق هذا الاختيار',
      message: 'بعض الفلاتر أو خيارات الترتيب في الرابط غير صالحة. أزلها ثم اختر من جديد.',
      reset: 'العودة إلى جميع الدراجات',
    },
    compare: {
      title: 'تعذّرت المقارنة بهذا الاختيار',
      message: 'اختيار الدراجات أو المقاسات في الرابط غير صالح. ابدأ مقارنة جديدة واختر من الخيارات المتاحة.',
      reset: 'بدء مقارنة جديدة',
    },
  },
  'en-sa': {
    bikes: {
      title: 'This selection could not be applied',
      message: 'Some filters or sorting options in this link are invalid. Clear them and choose again.',
      reset: 'Back to all bikes',
    },
    compare: {
      title: 'This selection could not be compared',
      message: 'The bikes or sizes in this link are invalid. Start a new comparison and choose from the available options.',
      reset: 'Start a new comparison',
    },
  },
} as const;

export function InvalidSelection({ locale, context }: { locale: Locale; context: 'bikes' | 'compare' }) {
  const t = COPY[locale][context];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.title}</h1>
      <p role="alert" className="text-muted">{t.message}</p>
      <Link href={`/${locale}/${context}`} className="rounded-lg border border-border px-6 py-2 text-sm font-medium hover:border-foreground">
        {t.reset}
      </Link>
    </main>
  );
}
