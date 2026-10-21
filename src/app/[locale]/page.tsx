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
import { getBuild, getCatalog, isLocale, type Locale } from '@/lib/api';
import { ACTIVE_HERO_PAIR, HERO_PAIRS, heroPair } from '@/lib/home-hero';
import type { Media } from '@/lib/images';
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
 * UN SEUL appel pour le contenu : la réponse du catalogue porte à la fois le
 * total, les facettes (marques, catégories, tailles de roues, avec leurs
 * décomptes) et les cartes de l'aperçu. Aucun chiffre de cette page n'est
 * écrit en dur, et rien n'y est inventé : ni avis, ni témoignage, ni
 * statistique.
 *
 * Deux lectures de plus, SECONDAIRES : les fiches des deux vélos du hero
 * (`getBuild`, tag `build:{marque}:{slug}` — la page se re-rend quand l'un
 * d'eux change), pour leurs photos et leurs crédits. L'accueil ne tombe jamais
 * à cause d'elles : sans les deux photos, le hero d'avant.
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
  const pairEntry = HERO_PAIRS.find((p) => p.key === ACTIVE_HERO_PAIR)!;
  const [page, leftPhotos, rightPhotos] = await Promise.all([
    getCatalog(locale, { per_page: '3', sort: 'year_desc' }),
    heroPhotos(locale, pairEntry.bikes[0].bike),
    heroPhotos(locale, pairEntry.bikes[1].bike),
  ]);
  const pair = heroPair(pairEntry, [leftPhotos, rightPhotos]);

  return (
    <main className="flex w-full flex-col">
      {/* Le site et son éditeur, pour Google : un bloc chacun, dans la langue de la page. */}
      <JsonLd data={websiteJsonLd(locale)} />
      <JsonLd data={organizationJsonLd()} />
      <HomeHero locale={locale} total={page.meta.total} pair={pair} />
      <HomeBrands locale={locale} brands={page.facets.brands} />
      <HomeCategories locale={locale} categories={page.facets.categories} />
      <HomeNewest locale={locale} bikes={page.data} />
      <HomePillars locale={locale} />
      <HomeStats locale={locale} total={page.meta.total} facets={page.facets} />
      <HomeFinderCta locale={locale} />
    </main>
  );
}

/** Les photos d'un vélo du hero, ou `null` : un vélo absent, une erreur ou une panne de l'API ne font jamais tomber l'accueil. */
async function heroPhotos(locale: Locale, key: string): Promise<Media[] | null> {
  const [brand, slug] = key.split('/');
  try {
    return (await getBuild(locale, brand, slug))?.images ?? null;
  } catch (error) {
    console.error(`[hero] lecture impossible pour ${key}`, error);
    return null;
  }
}
