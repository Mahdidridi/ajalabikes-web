import type { Metadata } from 'next';
import { LOCALES, type Build, type Locale } from '@/lib/api';

/**
 * SEO — canonical, hreflang, Open Graph et robots, depuis UN SEUL endroit.
 *
 * Decisions du 2 septembre 2026 (CLAUDE.md, « Routes et locales », points 1
 * a 5) : URL figees, chaque page declare ses versions ar-sa / en-sa,
 * `x-default` mene a l'anglais (les expatries du Golfe), nom de site unique
 * « Darraja Bikes ». Toute page appelle `seoFor` : la reciprocite des hreflang
 * — sans laquelle Google les ignore — est garantie par construction, pas par
 * relecture.
 */

/** L'hote canonique : apex, https, sans www. Les autres graphies y redirigent. */
export const SITE_URL = 'https://darrajabikes.com';

/** Un seul nom de site par domaine chez Google : le latin, aussi dans les SERP arabes. */
export const SITE_NAME = 'Darraja Bikes';

/** Le nom arabe, en `alternateName` seulement. */
export const SITE_NAME_AR = 'دراجة';

/** La signature suit la locale ; c'est la meme que celle du pied de page. */
export const SIGNATURE: Record<Locale, string> = {
  'ar-sa': 'منصة عربية لاكتشاف الدراجات ومقارنتها',
  'en-sa': "The Gulf's bike comparison platform",
};

/** La locale de repli `x-default` : l'anglais, langue des expatries. La racine `/` reste arabe. */
const DEFAULT_LOCALE: Locale = 'en-sa';

/**
 * VERROU D'INDEXATION — decision du 28 aout 2026, reaffirmee le 2 septembre :
 * rien ne s'indexe avant les droits d'images, les sitemaps, `indexable` cote
 * API et la mesure depuis Riyad. Tant qu'il est pose, chaque page sort en
 * `noindex, nofollow` quelle que soit sa politique cible, et l'en-tete
 * `X-Robots-Tag` de `next.config.ts` dit la meme chose.
 *
 * A la levee : passer a `false` ET retirer l'en-tete, ensemble — sinon l'un
 * annule l'autre. Le `robots` du layout reste : c'est le defaut des pages qui
 * n'appellent pas `seoFor`.
 */
export const INDEXING_LOCKED = true as boolean;

type SeoInput = {
  locale: Locale;
  /** Le chemin SOUS la locale, sans query : `''` (accueil), `/bikes`, `/bikes/trek/marlin-7`. */
  path: string;
  /** Le titre de la page, sans le nom du site — absent : le nom du site seul. */
  title?: string;
  /** Absente : la signature de la marque, comme le layout. */
  description?: string;
  /**
   * Politique CIBLE, appliquee a la levee du verrou : `false` = `noindex,
   * follow` — un etat d'interface (catalogue filtre, comparaison en cours,
   * etape du bikefinder) ne s'indexe pas, mais ses liens comptent. Le jour ou
   * l'API exposera `indexable` par fiche, c'est ce champ qui arrive ici.
   */
  indexable?: boolean;
};

/** `ar-sa` → `ar-SA` : la forme des hreflang (Google est insensible a la casse, les humains non). */
function hreflangOf(locale: Locale): `${Lowercase<string>}-${string}` {
  const [lang, market] = locale.split('-') as [Lowercase<string>, string];

  return `${lang}-${market.toUpperCase()}`;
}

/** `ar-sa` → `ar_SA` : la forme des locales Open Graph. */
function ogLocaleOf(locale: Locale): string {
  const [lang, market] = locale.split('-');

  return `${lang}_${market.toUpperCase()}`;
}

/**
 * L'URL absolue d'une page dans une locale. Query et fragment sont retires :
 * `sizes`, `diff`, `per_page`, `utm_*` n'entrent jamais dans un canonical.
 * Pas de barre finale, comme les URL servies.
 */
export function absoluteUrl(locale: Locale, path = ''): string {
  const chemin = path.split(/[?#]/)[0].replace(/\/+$/, '');
  const relatif = chemin === '' || chemin.startsWith('/') ? chemin : `/${chemin}`;

  return `${SITE_URL}/${locale}${relatif}`;
}

/** « Trek Fuel MX 9.8 XT Gen 7 » : le nom complet d'un velo, marque comprise. */
export function bikeName({ brand, model_name }: Pick<Build, 'brand' | 'model_name'>): string {
  return `${brand.name} ${model_name}`;
}

/**
 * Le titre d'une fiche : le nom complet, suivi du millesime tel que l'API le
 * libelle — et seulement s'il est connu. Un millesime absent n'apparait pas
 * dans un titre, il reste « non renseigne » sur la page.
 */
export function bikeTitle(build: Build): string {
  return build.year === null ? bikeName(build) : `${bikeName(build)} ${build.year_label}`;
}

function robotsFor(indexable: boolean): Metadata['robots'] {
  if (INDEXING_LOCKED) return { index: false, follow: false };

  return { index: indexable, follow: true };
}

/**
 * Les metadonnees d'une page. Le resultat REMPLACE, cle par cle, ce que le
 * layout declare (fusion superficielle de Next) : `openGraph` et `robots`
 * sont donc emis en entier ici, jamais a moitie.
 */
export function seoFor({ locale, path, title, description, indexable = true }: SeoInput): Metadata {
  const titreComplet = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  const resume = description ?? SIGNATURE[locale];
  const canonical = absoluteUrl(locale, path);

  // Toutes les locales SERVIES, la courante comprise (auto-reference), puis
  // le repli. `ae` entrera ici le jour ou `LOCALES` le servira, pas avant :
  // un hreflang vers un 404 fait sortir la page du groupe.
  const languages: NonNullable<Metadata['alternates']>['languages'] = {
    ...Object.fromEntries(LOCALES.map((l) => [hreflangOf(l), absoluteUrl(l, path)])),
    'x-default': absoluteUrl(DEFAULT_LOCALE, path),
  };

  return {
    title: { absolute: titreComplet },
    description: resume,
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: titreComplet,
      description: resume,
      url: canonical,
      locale: ogLocaleOf(locale),
      alternateLocale: LOCALES.filter((l) => l !== locale).map(ogLocaleOf),
    },
    robots: robotsFor(indexable),
  };
}
