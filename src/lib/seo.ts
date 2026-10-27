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
 * rien ne s'indexait avant les droits d'images, les sitemaps, `indexable` cote
 * API et la mesure depuis Riyad. LEVE par la decision du fondateur du 16 octobre
 * 2026 (ouverture a Google).
 *
 * Pose, il forcait `noindex, nofollow` sur chaque page quelle que soit sa
 * politique cible, doublait l'ordre par l'en-tete `X-Robots-Tag` de
 * `next.config.ts`, interdisait tout dans `robots.txt` (`robotsRules`) et vidait
 * le sitemap (`src/lib/sitemap.ts`). Leve, chaque page suit sa politique cible
 * (`robotsPolicy` : l'`indexable` que l'API decide, `noindex, follow` pour un
 * etat d'interface), `robots.txt` annonce le sitemap et le sitemap liste les
 * pages indexables.
 *
 * Retour arriere d'urgence : repasser a `true` ET remettre l'en-tete dans
 * `next.config.ts` (son commentaire dit comment), ensemble — sinon l'un annule
 * l'autre. Le `robots` du layout reste : c'est le defaut des pages qui
 * n'appellent pas `seoFor`.
 */
export const INDEXING_LOCKED = false as boolean;

type SeoInput = {
  locale: Locale;
  /** Le chemin SOUS la locale, sans query : `''` (accueil), `/bikes`, `/bikes/trek/marlin-7`. */
  path: string;
  /**
   * Le canonical quand il n'est pas la page elle-même — absent : `path`. Seule l'adresse millésime de l'année en
   * cours s'en sert (web #15, décision du 5 septembre 2026) : canonical vers l'adresse modèle. Les hreflang restent
   * ceux de `path`, l'adresse servie dans chaque locale (« au même type d'adresse », issue #15).
   */
  canonicalPath?: string;
  /** Le titre de la page, sans le nom du site — absent : le nom du site seul. */
  title?: string;
  /** Absente : la signature de la marque, comme le layout. */
  description?: string;
  /**
   * Politique CIBLE, appliquee a la levee du verrou : `false` = `noindex,
   * follow` — un etat d'interface (catalogue filtre, comparaison en cours,
   * etape du bikefinder) ne s'indexe pas, mais ses liens comptent. Fiche,
   * marque et categorie passent l'`indexable` que l'API decide (photo, seuil
   * de 5 velos, adresse en attente d'api #25) : le front ne le recalcule pas.
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

/** Locales regionales, catchalls ar/en et x-default : `alternates.languages` de Next. */
type HreflangGroup = Record<string, string> & { 'x-default': string };

/**
 * Le groupe hreflang d'un chemin : toutes les locales SERVIES — la courante
 * comprise, c'est l'auto-reference — puis le repli `x-default`. Une seule
 * construction pour le `<link rel="alternate">` des pages et le
 * `<xhtml:link>` du sitemap : les deux disent la meme chose, par construction.
 * `ae` entrera ici le jour ou `LOCALES` le servira, pas avant : un hreflang
 * vers un 404 fait sortir la page du groupe.
 * Decision du 5 septembre 2026, appliquee le 5 octobre (web #18) : les
 * catchalls `ar` / `en` restent fixes sur `ar-sa` / `en-sa`, meme a l'ouverture
 * d'autres pays. `x-default` reste sur `en-sa` ; aucune nouvelle route.
 */
export function hreflangGroup(path = ''): HreflangGroup {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [hreflangOf(l), absoluteUrl(l, path)])),
    ar: absoluteUrl('ar-sa', path),
    en: absoluteUrl('en-sa', path),
    'x-default': absoluteUrl(DEFAULT_LOCALE, path),
  };
}

/** « Trek Fuel MX 9.8 XT Gen 7 » : le nom complet d'un velo, marque comprise. */
export function bikeName({ brand, model_name }: Pick<Build, 'brand' | 'model_name'>): string {
  return `${brand.name} ${model_name}`;
}

/** Un nom suivi du millesime tel que l'API le libelle — et seulement s'il est connu. */
function withYear(build: Pick<Build, 'year' | 'year_label'>, name: string): string {
  return build.year === null ? name : `${name} ${build.year_label}`;
}

