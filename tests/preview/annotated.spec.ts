import { expect, test, type Locator, type Page } from '@playwright/test';
import { PILOT_BIKES, pilotBike } from '../../src/lib/hotspot-pilot';

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
  // Tout texte latin, à n'importe quelle profondeur sous la ligne principale, doit avoir un <bdi> pour ancêtre.
  const orphelins = await page.locator('[data-annotated] [data-main]').evaluateAll((els) =>
    els.reduce((total, el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let count = 0;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (/[A-Za-z]/.test(n.textContent ?? '') && !n.parentElement?.closest('bdi')) count++;
      }
      return total + count;
    }, 0),
  );
  expect(orphelins).toBe(0);
  await expect(page.locator('[data-annotated] [data-main] bdi').first()).toBeVisible();
});

/** x (bord gauche) du caractère `offset` de la première occurrence de `needle` dans le texte RENDU de `el`. */
async function glyphX(el: Locator, needle: string, offset: number): Promise<number> {
  return el.evaluate(
    (root, [needle, offset]) => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
      let at = nodes.map((n) => n.data).join('').indexOf(needle);
      if (at < 0) throw new Error(`« ${needle} » absent`);
      at += offset;
      for (const node of nodes) {
        if (at < node.data.length) {
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + 1);
          return range.getBoundingClientRect().left;
        }
        at -= node.data.length;
      }
      throw new Error('hors du texte');
    },
    [needle, offset] as const,
  );
}

// Relecture du 10 octobre : un <bdi> qui avalait le point final ou une seule parenthèse rendait « Madone. » avec le point
// entre le nom et l'arabe, et « (aero) » avec ses deux parenthèses du même côté. Le DOM restait juste : on mesure le rendu.
for (const bike of PILOT_BIKES) {
  test(`${bike.key} ar-sa 390 : chaque <bdi> isole un nom entier, sans ponctuation de phrase ni parenthèse orpheline`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`/ar-sa/preview/hotspots/${bike.key}`);
    const dots = page.locator(`[data-annotated="${bike.key}"] [data-dot]`);
    await expect(dots).toHaveCount(bike.points.length);
    let checked = 0;
    for (const [i, point] of bike.points.entries()) {
      await dots.nth(i).click();
      await expect(page.locator('[data-detail]')).toContainText(point.note['ar-sa']);
      for (const run of await page.locator('[data-detail] bdi').allTextContents()) {
        expect(run, `${point.id} : « ${run} »`).not.toMatch(/[\s.,:;]$/);
        expect(run.split('(').length, `${point.id} : « ${run} »`).toBe(run.split(')').length);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
}

test('ar-sa 390 : parenthèses autour du latin et point final en bout de phrase, à l’écran', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const cases = [
    { key: 'madone', paren: '(aero)', end: 'Madone.' },
    { key: 'vado', paren: '(EQ)', end: 'E500+.' },
    { key: 'checkpoint', paren: '(Gravel)' },
  ] as const;
  for (const { key, paren, ...rest } of cases) {
    const bike = pilotBike(key)!;
    const index = bike.points.findIndex((p) => p.note['ar-sa'].includes(paren));
    expect(index, `${key} : note contenant ${paren}`).toBeGreaterThanOrEqual(0);
    await page.goto(`/ar-sa/preview/hotspots/${key}`);
    await page.locator(`[data-annotated="${key}"] [data-dot]`).nth(index).click();
    const note = page.locator('[data-detail] p', { hasText: paren });
    await expect(note).toBeVisible();
    const x = (needle: string, offset: number) => glyphX(note, needle, offset);
    expect(await x(paren, 0), `${key} : « ( » à gauche de ${paren}`).toBeLessThan(await x(paren, 1));
    expect(await x(paren, paren.length - 1), `${key} : « ) » à droite de ${paren}`).toBeGreaterThan(await x(paren, paren.length - 2));
    if ('end' in rest) {
      const end = rest.end;
      expect(await x(end, end.length - 1), `${key} : le point de « ${end} » en bout de phrase arabe, à gauche du nom`).toBeLessThan(await x(end, 0));
    }
  }
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
    page.locator('[data-annotated] [data-main] [data-segment]').first().evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      return { color: after.backgroundColor, height: after.height };
    });
  expect((await underline()).color).toBe('rgb(246, 215, 124)');
  await page.locator('[data-accent-picker] [data-preset="ink"]').click();
  expect(await underline()).toEqual({ color: 'rgb(23, 23, 23)', height: '2px' });
  await page.locator('[data-accent-picker] [data-preset="category"]').click();
  expect((await underline()).color).toBe('rgb(131, 164, 135)');
});

for (const bike of PILOT_BIKES.filter((b) => b.key !== 'talon')) {
  for (const locale of ['ar-sa', 'en-sa']) {
    test(`${bike.key} ${locale} 1440 : une note par point, hors photo, sans chevauchement`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/preview/hotspots/${bike.key}`);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const scene = page.locator(`[data-annotated="${bike.key}"]`);
      await expect(scene.locator('[data-dot]')).toHaveCount(bike.points.length);
      await expect(scene.locator('[data-note]:visible')).toHaveCount(bike.points.length);
      const photo = (await scene.locator('img').first().boundingBox())!;
      const notes = await Promise.all((await scene.locator('[data-note]').all()).map(async (n) => (await n.boundingBox())!));
      const sceneBox = (await scene.boundingBox())!;
      notes.forEach((note, i) => {
        expect(overlap(note, photo), `${bike.points[i].id} sur la photo`).toBe(false);
        expect(note.x >= sceneBox.x && note.x + note.width <= sceneBox.x + sceneBox.width, `${bike.points[i].id} hors scène`).toBe(true);
        notes.slice(i + 1).forEach((other, j) => expect(overlap(note, other), `${bike.points[i].id} / ${bike.points[i + j + 1].id}`).toBe(false));
      });
    });
  }
}

test('anthem : une autre photo de la galerie s’affiche sans aucun point, la photo de tête les retrouve', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en-sa/preview/hotspots/anthem');
  const dots = page.locator('[data-annotated] [data-dot]');
  await expect(dots).toHaveCount(pilotBike('anthem')!.points.length);
  await page.getByRole('button', { name: 'Photo 2 of 12' }).click();
  await expect(page.locator('[data-annotated]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Photo 1 of 12' }).click();
  await expect(dots).toHaveCount(pilotBike('anthem')!.points.length);
});

test('talon ar-sa : alignement physique contre le trait (note de gauche alignée à droite, note de droite à gauche)', async ({ page }) => {
  await open(page, 'ar-sa', 1440);
  const edges = async (id: string) => {
    const note = page.locator('[data-annotated] [data-note]').nth(talon.points.findIndex((p) => p.id === id));
    return { main: (await note.locator('[data-main]').boundingBox())!, part: (await note.locator('[data-main] + span').boundingBox())! };
  };
  const left = await edges('derailleur');
  expect(Math.abs(left.main.x + left.main.width - (left.part.x + left.part.width)), 'note de gauche').toBeLessThan(2);
  const right = await edges('fork');
  expect(Math.abs(right.main.x - right.part.x), 'note de droite').toBeLessThan(2);
});
