import type { Metadata } from 'next';
import { Geist, Noto_Sans_Arabic } from 'next/font/google';
import { BrandLogo } from '@/components/BrandLogo';
import { ErrorContent } from '@/components/ErrorContent';
import { ThemeScript } from '@/components/ThemeScript';
import './globals.css';

const geist = Geist({ variable: '--font-sans', subsets: ['latin'] });
const arabic = Noto_Sans_Arabic({ variable: '--font-arabic', subsets: ['arabic'] });

export const metadata: Metadata = { title: '404 | Darraja Bikes' };

// No locale layout exists for these URLs, so this fallback owns its document.
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className={`${geist.variable} ${arabic.variable} h-full antialiased`} suppressHydrationWarning>
      <head><ThemeScript afterInteractive /></head>
      <body className="min-h-full">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <p className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 font-bold">
            <BrandLogo shape="wordmark" alt="درّاجة" lang="ar" sizes="(min-width: 640px) 77px, 48px" className="h-5 w-auto sm:h-8" />
            <bdi lang="en">Darraja Bikes</bdi>
          </p>
        </header>
        <main className="mx-auto grid w-full max-w-5xl gap-14 px-4 py-16 sm:grid-cols-2 sm:px-6 sm:py-24">
          <ErrorContent locale="ar-sa" />
          <ErrorContent locale="en-sa" />
        </main>
      </body>
    </html>
  );
}
