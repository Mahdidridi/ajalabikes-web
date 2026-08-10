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

type ShowResponse =
  operations['builds.show']['responses'][200]['content']['application/json'];

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
