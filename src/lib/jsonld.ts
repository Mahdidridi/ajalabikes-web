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

/**
 * Libelles du fil d'Ariane — les seuls textes de ce module qui ne viennent pas
 * de l'API. « الدراجات الهوائية » : le generique COMPLET, parce que ce fil
 * est ce que Google affiche a la place de l'URL et qu'il y est isole —
 * « دراجات » nu appelle la moto (`src/lib/vocabulary.ts`).
 */
const TRAIL_COPY = {
  'ar-sa': { home: 'الرئيسية', bikes: 'الدراجات الهوائية' },
  'en-sa': { home: 'Home', bikes: 'Bikes' },
} as const satisfies Record<Locale, { home: string; bikes: string }>;

/**
 * L'editeur du site. Ni `logo` (le logo dessine du 15 octobre 2026, `public/brand`,
 * n'est pas encore declare ici : a decider) ni `sameAs` (aucun profil public) :
 * rien n'est invente.
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
export function buildBreadcrumbJsonLd(
  locale: Locale,
  build: Build,
  // Le canonical de la page (web #15) : une edition supplantee n'est pas a l'adresse modele.
  path = `/bikes/${build.brand.slug}/${build.slug}`,
): JsonLdObject {
  const t = TRAIL_COPY[locale];

  return breadcrumbJsonLd(locale, [
    { name: t.home, path: '' },
    { name: t.bikes, path: '/bikes' },
    { name: build.brand.name, path: `/bikes/${build.brand.slug}` },
    { name: build.model_name, path },
  ]);
}

/** Le fil d'Ariane d'une page marque : Accueil → Velos → Marque. */
export function brandBreadcrumbJsonLd(locale: Locale, brand: { name: string; slug: string }): JsonLdObject {
  const t = TRAIL_COPY[locale];

  return breadcrumbJsonLd(locale, [
    { name: t.home, path: '' },
    { name: t.bikes, path: '/bikes' },
    { name: brand.name, path: `/bikes/${brand.slug}` },
  ]);
}

/**
 * Une page legale (web #16) : son fil d'Ariane, Accueil → Page, et la page elle-meme — `ContactPage` pour le contact,
 * `WebPage` sinon —, rattachee au site. Textes : le titre et la description de la page, rien d'autre.
 */
export function legalPageJsonLd(
  locale: Locale,
  page: { type: 'WebPage' | 'ContactPage'; name: string; description: string; path: string },
): JsonLdObject[] {
  const t = TRAIL_COPY[locale];

  return [
    breadcrumbJsonLd(locale, [
      { name: t.home, path: '' },
      { name: page.name, path: page.path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': page.type,
      name: page.name,
      description: page.description,
      url: absoluteUrl(locale, page.path),
      inLanguage: language(locale),
      isPartOf: { '@id': WEBSITE_ID },
    },
  ];
}

/** Le fil d'Ariane d'une page categorie, qui vit a la racine de la locale : Accueil → Categorie. */
export function categoryBreadcrumbJsonLd(locale: Locale, category: { name: string; path: string }): JsonLdObject {
  const t = TRAIL_COPY[locale];

  return breadcrumbJsonLd(locale, [
    { name: t.home, path: '' },
    { name: category.name, path: category.path },
  ]);
}

/**
 * Le produit d'une fiche. Sans `image` (decision du 16 octobre 2026, plan de
 * levee du noindex) : les photos sont celles des constructeurs, leurs droits
 * ne sont pas documentes, elles restent hors de Google (`noimageindex`) ; et
 * sans `offers` ni avis, aucun extrait produit n'est possible de toute facon.
 * L'API n'expose ni description, ni `sku`, ni `model` : ils n'apparaissent pas
 * tant qu'elle ne les fournit pas.
 */
export function productJsonLd(
  locale: Locale,
  build: Build,
  // Le canonical de la page (web #15) : une edition supplantee n'est pas a l'adresse modele.
  path = `/bikes/${build.brand.slug}/${build.slug}`,
): JsonLdObject {
  const produit: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: bikeName(build),
    brand: { '@type': 'Brand', name: build.brand.name },
    url: absoluteUrl(locale, path),
  };

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
