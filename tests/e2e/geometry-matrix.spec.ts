import { expect, test, type Page } from '@playwright/test';
import type { Locale } from '@/lib/api';
import { readBuild } from './helpers/catalog-api';

/**
 * La géométrie de la fiche sur les pages RÉELLES (web #66) : toutes les tailles, le dessin de la taille choisie à gauche,
 * la cote surlignée au survol, les explications du glossaire, la bascule valeur / telle que publiée. Les attentes se lisent
 * dans l'API au moment du test. Le composant seul est dans `geometry-matrix.spec.tsx`.
 *
 * Fiches vérifiées dans l'API de production le 14 octobre 2026 : Talon 1 (5 tailles dessinables), Fuel MX 9.8 XT Gen 7
 * (publié en centimètres, taille du cycliste et entrejambe sur 5 tailles), Checkpoint ALR 5 Gen 3 (entrejambe sur une
 * seule taille), Scale 925 (une cote sur 5 tailles sur 6), Scale 600 (une taille, non dessinable), Enduro Comp (angle de
 * direction en anomalie sur ses 4 tailles, donc non dessinable).
 */
type Bike = { brand: string; slug: string };
const TALON: Bike = { brand: 'giant', slug: 'talon-1' };
const FUEL: Bike = { brand: 'trek', slug: 'fuel-mx-9-8-xt-gen-7' };
const CHECKPOINT: Bike = { brand: 'trek', slug: 'checkpoint-alr-5-gen-3' };
const SCALE_925: Bike = { brand: 'scott', slug: 'scale-925' };
const SCALE_600: Bike = { brand: 'scott', slug: 'scale-600' };
const ENDURO: Bike = { brand: 'specialized', slug: 'enduro-comp' };
const LOCALES: readonly Locale[] = ['ar-sa', 'en-sa'];

// Libellés écrits en toutes lettres : un oracle indépendant des `COPY` du site.
const PUBLISHED = { 'ar-sa': 'كما نشرتها الشركة', 'en-sa': 'As published' } as const;
const EFFECT = { 'ar-sa': 'الأثر:', 'en-sa': 'Effect:' } as const;
const DOUBTFUL = { 'ar-sa': 'قيمة منشورة مشكوك فيها', 'en-sa': 'Published value looks wrong' } as const;
const NOTHING = { 'ar-sa': 'لا يمكن رسم أي إطار بالقياسات المنشورة.', 'en-sa': 'No frame can be drawn from the published measurements.' } as const;
const DASH = '—';

const fiche = (locale: Locale, bike: Bike) => `/${locale}/bikes/${bike.brand}/${bike.slug}`;
const rowOf = (page: Page, key: string) => page.locator(`#geometry tr[data-row="${key}"]`);
const sizeButtons = (page: Page) => page.locator('#geometry > div > div:first-child button[aria-pressed]');
const published = (page: Page, locale: Locale) => page.locator('#geometry button[aria-pressed]', { hasText: PUBLISHED[locale] });
const drawing = (page: Page) => page.locator('#geometry svg[role="img"]');

