import type { components, operations } from '@/types/api';

/**
 * Locales servies. `ae` s'ajoutera avec la premiere offre locale.
 * Le tableau vient du contrat : le 422 de l'API liste exactement ces valeurs.
 */
export const LOCALES = ['ar-sa', 'en-sa'] as const;
export type Locale = (typeof LOCALES)[number];

/** Le type vient du contrat genere. Ne jamais le redeclarer a la main. */
export type Build = components['schemas']['BuildResource'];
export type BuildSize = Build['sizes'][number];
export type GeometryRow = BuildSize['geometry'][number];

/** Une carte de catalogue. Le type vient du contrat, jamais reecrit a la main. */
export type BuildCard = components['schemas']['BuildCardResource'];

type ShowResponse =
  operations['builds.show']['responses'][200]['content']['application/json'];

type IndexResponse =
  operations['builds.index']['responses'][200]['content']['application/json'];

type CompareResponse =
  operations['compare.index']['responses'][200]['content']['application/json'];

export type CatalogPage = IndexResponse;
export type Facets = IndexResponse['facets'];

/** La comparaison complète : cartes, tailles choisies, matrice. Types générés. */
export type CompareData = CompareResponse['data'];
export type CompareSection = CompareData['sections'][number];
export type CompareRow = CompareSection['rows'][number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function direction(locale: Locale): 'rtl' | 'ltr' {
  return locale.startsWith('ar') ? 'rtl' : 'ltr';
}

const BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000/api';

/**
 * Toutes les lectures sont cachees par Next et invalidees PAR TAG depuis l'API
 * (contrat du 2 septembre 2026, `tasks/2026-09-02-cache-contrat.md`). Les 24 h
 * sont un filet de securite, pas le mecanisme : c'est le webhook
 * `/api/revalidate` qui rafraichit une page quand la donnee change.
 *
 * Une reponse est cachee par URL : deux locales, ou deux filtres du catalogue,
 * sont deux entrees distinctes, toutes portees par le meme tag.
 */
const ONE_DAY = 86_400;

function cached(tags: string[]): RequestInit {
  return {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
    next: { tags, revalidate: ONE_DAY },
  };
}

/**
 * Un seul appel par page. Toutes les tailles arrivent ensemble : changer de taille
 * a l'ecran ne doit declencher aucune requete.
 */
export async function getBuild(
  locale: Locale,
  brand: string,
  slug: string,
): Promise<Build | null> {
  const res = await fetch(`${BASE}/v1/${locale}/builds/${brand}/${slug}`, cached([`build:${brand}:${slug}`]));

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} sur ${brand}/${slug}`);

  const payload: ShowResponse = await res.json();

  return payload.data;
}

/**
 * Le catalogue, filtre par l'API.
 *
 * Les parametres sont transmis TELS QUELS : l'API decide de ce qu'elle
 * accepte et refuse un filtre inconnu par un 422. Filtrer ici ferait un second
 * endroit ou maintenir la liste, et le front finirait par masquer une erreur
 * plutot que de la remonter.
 */
export async function getCatalog(
  locale: Locale,
  params: Record<string, string | undefined>,
): Promise<CatalogPage> {
  const query = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur !== undefined && valeur !== '') query.set(cle, valeur);
  }

  const res = await fetch(`${BASE}/v1/${locale}/builds?${query}`, cached(['catalog']));

  if (!res.ok) throw new Error(`API ${res.status} sur le catalogue`);

  return res.json();
}

type FinderTreeResponse =
  operations['bikefinder.tree']['responses'][200]['content']['application/json'];

type FinderResultsResponse =
  operations['bikefinder.results']['responses'][200]['content']['application/json'];

export type FinderTree = FinderTreeResponse['data'];
export type FinderQuestion = FinderTree['questions'][string];
export type FinderResults = FinderResultsResponse['data'];

/** L'arbre du bikefinder, localise par l'API — aucun libelle en dur ici. */
export async function getFinderTree(locale: Locale): Promise<FinderTree> {
  const res = await fetch(`${BASE}/v1/${locale}/bikefinder/tree`, cached(['bikefinder']));

  if (!res.ok) throw new Error(`API ${res.status} sur l'arbre du bikefinder`);

  const payload: FinderTreeResponse = await res.json();

  return payload.data;
}

/**
 * Les resultats d'un chemin complet. Le chemin vient de l'URL, tel quel :
 * l'API valide (422 sur un chemin inconnu), le front ne re-verifie pas.
 */
export async function getFinderResults(
  locale: Locale,
  path: string,
): Promise<FinderResults | null> {
  const res = await fetch(
    `${BASE}/v1/${locale}/bikefinder/results?path=${encodeURIComponent(path)}`,
    cached(['bikefinder']),
  );

  if (res.status === 422 || res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} sur les resultats du bikefinder`);

  const payload: FinderResultsResponse = await res.json();

  return payload.data;
}

/**
 * La comparaison. `bikes` : paires `marque/slug` jointes par des virgules,
 * `sizes` : labels positionnels alignés — les DEUX viennent de l'URL de la
 * page, telles quelles. L'API valide, le front ne re-vérifie pas.
 */
export async function getCompare(
  locale: Locale,
  bikes: string,
  sizes?: string,
): Promise<CompareData | null> {
  const query = new URLSearchParams({ builds: bikes });
  if (sizes) query.set('sizes', sizes);

  const res = await fetch(`${BASE}/v1/${locale}/compare?${query}`, cached(['compare']));

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} sur la comparaison`);

  const payload: CompareResponse = await res.json();

  return payload.data;
}
