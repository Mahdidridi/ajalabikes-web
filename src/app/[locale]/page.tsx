import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeBrands } from '@/components/home/HomeBrands';
import { HomeCategories } from '@/components/home/HomeCategories';
import { HomeFinderCta } from '@/components/home/HomeFinderCta';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeNewest } from '@/components/home/HomeNewest';
import { HomePillars } from '@/components/home/HomePillars';
import { HomeStats } from '@/components/home/HomeStats';
import { JsonLd } from '@/components/JsonLd';
import { getCatalog, isLocale } from '@/lib/api';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { seoFor } from '@/lib/seo';

/**
 * L'accueil : l'entrée vers le catalogue, pas une vitrine promotionnelle.
 * Structure de 99 Spokes — l'exploration en avant — avec notre habillage,
 * bâti sur des blocs Tailwind Plus (Marketing) adaptés en composants du
 * projet, sous `src/components/home/`.
 *
 * Il n'y a PAS de recherche plein texte : l'API n'en expose pas. Un champ qui
 * ignorerait ce qu'on y tape serait un mensonge ; l'accroche est donc faite de
 * LIENS — le catalogue entier, une marque, une catégorie, le bikefinder — qui
 * mènent tous à un résultat réel, pré-filtré par l'API.
 *
 * UN SEUL appel : la réponse du catalogue porte à la fois le total, les
 * facettes (marques, catégories, tailles de roues, avec leurs décomptes) et
 * les cartes de l'aperçu. Aucun chiffre de cette page n'est écrit en dur, et
 * rien n'y est inventé : ni avis, ni témoignage, ni statistique.
 */
export const revalidate = 86400; // Re-rendue sur le tag `catalog`, 24 h de filet — voir CLAUDE.md, « Cache ».

/** Le titre de l'accueil est le nom du site seul ; la description, la signature. */
export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return seoFor({ locale, path: '' });
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // `year_desc` est un tri de l'API, pas un choix éditorial : l'aperçu montre
  // les mêmes vélos que « Voir tout », qui rouvre ce tri dans le catalogue.
  const page = await getCatalog(locale, { per_page: '4', sort: 'year_desc' });

  return (
    <main className="flex w-full flex-col">
      {/* Le site et son éditeur, pour Google : un bloc chacun, dans la langue de la page. */}
      <JsonLd data={websiteJsonLd(locale)} />
      <JsonLd data={organizationJsonLd()} />
      <HomeHero locale={locale} total={page.meta.total} />
      <HomeBrands locale={locale} brands={page.facets.brands} />
      <HomeCategories locale={locale} categories={page.facets.categories} />
      <HomeNewest locale={locale} bikes={page.data} />
      <HomePillars locale={locale} />
      <HomeStats locale={locale} total={page.meta.total} facets={page.facets} />
      <HomeFinderCta locale={locale} />
    </main>
  );
}
