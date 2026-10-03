import { expect, type APIRequestContext } from '@playwright/test';
import type { Build, CatalogPage, Locale } from '@/lib/api';
import type { operations } from '@/types/api';

const API = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8000/api').replace(/\/$/, '');

export async function readCatalog(
  request: APIRequestContext,
  locale: Locale,
  params: Record<string, string> = {},
): Promise<CatalogPage> {
  const url = `${API}/v1/${locale}/builds?${new URLSearchParams(params)}`;
  const response = await request.get(url, { headers: { Accept: 'application/json' } });
  expect(response.status(), `Catalogue API requis : ${url}`).toBe(200);
  return response.json();
}

export async function readBuild(
  request: APIRequestContext,
  locale: Locale,
  brand: string,
  slug: string,
): Promise<Build> {
  const url = `${API}/v1/${locale}/builds/${encodeURIComponent(brand)}/${encodeURIComponent(slug)}`;
  const response = await request.get(url, { headers: { Accept: 'application/json' } });
  expect(response.status(), `Fiche API requise : ${url}`).toBe(200);
  const payload: operations['builds.show']['responses'][200]['content']['application/json'] = await response.json();
  return payload.data;
}

export async function currentBuild(
  request: APIRequestContext,
  locale: Locale,
  params: Record<string, string> = {},
): Promise<Build> {
  const catalog = await readCatalog(request, locale, { per_page: '24', ...params });
  const card = catalog.data.find((bike) => bike.model_path !== null && bike.image !== null);
  expect(card, `Une fiche avec adresse modele et photo est requise : ${JSON.stringify(params)}`).toBeDefined();
  return readBuild(request, locale, card!.brand.slug, card!.slug);
}

export function requiredFacet(buckets: CatalogPage['facets']['brands'], key: string) {
  const bucket = buckets.find((item) => item.key === key);
  expect(bucket, `Facette API requise : ${key}`).toBeDefined();
  return bucket!;
}

/** Oracle linguistique des tests, independant du helper applicatif bikesCount. */
export function expectedBikeCount(locale: Locale, count: number): string {
  if (locale === 'en-sa') return `${count} ${count === 1 ? 'bike' : 'bikes'}`;
  const ending = count % 100;
  const word = ending >= 3 && ending <= 10 ? 'دراجات'
    : ending >= 11 && ending <= 99 ? 'دراجةً' : 'دراجة';
  return `${count} ${word}`;
}
