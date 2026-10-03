'use client';

import { useParams } from 'next/navigation';
import { ErrorContent } from '@/components/ErrorContent';
import { isLocale } from '@/lib/api';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const locale = useParams<{ locale: string }>()?.locale;
  if (!locale || !isLocale(locale)) return null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <ErrorContent locale={locale} retry={retry} />
    </main>
  );
}
