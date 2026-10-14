import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BuildDetails } from '@/components/BuildDetails';
import { headAnnotation } from '@/components/hotspots/annotation';
import { getBuild, getGeometryGlossary, getSimilarBuilds, isLocale } from '@/lib/api';
import { bikeDescription, bikeTitle, seoFor } from '@/lib/seo';

/**
 * Rendue au premier appel, puis servie du cache : le tag `build:…` porte par
 * `getBuild` la fait re-rendre quand l'API le demande, les 24 h sont un filet.
 * `generateStaticParams` vide : aucune fiche n'est rendue au build, mais sans
 * lui Next rendrait la route a CHAQUE requete (doc `generate-static-params`,
 * « All paths at runtime »).
 */
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = PageProps<'/[locale]/bikes/[brand]/[slug]'>;

/**
 * Resout la fiche de l'URL, ou rend 404 — partage par la page et ses
 * metadonnees : Next memoise `getBuild` au sein d'un rendu, l'API n'est
 * interrogee qu'une fois.
 *
 * UNE FICHE, UNE URL. Si l'API repond avec d'autres slugs que ceux demandes
 * — un ancien slug qu'elle resout par sa table `slug_redirects`, une fusion —,
 * la fiche a demenage : redirection PERMANENTE vers l'adresse vivante (308
 * chez Next), plutot que la meme fiche servie a deux adresses. Un slug que
 * l'API ne connait pas reste un 404, comme avant.
 */
async function resolve(params: Props['params']) {
  const { locale, brand, slug } = await params;
  if (!isLocale(locale)) notFound();

  const build = await getBuild(locale, brand, slug);
  if (!build) notFound();

  if (build.brand.slug !== brand || build.slug !== slug) {
    permanentRedirect(`/${locale}/bikes/${build.brand.slug}/${build.slug}`);
  }

  return { locale, build };
}

/**
 * Le canonical suit les slugs que l'API renvoie — apres `resolve`, ce sont
 * aussi ceux de l'URL. Titre et description sont propres a la fiche, batis
 * sur ses champs : 634 fiches, 634 descriptions, jamais la signature.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, build } = await resolve(params);

  return seoFor({
    locale,
    path: `/bikes/${build.brand.slug}/${build.slug}`,
    title: bikeTitle(build),
    description: bikeDescription(locale, build),
  });
}

/**
 * Les vélos proches de la fiche (web #35). Hors de `resolve()` : ni `generateMetadata` ni le JSON-LD n'en dépendent.
 * Ne rejette jamais — `getSimilarBuilds` rend `null` sur toute panne : la fiche ne tombe pas à cause d'un bloc secondaire.
 */
async function similarFor(params: Props['params']) {
  const { locale, brand, slug } = await params;
  return isLocale(locale) ? getSimilarBuilds(locale, brand, slug) : null;
}

/**
 * Le glossaire des cotes (api #41), pour les explications « ? » du bloc Géométrie (web #66). Même doctrine que les
 * vélos proches : une panne du glossaire donne `null` et une fiche sans boutons « ? », jamais une fiche en erreur.
 * `getGeometryGlossary` lève sur toute erreur autre qu'un 404 — c'est ici qu'on l'attrape.
 */
async function glossaryFor(params: Props['params']) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  try {
    return await getGeometryGlossary(locale);
  } catch (error) {
    console.error(`[fiche] glossaire indisponible (${locale}) :`, error instanceof Error ? error.message : error);

    return null;
  }
}

/**
 * Le corps de la fiche vit dans `BuildDetails`. La photo de tête porte ses notes dessinées quand
 * l'API les sert (web #52) ; sinon, la galerie ordinaire.
 */
export default async function BuildPage({ params }: Props) {
  // Les trois lectures partent avant le premier `await` sur une réponse : les blocs ne retardent pas la fiche.
  const similar = similarFor(params);
  const glossary = glossaryFor(params);
  const { locale, build } = await resolve(params);
  const annotated = headAnnotation({
    name: `${build.brand.slug}/${build.slug}`,
    head: build.images[0],
    hotspots: build.hotspot_image,
    locale,
  });

  return (
    <BuildDetails build={build} locale={locale} annotated={annotated} similar={await similar} glossary={await glossary} />
  );
}
