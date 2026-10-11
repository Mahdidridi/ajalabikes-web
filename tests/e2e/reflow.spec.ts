import { expect, test, type Page } from '@playwright/test';

/**
 * Aucune page ne défile en largeur sur un petit téléphone (critère WCAG 1.4.10 : 320 px de large).
 *
 * Mesuré le 11 octobre 2026 sur main : en anglais, l'en-tête débordait de 33 px à 320 px sur toutes les pages
 * (l'icône du thème sortait de l'écran) ; et la liste des composants élargissait la fiche jusqu'au mot le plus
 * long — sur le Vado, un lien brut de 64 caractères servi par l'API portait la page à 423 px, dès 390 px.
 */
const PAGES = [
  '',
  '/bikes',
  '/finder',
  '/compare',
  '/bikes/giant/talon-1',
  '/bikes/specialized/turbo-vado-sl-2-5-0-step-through-eq',
];

/** Largeur de défilement de la page contre sa largeur visible. */
async function widths(page: Page): Promise<{ scroll: number; client: number }> {
  return page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
}

for (const locale of ['ar-sa', 'en-sa']) {
  for (const width of [320, 390]) {
    test(`${locale} ${width} px : aucune page ne défile en largeur`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of PAGES) {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status(), `/${locale}${path}`).toBe(200);
        const { scroll, client } = await widths(page);
        expect(scroll, `/${locale}${path} : ${scroll} px de contenu pour ${client} px d'écran`).toBeLessThanOrEqual(client);
      }
    });
  }
}

// Passer à la ligne est le dernier recours (320 et 340 px en anglais) : sur les téléphones courants, dès 360 px, la
// barre tient sur une ligne — langue et thème à la hauteur de la marque.
for (const locale of ['ar-sa', 'en-sa']) {
  test(`${locale} 360 et 390 px : l’en-tête tient sur une ligne`, async ({ page }) => {
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/${locale}/bikes`);
      const nav = page.locator('header nav');
      const brand = (await nav.locator('a').first().boundingBox())!;
      const last = (await nav.locator('button').last().boundingBox())!;
      expect(Math.abs(last.y + last.height / 2 - (brand.y + brand.height / 2)), `${width} px`).toBeLessThan(12);
    }
  });
}

// Les données changent : quand le lien brut du Vado sera nettoyé, la page réelle ne prouvera plus rien. Un mot de
// 120 caractères posé dans la liste garde la règle elle-même — c'est la liste qui se replie, jamais la page qui s'élargit.
test('320 px : un mot sans espace dans la liste des composants se replie, la fiche ne s’élargit pas', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/en-sa/bikes/giant/talon-1');
  const description = page.locator('#components dd bdi').first();
  await expect(description).toBeVisible();
  await description.evaluate((el) => {
    el.textContent = 'x'.repeat(120);
  });
  const { scroll, client } = await widths(page);
  expect(scroll).toBeLessThanOrEqual(client);
  const box = (await description.boundingBox())!;
  expect(box.x + box.width, 'le mot reste dans l’écran').toBeLessThanOrEqual(client + 0.5);
});
