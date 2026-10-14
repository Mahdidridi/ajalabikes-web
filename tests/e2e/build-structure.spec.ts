import { expect, test, type Page } from '@playwright/test';
import type { Locale } from '@/lib/api';
import { readBuild, readSimilar } from './helpers/catalog-api';

/**
 * La structure du bas de la fiche vélo — décision du fondateur du 14 octobre 2026 (web #65).
 *
 * Sous la photo annotée, inchangée : la barre d'ancres (collante, le bloc courant souligné), puis Équipements, Composants,
 * Géométrie, Vélos proches — dans cet ordre, dans la colonne centrale. Le bloc « Specs clés » et la silhouette Specialized
 * (`geometry_chart`) ne s'affichent plus. Les attentes de données se lisent dans l'API au moment du test.
 *
 * Fiches vérifiées dans l'API de production le 14 octobre 2026 : le Talon 1 (annotée, équipements, un vélo proche), le
 * Fuel MX 9.8 XT Gen 7 (annotée, aucune valeur d'équipement), le Scale 600 (non annotée, 896 px), l'Allez Elite (avait la
 * silhouette).
 */
type Bike = { brand: string; slug: string };
const ANNOTATED: Bike = { brand: 'giant', slug: 'talon-1' };
const NO_EQUIPMENT: Bike = { brand: 'trek', slug: 'fuel-mx-9-8-xt-gen-7' };
const PLAIN: Bike = { brand: 'scott', slug: 'scale-600' };
const SILHOUETTE: Bike = { brand: 'specialized', slug: 'allez-elite' };
const LOCALES: readonly Locale[] = ['ar-sa', 'en-sa'];

// Libellés écrits en toutes lettres : un oracle indépendant des `COPY` des composants.
const TITLES = {
  'ar-sa': { equipment: 'التجهيزات', components: 'المكونات', geometry: 'الهندسة', similar: 'دراجات مشابهة' },
  'en-sa': { equipment: 'Equipment', components: 'Components', geometry: 'Geometry', similar: 'Similar bikes' },
} as const;
const KEY_SPECS = { 'ar-sa': 'المواصفات الرئيسية', 'en-sa': 'Key specs' } as const;
const CHART = { 'ar-sa': 'مخطط الهندسة', 'en-sa': 'Geometry chart' } as const;

const fiche = (locale: Locale, bike: Bike) => `/${locale}/bikes/${bike.brand}/${bike.slug}`;
const bar = (page: Page) => page.locator('main nav');
/** La galerie est le premier `figure` de la fiche ; la photo annotée vit dedans. */
const gallery = (page: Page) => page.locator('main > figure').first();

/** Le défilement est doux (`scroll-behavior: smooth`) : on attend que la position se stabilise avant de lire. */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => {
    let last = -1;
    let stable = 0;
    const tick = () => {
      const y = window.scrollY;
      stable = y === last ? stable + 1 : 0;
      last = y;
      if (stable >= 8) done();
      else setTimeout(tick, 50);
    };
    tick();
  }));
  await page.waitForTimeout(200);
}

async function hrefs(page: Page): Promise<string[]> {
  return bar(page).locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
}

/** L'ordonnée du titre de chaque section, dans l'ordre des ancres : elle doit croître. */
async function titleTops(page: Page, anchors: string[]): Promise<number[]> {
  const tops: number[] = [];
  for (const href of anchors) {
    const box = await page.locator(`${href} h2`).first().boundingBox();
    expect(box, `${href} doit avoir un titre`).not.toBeNull();
    tops.push(box!.y);
  }
  return tops;
}

