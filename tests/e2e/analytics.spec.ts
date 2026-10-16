import { expect, test, type Page } from '@playwright/test';
import { analyticsBootstrap, GA_HOSTNAME, GA_MEASUREMENT_ID } from '@/lib/analytics';

/*
 * Google Analytics 4 — décision du fondateur du 16 octobre 2026 (propriété darrajabikes.com). La balise ne parle à Google
 * QUE sur l'hôte de production : ni en local, ni pendant cette suite, dont les centaines de visites fausseraient les
 * chiffres du fondateur. Google n'est donc jamais contacté ici : son chargeur est simulé quand un test en a besoin.
 */
const GOOGLE = /googletagmanager\.com|google-analytics\.com/;

/** Toute requête vers Google pendant la vie de la page. */
function googleRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => {
    if (GOOGLE.test(r.url())) urls.push(r.url());
  });
  return urls;
}

test('le script de mesure vise la propriété darrajabikes.com, et seulement cet hôte', () => {
  expect(GA_MEASUREMENT_ID).toBe('G-PNW83E7CDS');
  expect(GA_HOSTNAME).toBe('darrajabikes.com');
  const code = analyticsBootstrap();
  expect(code).toContain('"G-PNW83E7CDS"');
  expect(code).toContain('"darrajabikes.com"');
  expect(code).toContain('location.hostname');
  expect(code).not.toContain('document.write');
});

for (const locale of ['ar-sa', 'en-sa'] as const) {
  test(`${locale} : chaque page porte la balise, mais hors de darrajabikes.com elle ne contacte jamais Google`, async ({ page }) => {
    const appels = googleRequests(page);
    const reponse = await page.goto(`/${locale}`);

    // Rendue par le serveur, dans le <head> : elle existe aussi pour un robot sans JavaScript.
    expect(await reponse!.text()).toContain(analyticsBootstrap());
    await page.waitForLoadState('networkidle');

    expect(appels).toEqual([]);
    expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
  });
}

test('sur l’hôte de production, la balise charge Google avec le bon ID et envoie la page vue', async ({ page }) => {
  // Le même code, l'hôte de production remplacé par celui du test ; le chargeur de Google est simulé, rien ne part.
  const charges: string[] = [];
  await page.route(GOOGLE, (route) => {
    charges.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body: '' });
  });
  await page.goto('/en-sa');
  const hote = await page.evaluate(() => location.hostname);

  await page.evaluate((code) => new Function(code)(), analyticsBootstrap('G-TEST000000', hote));

  await expect.poll(() => charges).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-TEST000000']);
  const couche = await page.evaluate(() =>
    (window as unknown as { dataLayer: IArguments[] }).dataLayer.map((e) => `${e[0]}:${e[1] instanceof Date ? 'date' : e[1]}`),
  );
  expect(couche).toEqual(['js:date', 'config:G-TEST000000']);
});

test('un autre hôte ne charge rien et ne crée aucune file de mesure', async ({ page }) => {
  const appels = googleRequests(page);
  await page.goto('/en-sa');

  await page.evaluate((code) => new Function(code)(), analyticsBootstrap('G-TEST000000', 'darrajabikes.com'));
  await page.waitForTimeout(300);

  expect(appels).toEqual([]);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
});
