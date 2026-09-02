import type { Build, BuildCard, Locale } from '@/lib/api';
import { absoluteUrl, bikeName, SITE_NAME, SITE_NAME_AR, SITE_URL } from '@/lib/seo';

/**
 * Donnees structurees (schema.org, JSON-LD), assemblees depuis la reponse de
 * l'API sans aucun calcul ni formatage : un champ que l'API ne fournit pas est
 * OMIS, jamais estime. Une langue par page — celle de la locale.
 *
 * Decision 5 du 2 septembre 2026 : `Product` sans `offers` (le MSRP US n'est
 * pas un prix local), jamais d'`aggregateRating` ni de `review`. Sans ces
 * proprietes la fiche n'a pas droit au product snippet de Google — assume.
 */
export type JsonLdObject = {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
};

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** `ar-sa` → `ar` : la langue seule, forme attendue par `inLanguage`. */
const language = (locale: Locale) => locale.split('-')[0];

/** Libelles du fil d'Ariane — les seuls textes de ce module qui ne viennent pas de l'API. */
const TRAIL_COPY = {
  'ar-sa': { home: 'الرئيسية', bikes: 'الدراجات' },
  'en-sa': { home: 'Home', bikes: 'Bikes' },
} as const satisfies Record<Locale, { home: string; bikes: string }>;

/**
 * L'editeur du site. Ni `logo` (aucune image de logo aux dimensions requises
 * n'existe encore) ni `sameAs` (aucun profil public) : rien n'est invente.
 */
export function organizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_AR,
    url: `${SITE_URL}/`,
  };
}

/**
 * Le site. `url` est la racine du domaine : Google ne connait qu'un nom de
 * site par domaine, jamais par sous-repertoire — les deux locales decrivent
 * le meme site. Pas de `SearchAction` : la sitelinks search box n'existe plus.
 */
export function websiteJsonLd(locale: Locale): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_AR,
    url: `${SITE_URL}/`,
    inLanguage: language(locale),
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/** Un fil d'Ariane, du plus large au plus precis. `path` suit la convention de `absoluteUrl`. */
export function breadcrumbJsonLd(
  locale: Locale,
  trail: { name: string; path: string }[],
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((maillon, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: maillon.name,
      item: absoluteUrl(locale, maillon.path),
    })),
  };
}

/**
 * Le fil d'Ariane d'une fiche : Accueil → Velos → Marque → Fiche. C'est lui
 * que Google affiche a la place de l'URL. La page marque `/bikes/{brand}` est
 * figee par la decision du 2 septembre 2026.
 */
export function buildBreadcrumbJsonLd(locale: Locale, build: Build): JsonLdObject {
  const t = TRAIL_COPY[locale];

  return breadcrumbJsonLd(locale, [
    { name: t.home, path: '' },
    { name: t.bikes, path: '/bikes' },
    { name: build.brand.name, path: `/bikes/${build.brand.slug}` },
    { name: build.model_name, path: `/bikes/${build.brand.slug}/${build.slug}` },
  ]);
}

/**
 * Le produit d'une fiche. `image` : les photos de la galerie en taille
 * `detail` — toutes portent des droits documentes cote API, condition pour
 * inviter Google Images. L'API n'expose ni description, ni `sku`, ni `model` :
 * ils n'apparaissent pas tant qu'elle ne les fournit pas.
 */
export function productJsonLd(locale: Locale, build: Build): JsonLdObject {
  const produit: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: bikeName(build),
    brand: { '@type': 'Brand', name: build.brand.name },
    url: absoluteUrl(locale, `/bikes/${build.brand.slug}/${build.slug}`),
  };

  const images = build.images.map((media) => media.sizes.detail.url);
  if (images.length > 0) produit.image = images;

  return produit;
}

/**
 * La liste des fiches d'une page de liste (forme « page sommaire » de
 * Google : position et URL, rien d'autre). Reservee aux pages nues : un
 * catalogue filtre n'est pas une page, il ne decrit rien.
 */
export function itemListJsonLd(locale: Locale, cards: BuildCard[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: cards.map((card, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(locale, `/bikes/${card.brand.slug}/${card.slug}`),
    })),
  };
}
