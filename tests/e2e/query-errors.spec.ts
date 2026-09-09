import { expect, test } from '@playwright/test';

for (const locale of ['ar-sa', 'en-sa'] as const) {
  test(`${locale} : liens marketing, filtres et canonical restent fonctionnels`, async ({ page }) => {
    const path = `/${locale}/bikes`;
    await page.goto(`${path}?brand=canyon&sort=name`);
    const cards = page.locator('main a[href*="/bikes/canyon/"]');
    await expect(cards.first()).toBeVisible();
    const original = await cards.evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    const response = await page.goto(`${path}?brand=canyon&sort=name&utm_source=newsletter&utm_medium=email&utm_campaign=launch&gclid=test`);
    expect(response!.status()).toBe(200);
    await expect(cards).toHaveCount(original.length);
    expect(await cards.evaluateAll((links) => links.map((a) => a.getAttribute('href')))).toEqual(original);
    await expect(page.locator('select#brand')).toHaveValue('canyon');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://darrajabikes.com${path}`);
    expect(response!.headers()['x-robots-tag']).toContain('noindex');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.locator('select#sort').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(cards.first()).toBeVisible();
  });

  for (const query of ['sort=invalid', 'brnad=trek']) {
    test(`${locale} : catalogue ${query} affiche une récupération localisée`, async ({ page }) => {
      const response = await page.goto(`/${locale}/bikes?${query}`);
      expect(response!.status()).toBeLessThan(500);
      await expect(page.getByRole('main').getByRole('alert')).toContainText(locale === 'ar-sa' ? 'الفلاتر' : 'filters');
      const reset = page.locator('main a');
      await expect(reset).toHaveAttribute('href', `/${locale}/bikes`);
      await reset.click();
      await expect(page.locator('main ul a').first()).toBeVisible();
    });
  }

  test(`${locale} : taille refusée dans la comparaison sans erreur serveur`, async ({ page }) => {
    // Les vélos viennent du catalogue courant ; pas de dépendance à un slug historique.
    await page.goto(`/${locale}/bikes`);
    const hrefs = await page.locator('main ul a').evaluateAll((a) => a.slice(0, 2).map((x) => x.getAttribute('href')!));
    expect(hrefs).toHaveLength(2);
    const bikes = hrefs.map((href) => href.split('/bikes/')[1]).join(',');
    const response = await page.goto(`/${locale}/compare?${new URLSearchParams({ bikes, sizes: 'INVALID-SIZE,INVALID-SIZE' })}`);
    expect(response!.status()).toBeLessThan(500);
    await expect(page.getByRole('main').getByRole('alert')).toContainText(locale === 'ar-sa' ? 'المقاسات' : 'sizes');
    await expect(page.locator('main a')).toHaveAttribute('href', `/${locale}/compare`);
    await page.locator('main a').click();
    await expect(page.getByRole('searchbox')).toBeVisible();
  });
}
