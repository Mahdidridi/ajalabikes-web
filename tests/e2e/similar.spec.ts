import { expect, test } from '@playwright/test';
import type { Locale } from '@/lib/api';
import { readSimilar } from './helpers/catalog-api';

/**
 * Le bloc « Vélos proches » sur les fiches RÉELLES (web #35). Les attentes se lisent dans l'API au moment du test :
 * total, ordre, adresses de comparaison, jamais le code du site. Le composant seul est dans `similar-bikes.spec.tsx`.
 *
 * Deux fiches : la Madone SL 6 Gen 8, qui a plus de quatre proches (10 le 14 octobre 2026), et un cadre nu exclu du
 * catalogue, que l'API sert avec `total: 0` (une exclusion décidée une fois, à l'écriture, par le scraper).
 */
const WITH = { brand: 'trek', slug: 'madone-sl-6-gen-8' };
const WITHOUT = { brand: 'giant', slug: 'propel-advanced-pro-ff' };
const LOCALES: readonly Locale[] = ['ar-sa', 'en-sa'];

// Libellés attendus, écrits en toutes lettres : un oracle indépendant du `COPY` du composant.
const SHOW_ALL = { 'ar-sa': (n: number) => `عرض الكل (${n})`, 'en-sa': (n: number) => `Show all (${n})` } as const;
const COMPARE = { 'ar-sa': 'قارن', 'en-sa': 'Compare' } as const;

const fiche = (locale: Locale, bike: { brand: string; slug: string }) => `/${locale}/bikes/${bike.brand}/${bike.slug}`;
/** Le lien de chaque carte (pas le lien Compare, qui mène à `/compare`). */
const cardLinks = (locale: Locale) => `#similar [data-similar-card] > a[href^="/${locale}/bikes/"]`;

