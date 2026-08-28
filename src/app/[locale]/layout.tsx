import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { direction, isLocale, LOCALES, type Locale } from '@/lib/api';
import '../globals.css';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] });

// Geist ne couvre pas l'arabe. Sans cette police, le texte arabe tomberait sur
// une substitution systeme differente d'une machine a l'autre.
const notoArabic = Noto_Sans_Arabic({ variable: '--font-arabic', subsets: ['arabic'] });

/** La signature suit la locale ; c'est la meme que celle du pied de page. */
const SIGNATURE: Record<Locale, string> = {
  'ar-sa': 'منصة عربية لاكتشاف الدراجات ومقارنتها',
  'en-sa': "The Gulf's bike comparison platform",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const description = isLocale(locale) ? SIGNATURE[locale] : SIGNATURE['en-sa'];

  return {
    title: 'Darraja Bikes',
    description,
    openGraph: { siteName: 'Darraja Bikes', title: 'Darraja Bikes', description },
    /*
     * NOINDEX SUR TOUT LE SITE, decision du 11 aout 2026, reaffirmee le 28 aout :
     * aucune indexation ni sitemap tant que les URL ne sont pas figees.
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
}

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
      // `data-theme` est posé par le script ci-dessous avant l'hydratation :
      // React ne doit pas s'alarmer que le serveur ne l'ait pas rendu.
      suppressHydrationWarning
    >
      <head>
        {/*
         * Anti-flash : le thème (choix mémorisé, sinon préférence système) est
         * posé sur <html> AVANT le premier rendu. En différé, une page sombre
         * s'afficherait blanche un instant à chaque navigation.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader locale={locale} />
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
