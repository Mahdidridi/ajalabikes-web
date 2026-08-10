import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { direction, isLocale, LOCALES } from '@/lib/api';
import '../globals.css';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] });

// Geist ne couvre pas l'arabe. Sans cette police, le texte arabe tomberait sur
// une substitution systeme differente d'une machine a l'autre.
const notoArabic = Noto_Sans_Arabic({ variable: '--font-arabic', subsets: ['arabic'] });

export const metadata: Metadata = {
  title: 'Ajala',
  description: 'منصة عربية لاكتشاف الدراجات ومقارنتها',
};

/** Les deux locales servies sont prerendues. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Layout racine, place sous le segment de locale : la direction du document
 * depend de la langue, elle ne peut donc pas etre fixee plus haut.
 */
export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale.split('-')[0]}
      dir={direction(locale)}
      className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
