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

export type CatalogPage = IndexResponse;
export type Facets = IndexResponse['facets'];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function direction(locale: Locale): 'rtl' | 'ltr' {
  return locale.startsWith('ar') ? 'rtl' : 'ltr';
}

const BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000/api';

/**
 * Un seul appel par page. Toutes les tailles arrivent ensemble : changer de taille
 * a l'ecran ne doit declencher aucune requete.
 */
export async function getBuild(
  locale: Locale,
  brand: string,
  slug: string,
): Promise<Build | null> {
  const res = await fetch(`${BASE}/v1/${locale}/builds/${brand}/${slug}`, {
    headers: { Accept: 'application/json' },
    next: { tags: [`build:${brand}:${slug}`] },
  });

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

  const res = await fetch(`${BASE}/v1/${locale}/builds?${query}`, {
    headers: { Accept: 'application/json' },
    next: { tags: ['catalog'] },
  });

  if (!res.ok) throw new Error(`API ${res.status} sur le catalogue`);

  return res.json();
}