/**
 * Le titre d'une fiche : le nom complet, suivi du millesime tel que l'API le
 * libelle — et seulement s'il est connu. Un millesime absent n'apparait pas
 * dans un titre, il reste « non renseigne » sur la page.
 */
export function bikeTitle(build: Pick<Build, 'brand' | 'model_name' | 'year' | 'year_label'>): string {
  return withYear(build, bikeName(build));
}

/**
 * Le titre de la page d'une fiche, par langue. En arabe : « دراجة », la marque
 * en lettres arabes telle que l'API la sert (`brand.name_ar`), le modele et le
 * millesime — « دراجة كانيون Endurace CF SLX 8 Di2 2027 ».
 *
 * Decision du fondateur du 27 octobre 2026 : en Arabie, on tape « دراجة كانيون »,
 * la marque en lettres arabes ; seule, elle y veut dire autre chose (la voiture
 * GMC, une societe de livraison), et « دراجة » devant leve l'ambiguite
 * (autocompletion geolocalisee, `notes/data/marques-arabe-2026-10-27/` a la
 * racine du projet). Sans nom arabe, le titre latin. La description garde la
 * marque en latin : le resultat Google porte les deux ecritures.
 */
const BIKE_TITLE: Record<Locale, (build: Pick<Build, 'brand' | 'model_name' | 'year' | 'year_label'>) => string> = {
  'ar-sa': (build) =>
    build.brand.name_ar ? withYear(build, `دراجة ${build.brand.name_ar} ${build.model_name}`) : bikeTitle(build),
  'en-sa': (build) => bikeTitle(build),
};

export function bikePageTitle(locale: Locale, build: Pick<Build, 'brand' | 'model_name' | 'year' | 'year_label'>): string {
  return BIKE_TITLE[locale](build);
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

  // Inclure la frontiere : une espace a l'index 159 termine un mot qui tient.
  const coupe = text.slice(0, DESCRIPTION_MAX);
  const dernierEspace = coupe.lastIndexOf(' ');
  const entier = dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe.slice(0, -1);

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

/**
 * La politique robots d'une page, fonction pure (`tests/e2e/seo.spec.ts`).
 *
 * `noimageindex` toujours, verrou pose ou leve (decision du 16 octobre 2026,
 * plan de levee du noindex) : les photos sont celles des constructeurs, leurs
 * droits ne sont pas documentes ; elles restent hors de Google Images. Les
 * medias eux-memes sont servis par l'API, dont le `robots.txt` reste
 * `Disallow: /`.
 */
export function robotsPolicy(locked: boolean, indexable: boolean): NonNullable<Metadata['robots']> {
  if (locked) return { index: false, follow: false, noimageindex: true };

  return { index: indexable, follow: true, noimageindex: true };
}

/**
 * Les regles de `robots.txt` (`src/app/robots.ts`), fonction pure : la
 * politique se verifie sans toucher au verrou (`tests/e2e/sitemap.spec.ts`).
 *
 * Verrouille : tout est interdit et aucun sitemap n'est annonce — le contenu,
 * mot pour mot, de l'ancien fichier statique `public/robots.txt`.
 *
 * Deverrouille : tout est permis sauf le webhook, et le sitemap est annonce.
 * Plus de `Disallow` sur `/{locale}/compare?` ni `/*per_page=` (decision du
 * 16 octobre 2026) : Google ne lit pas le `noindex` d'une adresse qu'on lui
 * interdit de visiter, et chaque fiche lie une dizaine de comparaisons —
 * bloquees, elles pourraient etre indexees sans contenu. Elles restent
 * `noindex, follow` par leur propre balise.
 */
export function robotsRules(locked: boolean): MetadataRoute.Robots {
  if (locked) return { rules: { userAgent: '*', disallow: '/' } };

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

/**
 * Les metadonnees d'une page. Le resultat REMPLACE, cle par cle, ce que le
 * layout declare (fusion superficielle de Next) : `openGraph` et `robots`
 * sont donc emis en entier ici, jamais a moitie.
 */
export function seoFor({ locale, path, canonicalPath, title, description, indexable = true }: SeoInput): Metadata {
  const titreComplet = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  const resume = description ?? SIGNATURE[locale];
  const canonical = absoluteUrl(locale, canonicalPath ?? path);

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
    robots: robotsPolicy(INDEXING_LOCKED, indexable),
  };
}
