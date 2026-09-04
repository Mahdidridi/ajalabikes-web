import type { Metadata, MetadataRoute } from 'next';
import { LOCALES, type Build, type Locale } from '@/lib/api';
import { sizesCount } from '@/lib/vocabulary';

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
 * `noindex, nofollow` quelle que soit sa politique cible, l'en-tete
 * `X-Robots-Tag` de `next.config.ts` dit la meme chose, `robots.txt` interdit
 * tout (`robotsRules`) et le sitemap est vide (`src/lib/sitemap.ts`).
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

/** `{ 'ar-SA': url, 'en-SA': url, 'x-default': url }` — la forme des `alternates.languages` de Next. */
type HreflangGroup = Record<string, string> & { 'x-default': string };

/**
 * Le groupe hreflang d'un chemin : toutes les locales SERVIES — la courante
 * comprise, c'est l'auto-reference — puis le repli `x-default`. Une seule
 * construction pour le `<link rel="alternate">` des pages et le
 * `<xhtml:link>` du sitemap : les deux disent la meme chose, par construction.
 * `ae` entrera ici le jour ou `LOCALES` le servira, pas avant : un hreflang
 * vers un 404 fait sortir la page du groupe.
 */
export function hreflangGroup(path = ''): HreflangGroup {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [hreflangOf(l), absoluteUrl(l, path)])),
    'x-default': absoluteUrl(DEFAULT_LOCALE, path),
  };
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
export function bikeTitle(build: Pick<Build, 'brand' | 'model_name' | 'year' | 'year_label'>): string {
  return build.year === null ? bikeName(build) : `${bikeName(build)} ${build.year_label}`;
}

/**
 * La longueur visee d'une meta description : au-dela, Google la coupe
 * lui-meme, au milieu d'un mot. On coupe avant lui, au dernier mot entier.
 */
const DESCRIPTION_MAX = 160;

/**
 * Le patron de la description d'une fiche, par langue : le nom titre (marque,
 * modele, millesime s'il est connu), puis ce que la page offre. `sizes` est le
 * decompte de tailles deja accorde, ou `null` quand la fiche n'en publie
 * aucune — la parenthese disparait, rien n'est estime. En arabe, « دراجة » en
 * tete, colle au nom de la marque : la forme qu'emploie le distributeur Trek
 * officiel en Arabie (« دراجة مادون ») — `src/lib/vocabulary.ts`.
 */
const BIKE_DESCRIPTION: Record<Locale, (name: string, sizes: string | null) => string> = {
  'ar-sa': (name, sizes) =>
    `دراجة ${name}: المواصفات الكاملة، الهندسة حسب المقاس${sizes ? ` (${sizes})` : ''}، المكونات، والمقارنة مع دراجات أخرى.`,
  'en-sa': (name, sizes) =>
    `${name}: full specs, geometry by size${sizes ? ` (${sizes})` : ''}, components and side-by-side comparison.`,
};

/** Coupe au dernier mot entier sous la longueur visee, sans laisser une ponctuation orpheline. */
function clamp(text: string): string {
  if (text.length <= DESCRIPTION_MAX) return text;

  const coupe = text.slice(0, DESCRIPTION_MAX - 1);
  const dernierEspace = coupe.lastIndexOf(' ');
  const entier = dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe;

  return `${entier.replace(/[\s،,:;(]+$/, '')}…`;
}

/**
 * La description d'une fiche — UNE par velo, la ou toutes partageaient la
 * signature. Batie sur les champs que l'API rend deja : marque, modele,
 * millesime s'il est connu, nombre de tailles publiees. Rien n'est calcule,
 * rien n'est invente : un champ absent est omis. La categorie n'y entre pas
 * tant que `BuildResource` ne l'expose pas.
 */
export function bikeDescription(
  locale: Locale,
  build: Pick<Build, 'brand' | 'model_name' | 'year' | 'year_label'> & { sizes: readonly unknown[] },
): string {
  const sizes = build.sizes.length > 0 ? sizesCount(locale, build.sizes.length) : null;

  return clamp(BIKE_DESCRIPTION[locale](bikeTitle(build), sizes));
}

function robotsFor(indexable: boolean): Metadata['robots'] {
  if (INDEXING_LOCKED) return { index: false, follow: false };

  return { index: indexable, follow: true };
}

/**
 * Les regles de `robots.txt` (`src/app/robots.ts`), fonction pure : la
 * politique se verifie sans toucher au verrou (`tests/e2e/sitemap.spec.ts`).
 *
 * Verrouille : tout est interdit et aucun sitemap n'est annonce — le contenu,
 * mot pour mot, de l'ancien fichier statique `public/robots.txt`.
 *
 * Deverrouille : tout est permis sauf ce qui n'est pas une page, et le sitemap
 * est annonce. Les motifs sont ecrits avec la locale en tete parce qu'une
 * regle robots se compare au DEBUT du chemin : `/compare?` ne rencontrerait
 * jamais `/en-sa/compare?…`.
 */
export function robotsRules(locked: boolean): MetadataRoute.Robots {
  if (locked) return { rules: { userAgent: '*', disallow: '/' } };

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // Une comparaison avec query est un etat d'interface : les permutations
        // d'un meme ensemble sont infinies. Le comparateur nu reste une page.
        ...LOCALES.map((locale) => `/${locale}/compare?`),
        // « Afficher plus » du catalogue, ou que `per_page` tombe dans la query
        // (`?per_page=48` comme `?brand=trek&per_page=48`).
        '/*per_page=',
        // Le webhook d'invalidation.
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
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

  return {
    title: { absolute: titreComplet },
    description: resume,
    alternates: { canonical, languages: hreflangGroup(path) },
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
