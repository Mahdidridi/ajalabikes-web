import Link from 'next/link';
import { direction, type Locale } from '@/lib/api';
import { catalogPath } from '@/lib/routes';

const COPY = {
  'ar-sa': {
    missing: 'الصفحة غير موجودة',
    missingMessage: 'لم نعثر على الصفحة التي تبحث عنها.',
    error: 'تعذّر تحميل الصفحة',
    errorMessage: 'حدث خطأ مؤقت. يرجى المحاولة مرة أخرى.',
    home: 'الصفحة الرئيسية',
    catalog: 'تصفح الدراجات',
    retry: 'إعادة المحاولة',
  },
  'en-sa': {
    missing: 'Page not found',
    missingMessage: 'We could not find the page you are looking for.',
    error: 'Unable to load this page',
    errorMessage: 'Something went wrong. Please try again.',
    home: 'Home',
    catalog: 'Browse bikes',
    retry: 'Try again',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export function ErrorContent({ locale, retry }: { locale: Locale; retry?: () => void }) {
  const t = COPY[locale];

  return (
    <section lang={locale.split('-')[0]} dir={direction(locale)} className="w-full max-w-xl">
      {!retry && <p className="mb-4 font-mono text-sm font-semibold text-accent">404</p>}
      <h1 className="text-3xl font-bold text-balance">{retry ? t.error : t.missing}</h1>
      <p className="mt-4 text-base/7 text-muted">{retry ? t.errorMessage : t.missingMessage}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-6 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t.retry}
        </button>
      )}
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
        <Link href={`/${locale}`} className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          {t.home}
        </Link>
        <Link href={catalogPath(locale)} className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          {t.catalog}
        </Link>
      </div>
    </section>
  );
}