for (const locale of LOCALES) {
  test(`${locale} : Talon 1 — une colonne par taille, la première choisie ; choisir « L » déplace la colonne et change le dessin`, async ({ page, request }) => {
    const build = await readBuild(request, locale, TALON.brand, TALON.slug);
    const l = build.sizes.findIndex((s) => s.label === 'L');
    expect(l, 'précondition : une taille L').toBeGreaterThan(0);
    await page.goto(fiche(locale, TALON));

    await expect(page.locator('#geometry thead th')).toHaveCount(build.sizes.length + 1);
    await expect(page.locator('#geometry th[data-selected]')).toHaveText(build.sizes[0].label);
    const before = await drawing(page).getAttribute('viewBox');

    await sizeButtons(page).nth(l).click();

    await expect(page.locator('#geometry th[data-selected]')).toHaveText('L');
    await expect(drawing(page)).not.toHaveAttribute('viewBox', before!);
    // Aucune requête : le tableau et le dessin viennent de la réponse initiale.
    await expect(rowOf(page, 'reach').locator('td[data-selected]')).toHaveText(
      build.sizes[l].geometry.find((g) => g.key === 'reach')!.value_formatted!,
    );
  });

  test(`${locale} : survoler « Reach » surligne sa cote sur le dessin, Échap l’efface ; « ? » ouvre l’explication`, async ({ page }) => {
    await page.goto(fiche(locale, TALON));

    await expect(drawing(page).locator('[data-mark]')).toHaveCount(0);
    await rowOf(page, 'reach').hover();
    await expect(drawing(page).locator('[data-mark="reach"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(drawing(page).locator('[data-mark]')).toHaveCount(0);

    await rowOf(page, 'stack').locator('button[aria-expanded]').click();
    await expect(rowOf(page, 'stack').locator('button[aria-expanded]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#geometry tbody')).toContainText(EFFECT[locale]);
  });

  test(`${locale} : Fuel MX — la valeur normalisée en millimètres, la valeur publiée en centimètres après la bascule ; lignes de tête pleines`, async ({ page, request }) => {
    const build = await readBuild(request, locale, FUEL.brand, FUEL.slug);
    const reach = build.sizes[0].geometry.find((g) => g.key === 'reach')!;
    expect(reach.original_unit, 'précondition : Trek publie en centimètres').toBe('cm');
    expect(build.sizes.every((s) => s.rider_height && s.rider_inseam), 'précondition : cycliste et entrejambe sur toutes les tailles').toBe(true);
    await page.goto(fiche(locale, FUEL));

    const cell = rowOf(page, 'reach').locator('td[data-selected]');
    await expect(cell).toHaveText(reach.value_formatted!);
    await published(page, locale).click();
    await expect(cell).toHaveText(reach.original_formatted);

    for (const key of ['rider_height', 'rider_inseam']) {
      await expect(rowOf(page, key).locator('td')).toHaveCount(build.sizes.length);
      await expect(rowOf(page, key).locator('td', { hasText: DASH })).toHaveCount(0);
    }
  });

  test(`${locale} : Checkpoint — l’entrejambe publié sur une seule taille : la ligne existe, les autres cellules au tiret`, async ({ page, request }) => {
    const build = await readBuild(request, locale, CHECKPOINT.brand, CHECKPOINT.slug);
    const missing = build.sizes.filter((s) => s.rider_inseam === null).length;
    expect(missing, 'précondition : au moins une taille sans entrejambe, une au moins avec').toBeGreaterThan(0);
    expect(missing).toBeLessThan(build.sizes.length);
    await page.goto(fiche(locale, CHECKPOINT));

    await expect(rowOf(page, 'rider_inseam').locator('td', { hasText: DASH })).toHaveCount(missing);
  });

  test(`${locale} : Scale 925 — une cote portée par cinq tailles sur six : la ligne existe, une cellule au tiret`, async ({ page, request }) => {
    const build = await readBuild(request, locale, SCALE_925.brand, SCALE_925.slug);
    const key = 'maximum_seatpost_insertion';
    const lacking = build.sizes.filter((s) => !s.geometry.some((g) => g.key === key)).length;
    expect(lacking, 'précondition : une taille sans cette cote').toBeGreaterThan(0);
    await page.goto(fiche(locale, SCALE_925));

    await expect(rowOf(page, key).locator('td')).toHaveCount(build.sizes.length);
    await expect(rowOf(page, key).locator('td', { hasText: DASH })).toHaveCount(lacking);
  });

  test(`${locale} : Scale 600 — une taille non dessinable : le message, aucun SVG, le tableau à une colonne`, async ({ page, request }) => {
    const build = await readBuild(request, locale, SCALE_600.brand, SCALE_600.slug);
    expect(build.sizes.some((s) => s.figure.drawable), 'précondition : rien de dessinable').toBe(false);
    await page.goto(fiche(locale, SCALE_600));

    await expect(drawing(page)).toHaveCount(0);
    await expect(page.locator('#geometry')).toContainText(NOTHING[locale]);
    await expect(page.locator('#geometry thead th')).toHaveCount(build.sizes.length + 1);
  });

  test(`${locale} : Enduro Comp — un angle publié en millimètres s’affiche tel que publié et signalé douteux, sans dessin`, async ({ page, request }) => {
    const build = await readBuild(request, locale, ENDURO.brand, ENDURO.slug);
    const flagged = build.sizes[0].geometry.find((g) => g.anomaly !== null);
    expect(flagged, 'précondition : une cote en anomalie').toBeDefined();
    expect(build.sizes.some((s) => s.figure.drawable), 'précondition : non dessinable').toBe(false);
    await page.goto(fiche(locale, ENDURO));

    const cell = rowOf(page, flagged!.key).locator('td[data-selected]');
    await expect(cell).toContainText(flagged!.original_formatted);
    await expect(cell).toContainText(DOUBTFUL[locale]);
    await expect(drawing(page)).toHaveCount(0);
  });
}

test('ar-sa : le dessin reste à GAUCHE du tableau sur grand écran, au-dessus sur téléphone, sans défilement en largeur', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(fiche('ar-sa', TALON));
  const figure = page.locator('#geometry figure');
  const table = page.locator('#geometry table');
  let f = (await figure.boundingBox())!;
  let t = (await table.boundingBox())!;
  expect(f.x + f.width, 'le dessin à gauche du tableau').toBeLessThanOrEqual(t.x + 1);

  await page.setViewportSize({ width: 390, height: 844 });
  f = (await figure.boundingBox())!;
  t = (await table.boundingBox())!;
  expect(f.y + f.height, 'le dessin au-dessus du tableau').toBeLessThanOrEqual(t.y + 1);
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `${scroll} px de contenu pour ${client} px d'écran`).toBeLessThanOrEqual(client);
  // La colonne des cotes reste visible quand les tailles défilent dans la boîte du tableau.
  await table.scrollIntoViewIfNeeded();
  await page.locator('#geometry .overflow-x-auto').evaluate((el) => { el.scrollLeft = 10_000; });
  await expect(page.locator('#geometry tbody th').first()).toBeInViewport();
});
