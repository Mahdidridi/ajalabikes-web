import Head from 'next/head';
import { ErrorContent } from '@/components/ErrorContent';

// An uncached ISR failure bypasses app/error.tsx. Keep HTTP 500 and ISR intact.
export default function ServerError() {
  const retry = () => window.location.reload();

  return (
    <>
      <Head><title>500 | Darraja Bikes</title></Head>
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <p className="mx-auto flex max-w-5xl flex-wrap items-baseline gap-3 font-bold">
          <span>درّاجة</span><bdi lang="en">Darraja Bikes</bdi>
        </p>
      </header>
      <main className="mx-auto grid w-full max-w-5xl gap-14 px-4 py-16 sm:grid-cols-2 sm:px-6 sm:py-24">
        <ErrorContent locale="ar-sa" retry={retry} />
        <ErrorContent locale="en-sa" retry={retry} />
      </main>
    </>
  );
}