for (const locale of LOCALES) {
  const T = TITLES[locale];

  test(`${locale} : Talon 1 — plus de specs clés, la barre sous la galerie, blocs et ancres dans l’ordre`, async ({ page, request }) => {
    const build = await readBuild(request, locale, ANNOTATED.brand, ANNOTATED.slug);
    const similar = await readSimilar(request, locale, ANNOTATED.brand, ANNOTATED.slug);
    expect(build.equipment_specs.state === 'current' && build.equipment_specs.items.length > 0, 'précondition : équipements').toBe(true);
    expect(similar.total, 'précondition : au moins un vélo proche').toBeGreaterThan(0);
    expect(build.hotspot_image, 'précondition : fiche annotée').not.toBeNull();
    await page.goto(fiche(locale, ANNOTATED));

    await expect(page.locator('#highlights')).toHaveCount(0);
    await expect(page.getByText(KEY_SPECS[locale], { exact: true })).toHaveCount(0);

    const galleryBox = (await gallery(page).boundingBox())!;
    const barBox = (await bar(page).boundingBox())!;
    expect(barBox.y, 'la barre vient sous la galerie').toBeGreaterThan(galleryBox.y + galleryBox.height - 1);

    const anchors = await hrefs(page);
    expect(anchors).toEqual(['#equipment', '#components', '#geometry', '#similar']);
    await expect(bar(page).locator('a')).toHaveText([T.equipment, T.components, T.geometry, T.similar]);

    const tops = await titleTops(page, anchors);
    for (let i = 1; i < tops.length; i++) expect(tops[i], `${anchors[i]} après ${anchors[i - 1]}`).toBeGreaterThan(tops[i - 1]);
    expect(tops[0], 'le premier bloc vient sous la barre').toBeGreaterThan(barBox.y);
  });

  test(`${locale} : Trek sans équipement — ni ancre ni bloc, le premier bloc est Composants`, async ({ page, request }) => {
    const build = await readBuild(request, locale, NO_EQUIPMENT.brand, NO_EQUIPMENT.slug);
    const similar = await readSimilar(request, locale, NO_EQUIPMENT.brand, NO_EQUIPMENT.slug);
    expect(build.equipment_specs.items.length, 'précondition : aucune valeur d’équipement').toBe(0);
    expect(similar.total, 'précondition : au moins un vélo proche').toBeGreaterThan(0);
    await page.goto(fiche(locale, NO_EQUIPMENT));

    await expect(page.locator('#equipment')).toHaveCount(0);
    expect(await hrefs(page)).toEqual(['#components', '#geometry', '#similar']);
    await expect(page.locator('main h2').first()).toHaveText(T.components);
  });

  test(`${locale} : Scale 600 (fiche non annotée) — la barre est aussi sous la galerie`, async ({ page, request }) => {
    const build = await readBuild(request, locale, PLAIN.brand, PLAIN.slug);
    expect(build.hotspot_image, 'précondition : fiche sans notes').toBeNull();
    await page.goto(fiche(locale, PLAIN));

    const galleryBox = (await gallery(page).boundingBox())!;
    const barBox = (await bar(page).boundingBox())!;
    expect(barBox.y).toBeGreaterThan(galleryBox.y + galleryBox.height - 1);
    expect((await hrefs(page))[0]).toBe('#equipment');
  });

  test(`${locale} : Allez Elite — plus d’image de silhouette sous la géométrie`, async ({ page, request }) => {
    const build = await readBuild(request, locale, SILHOUETTE.brand, SILHOUETTE.slug);
    expect(build.geometry_chart, 'précondition : l’API sert encore la silhouette').not.toBeNull();
    await page.goto(fiche(locale, SILHOUETTE));

    await expect(page.getByText(CHART[locale])).toHaveCount(0);
    await expect(page.locator('#geometry img')).toHaveCount(0);
  });

  // Talon 1 : une géométrie longue (cinq tailles). Scale 600 : une géométrie COURTE (une taille), suivie d'un bloc de vélos
  // proches plus haut qu'elle — relevé en production le 14 octobre 2026 : « le bloc le plus visible » soulignait alors le
  // bloc suivant. Le bloc courant est le dernier dont le titre est passé sous la barre.
  for (const bike of [ANNOTATED, PLAIN]) {
    test(`${locale} : ${bike.slug} — la barre reste collée en haut et souligne le bloc où l’on est`, async ({ page }) => {
      // 900 px de haut : l'écran où le défaut a été relevé (le projet desktop n'en fait que 720).
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(fiche(locale, bike));
      await page.locator('#geometry').evaluate((el) => el.scrollIntoView());
      await settled(page);

      const barBox = (await bar(page).boundingBox())!;
      expect(barBox.y, 'la barre est collée au bord haut').toBeLessThanOrEqual(1);
      await expect(bar(page).locator('a[href="#geometry"]')).toHaveAttribute('aria-current', 'true');
      await expect(bar(page).locator('a[aria-current="true"]')).toHaveCount(1);
    });
  }

  test(`${locale} : un clic sur la barre souligne le bloc choisi, même quand le bloc suivant occupe plus d’écran`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(fiche(locale, PLAIN));
    // La géométrie du Scale 600 est courte : sous elle, les vélos proches remplissent le reste de l'écran.
    await bar(page).locator('a[href="#geometry"]').click();
    await settled(page);

    await expect(bar(page).locator('a[href="#geometry"]')).toHaveAttribute('aria-current', 'true');
    await expect(bar(page).locator('a[aria-current="true"]')).toHaveCount(1);

    // Le dernier bloc, en bas de page : il ne monte pas forcément jusqu'à la barre, il reste celui qu'on a demandé.
    await bar(page).locator('a').last().click();
    await settled(page);
    await expect(bar(page).locator('a').last()).toHaveAttribute('aria-current', 'true');
    await expect(bar(page).locator('a[aria-current="true"]')).toHaveCount(1);
  });

  test(`${locale} : Équipements en deux colonnes sur grand écran, une seule à 390 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(fiche(locale, ANNOTATED));
    const rows = page.locator('#equipment [data-equipment-row]');
    const wide = [await rows.nth(0).boundingBox(), await rows.nth(1).boundingBox()];
    expect(Math.abs(wide[0]!.y - wide[1]!.y), 'deux premières lignes côte à côte').toBeLessThan(2);

    await page.setViewportSize({ width: 390, height: 800 });
    const narrow = [await rows.nth(0).boundingBox(), await rows.nth(1).boundingBox()];
    expect(narrow[1]!.y, 'une seule colonne').toBeGreaterThan(narrow[0]!.y + narrow[0]!.height - 1);
  });

  test(`${locale} : à 320 px, les trois fiches ne défilent pas en largeur`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const bike of [ANNOTATED, NO_EQUIPMENT, PLAIN]) {
      await page.goto(fiche(locale, bike));
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll, `${bike.brand}/${bike.slug} : ${scroll} px de contenu pour ${client} px d'écran`).toBeLessThanOrEqual(client);
    }
  });
}