for (const locale of LOCALES) {
  test(`${locale} : le bloc suit l’API — quatre cartes, le reste sous « Voir tout (N) », dans l’ordre servi`, async ({ page, request }) => {
    const data = await readSimilar(request, locale, WITH.brand, WITH.slug);
    expect(data.total, 'la fiche de référence doit avoir plus de quatre proches').toBeGreaterThan(4);
    expect(data.items, 'l’API sert tous ses proches').toHaveLength(data.total);
    await page.goto(fiche(locale, WITH));

    await expect(page.locator('#similar')).toBeVisible();
    const visible = page.locator(`${cardLinks(locale)}:visible`);
    await expect(visible).toHaveCount(4);
    for (const [i, item] of data.items.slice(0, 4).entries()) {
      await expect(visible.nth(i)).toHaveAttribute('href', `/${locale}/bikes/${item.brand.slug}/${item.slug}`);
    }

    // N est le total de l'API ; déplié, toutes les cartes y sont, dans l'ordre de l'API.
    const showAll = page.locator('#similar summary', { hasText: SHOW_ALL[locale](data.total) });
    await expect(showAll).toBeVisible();
    await showAll.click();
    await expect(visible).toHaveCount(data.total);
    for (const [i, item] of data.items.entries()) {
      await expect(visible.nth(i)).toHaveAttribute('href', `/${locale}/bikes/${item.brand.slug}/${item.slug}`);
    }
  });

  test(`${locale} : « ${COMPARE[locale]} » ouvre la comparaison des deux vélos`, async ({ page, request }) => {
    const data = await readSimilar(request, locale, WITH.brand, WITH.slug);
    const other = data.items[0];
    await page.goto(fiche(locale, WITH));

    // L'adresse est celle de l'API, déjà préfixée par la locale ; le site n'en fabrique aucune.
    expect(other.compare_path).toBe(`/${locale}/compare?bikes=${WITH.brand}/${WITH.slug},${other.brand.slug}/${other.slug}`);
    const compare = page.locator(`#similar a[href="${other.compare_path}"]`);
    await expect(compare).toHaveCount(1);
    await expect(compare).toContainText(COMPARE[locale]);
    await compare.click();

    await expect(page).toHaveURL(new RegExp(`/${locale}/compare\\?bikes=`));
    // La comparaison montre bien les deux vélos : une colonne chacun, avec son lien vers la fiche.
    await expect(page.locator(`main a[href="${fiche(locale, WITH)}"]`).first()).toBeVisible();
    await expect(page.locator(`main a[href="${fiche(locale, { brand: other.brand.slug, slug: other.slug })}"]`).first()).toBeVisible();
  });

  test(`${locale} : chaque ancre de la barre, celle du bloc comprise, pose le titre de sa section sous la barre collante`, async ({ page }) => {
    await page.goto(fiche(locale, WITH));
    const bar = page.locator('main nav');
    const hrefs = await bar.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs).toContain('#similar');

    // La barre est collante, et passe sur deux rangées sur un téléphone depuis l'ancre du bloc : après chaque saut,
    // le titre de la section commence SOUS elle, jamais caché dessous.
    for (const href of hrefs) {
      await bar.locator(`a[href="${href}"]`).click();
      const title = page.locator(`${href} h2`).first();
      await expect(title, href).toBeInViewport();
      const barBox = (await bar.boundingBox())!;
      const titleBox = (await title.boundingBox())!;
      expect(titleBox.y, `${href} : titre à ${titleBox.y} px, barre jusqu’à ${barBox.y + barBox.height} px`)
        .toBeGreaterThanOrEqual(barBox.y + barBox.height - 0.5);
    }
  });

  test(`${locale} : un vélo sans proche (cadre nu exclu) n’affiche ni section ni ancre`, async ({ page, request }) => {
    const data = await readSimilar(request, locale, WITHOUT.brand, WITHOUT.slug);
    expect(data.total, 'précondition : ce cadre nu doit rester exclu du catalogue').toBe(0);

    const response = await page.goto(fiche(locale, WITHOUT));
    expect(response?.status()).toBe(200);
    await expect(page.locator('#similar')).toHaveCount(0);
    await expect(page.locator('main nav a[href="#similar"]')).toHaveCount(0);
  });

  test(`${locale} : la fiche avec le bloc ne défile pas en largeur, et les quatre cartes forment des rangées pleines`, async ({ page }) => {
    await page.goto(fiche(locale, WITH));
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `${scroll} px de contenu pour ${client} px d'écran`).toBeLessThanOrEqual(client);

    // Quatre cartes : 1, 2 ou 4 par rangée, jamais 3 + 1 — la grille suit la largeur du bloc, pas celle de l'écran.
    const visible = page.locator(`${cardLinks(locale)}:visible`);
    await expect(visible).toHaveCount(4);
    const rows = new Map<number, number>();
    for (let i = 0; i < 4; i++) {
      const box = (await visible.nth(i).boundingBox())!;
      rows.set(Math.round(box.y), (rows.get(Math.round(box.y)) ?? 0) + 1);
    }
    expect(new Set(rows.values()).size, `rangées : ${JSON.stringify([...rows.values()])}`).toBe(1);
  });
}

test('ar-sa : la section est en RTL, les noms latins dans <bdi> et les isolats des raisons sont intacts', async ({ page, request }) => {
  const data = await readSimilar(request, 'ar-sa', WITH.brand, WITH.slug);
  await page.goto(fiche('ar-sa', WITH));

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const first = page.locator('#similar [data-similar-card]').first();
  await expect(first.locator('h3 bdi')).toHaveText(data.items[0].model_name);
  const reasons = first.locator('[data-similar-reasons] li');
  await expect(reasons).toHaveCount(Math.min(3, data.items[0].reasons.length));
  for (const [i, reason] of data.items[0].reasons.slice(0, 3).entries()) {
    // Le texte est servi avec ses isolats FSI/PDI : on l'affiche tel quel, sans y toucher.
    expect(await reasons.nth(i).textContent(), reason.key).toBe(reason.text);
  }
});
