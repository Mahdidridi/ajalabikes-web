import { expect, test, type Locator, type Page } from '@playwright/test';
import { pilotBike } from '../../src/lib/hotspot-pilot';

/**
 * Composition annotée du pilote (web #49, étape 1) sur le Talon : le serveur d'aperçu tourne
 * avec `BIKE_HOTSPOT_PREVIEW=1` (voir `playwright.hotspot-preview.config.ts`).
 */
const talon = pilotBike('talon')!;
type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function open(page: Page, locale: string, width: number, theme?: 'dark') {
  await page.setViewportSize({ width, height: 900 });
  if (theme) await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto(`/${locale}/preview/hotspots/talon`);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

for (const locale of ['ar-sa', 'en-sa']) {
  test(`talon ${locale} 1440 : une note et un trait par point, hors photo, sans chevauchement`, async ({ page }) => {
    await open(page, locale, 1440);
    const scene = page.locator('[data-annotated="talon"]');
    await expect(scene.locator('[data-dot]')).toHaveCount(talon.points.length);
    await expect(scene.locator('[data-note]:visible')).toHaveCount(talon.points.length);
    await expect(scene.locator('svg [data-leader]')).toHaveCount(talon.points.length);
    const photo = (await scene.locator('img').first().boundingBox())!;
    const notes = await Promise.all((await scene.locator('[data-note]').all()).map(async (n) => (await n.boundingBox())!));
    notes.forEach((note, i) => {
      expect(overlap(note, photo), `note ${i + 1} sur la photo`).toBe(false);
      notes.slice(i + 1).forEach((other, j) => expect(overlap(note, other), `notes ${i + 1} et ${i + j + 2}`).toBe(false));
    });
  });

  test(`talon ${locale} 390 : points seuls, un panneau, Échap rend le focus`, async ({ page }) => {
    await open(page, locale, 390);
    const scene = page.locator('[data-annotated="talon"]');
    await expect(scene.locator('[data-note]:visible')).toHaveCount(0);
    await expect(scene.locator('svg:visible')).toHaveCount(0);
    const dot = scene.locator('[data-dot]').first();
    const box = (await dot.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await dot.click();
    const detail = page.locator('[data-detail]');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText(talon.points[0].part[locale as 'ar-sa' | 'en-sa']);
    await page.keyboard.press('Escape');
    await expect(detail).toBeHidden();
    await expect(dot).toBeFocused();
  });
}

test('talon ar-sa : tout le latin d’une ligne principale est isolé dans <bdi>', async ({ page }) => {
  await open(page, 'ar-sa', 1440);
  const orphelins = await page.locator('[data-annotated] [data-main]').evaluateAll((els) =>
    els.filter((el) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && /[A-Za-z]/.test(n.textContent ?? ''))).length,
  );
  expect(orphelins).toBe(0);
  await expect(page.locator('[data-annotated] [data-main] bdi').first()).toBeVisible();
});

test('talon thème sombre : la scène reste claire, le texte sombre', async ({ page }) => {
  await open(page, 'en-sa', 1440, 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const [background, color] = await page.locator('[data-annotated]').evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.backgroundColor, style.color];
  });
  expect(background).toBe('rgb(255, 255, 255)');
  expect(color).toBe('rgb(23, 23, 23)');
});

test('talon image bloquée : aucun point, une alerte', async ({ page }) => {
  await page.route('**/media/5188/**', (route) => route.abort());
  await open(page, 'en-sa', 1440);
  // L'alerte de la scène, pas l'annonceur de route que Next pose sur chaque page (role="alert" lui aussi).
  await expect(page.locator('[data-annotated] [role="alert"]')).toBeVisible();
  await expect(page.locator('[data-annotated] [data-dot]')).toHaveCount(0);
});

test('sélecteur de couleur : le noir passe le soulignement en trait, la teinte de catégorie le colore', async ({ page }) => {
  await open(page, 'en-sa', 1440);
  const underline = () =>
    page.locator('[data-annotated] [data-main]').first().evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      return { color: after.backgroundColor, height: after.height };
    });
  expect((await underline()).color).toBe('rgb(246, 215, 124)');
  await page.locator('[data-accent-picker] [data-preset="ink"]').click();
  expect(await underline()).toEqual({ color: 'rgb(23, 23, 23)', height: '2px' });
  await page.locator('[data-accent-picker] [data-preset="category"]').click();
  expect((await underline()).color).toBe('rgb(131, 164, 135)');
});
