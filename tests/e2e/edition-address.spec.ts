import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { Locale } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';
import { readBuild } from './helpers/catalog-api';
import { requiredApiBaseUrl, requiredSecret } from './helpers/environment';

/**
 * web #15 — l'adresse millésime d'une fiche, sur les pages réelles (décision du 5 septembre 2026, `../CLAUDE.md`,
 * « Conventions → Routes ») : `/{locale}/bikes/{marque}/{slug}-{année}` est permanente et rend l'édition de cette
 * année ; canonical vers l'adresse modèle tant qu'elle est l'année en cours, propre ensuite ; aucune redirection.
 *
 * Mesuré en production le 14 octobre 2026 : toute adresse millésime répondait 308 vers l'adresse modèle, et l'édition
 * 2026 d'un modèle qui a une 2027 était inaccessible. Vélo de test : Trek Fuel+ EX 9.8 Eagle 90 Gen 2, publié en 2026
 * et en 2027 ce jour-là. Années, édition courante et chemins sont lus dans l'API au moment du test.
 */
const BRAND = 'trek';
const MODEL = 'fuel-ex-9-8-eagle-90-gen-2';

/** `/en-sa/bikes/trek/x-2026` → `/bikes/trek/x-2026` : le chemin sous la locale. */
const underLocale = (path: string) => path.replace(/^\/[a-z]{2}-[a-z]{2}(?=\/)/, '');

const editionsOf = async (request: APIRequestContext, locale: Locale) => {
  const build = await readBuild(request, locale, BRAND, MODEL);
  const current = build.editions.find((edition) => edition.is_current);
  const superseded = build.editions.find((edition) => !edition.is_current);
  expect(build.model_path, 'Le modèle de test doit publier son adresse modèle').not.toBeNull();
  expect(current, 'Le modèle de test doit avoir une édition courante').toBeDefined();
  expect(superseded, 'Le modèle de test doit avoir une édition supplantée').toBeDefined();

  return { model: build.model_path!, current: current!, superseded: superseded! };
};

/** Le millésime tel que l'API le libelle pour cette édition — l'oracle du texte affiché. */
const yearLabel = async (request: APIRequestContext, locale: Locale, path: string) => {
  const slug = path.split('/').pop()!;
  return (await readBuild(request, locale, BRAND, slug)).year_label;
};

const canonical = (page: Page) => page.locator('link[rel="canonical"]');

const hreflangs = async (page: Page) =>
  Object.fromEntries(
    await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) => links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')])),
  );

/** Le groupe attendu pour un chemin : les deux locales, les catchalls `ar` / `en`, `x-default` → `en-sa`. */
const group = (path: string) => ({
  'ar-SA': `${SITE_URL}/ar-sa${path}`,
  'en-SA': `${SITE_URL}/en-sa${path}`,
  ar: `${SITE_URL}/ar-sa${path}`,
  en: `${SITE_URL}/en-sa${path}`,
  'x-default': `${SITE_URL}/en-sa${path}`,
});

const expectServedDirectly = async (request: APIRequestContext, path: string) => {
  const res = await request.get(path, { maxRedirects: 0 });
  expect(res.status(), `${path} doit être servie sans redirection`).toBe(200);
  expect(res.headers().location, `${path} ne doit porter aucune Location`).toBeUndefined();
};

for (const locale of ['en-sa', 'ar-sa'] as const) {
  test.describe(`${locale}`, () => {
    test('une édition supplantée répond 200 à son adresse, montre son année et porte un canonical propre', async ({
      page,
      request,
    }) => {
      const { superseded } = await editionsOf(request, locale);
      await expectServedDirectly(request, superseded.path);

      await page.goto(superseded.path);
      expect(new URL(page.url()).pathname).toBe(superseded.path);
      await expect(page.locator('main > header')).toContainText(await yearLabel(request, locale, superseded.path));
      await expect(canonical(page)).toHaveAttribute('href', `${SITE_URL}${superseded.path}`);
      expect(await hreflangs(page)).toEqual(group(underLocale(superseded.path)));

      // Le produit des données structurées est à l'adresse de CETTE édition, pas à l'adresse modèle.
      const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) =>
        JSON.parse(text),
      );
      expect(blocks.find((block) => block['@type'] === 'Product')?.url).toBe(`${SITE_URL}${superseded.path}`);
    });

    test('l édition de l année en cours répond 200 à son adresse millésime, canonical vers l adresse modèle', async ({
      page,
      request,
    }) => {
      const { current, model } = await editionsOf(request, locale);
      await expectServedDirectly(request, current.path);

      await page.goto(current.path);
      expect(new URL(page.url()).pathname).toBe(current.path);
      await expect(page.locator('main > header')).toContainText(await yearLabel(request, locale, current.path));
      await expect(canonical(page)).toHaveAttribute('href', `${SITE_URL}${model}`);
      expect(await hreflangs(page)).toEqual(group(underLocale(current.path)));
    });

    test('l adresse modèle est inchangée : 200, le millésime le plus récent, canonical propre', async ({
      page,
      request,
    }) => {
      const { current, model } = await editionsOf(request, locale);
      await expectServedDirectly(request, model);

      await page.goto(model);
      await expect(page.locator('main > header')).toContainText(await yearLabel(request, locale, current.path));
      await expect(canonical(page)).toHaveAttribute('href', `${SITE_URL}${model}`);
      expect(await hreflangs(page)).toEqual(group(underLocale(model)));
    });
  });
}

test('une année jamais publiée reste un 404, sans redirection vers une autre édition', async ({ request }) => {
  const slug = `${MODEL}-2019`;
  const api = await request.get(`${requiredApiBaseUrl()}/v1/en-sa/builds/${BRAND}/${slug}`, {
    headers: { Accept: 'application/json' },
  });
  expect(api.status(), 'L API ne doit connaître aucune édition 2019 du modèle de test').toBe(404);

  const res = await request.get(`/en-sa/bikes/${BRAND}/${slug}`, { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test('le tag que l API émet pour le modèle invalide aussi ses adresses millésime', async ({ request }) => {
  const { superseded } = await editionsOf(request, 'en-sa');
  const tag = `build:${BRAND}:${MODEL}`;
  const purge = async () => {
    let res;
    try {
      res = await request.post('/api/revalidate', {
        headers: { Authorization: `Bearer ${requiredSecret()}` },
        data: { tags: [tag], reason: 'test e2e : adresse millésime (web #15)' },
        maxRedirects: 0,
        timeout: 15_000,
      });
    } catch {
      // Une exception Playwright brute peut contenir l'en-tête Authorization.
      throw new Error('Revalidation inaccessible : vérifier le Next testé et son secret, sans publier ce dernier.');
    }
    expect(res.status()).toBe(200);
  };
  const cacheOf = async () => {
    const res = await request.get(superseded.path, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    return res.headers()['x-nextjs-cache'];
  };

  await purge();
  expect(await cacheOf()).toBe('MISS');
  expect(await cacheOf()).toBe('HIT');
  await purge();
  expect(await cacheOf(), 'La purge du modèle doit re-rendre l édition supplantée').toBe('MISS');
});
