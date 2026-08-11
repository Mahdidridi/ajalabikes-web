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
  /*
   * NOINDEX SUR TOUT LE SITE, decision du 11 aout 2026.
   *
   * Le catalogue est incomplet et les droits d'image ne sont pas encore
   * accordes : une page indexee aujourd'hui serait vue par Google avant
   * d'etre prete, et une premiere impression de qualite ne se rejoue pas.
   *
   * A RETIRER quand la strategie d'indexation sera decidee — canonical,
   * hreflang, sitemaps et liste blanche des comparaisons. Ne pas le retirer
   * page par page en passant.
   */
  robots: { index: false, follow: false },
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
