import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Le logo de Darraja Bikes — décision du fondateur du 15 octobre 2026 : le mot « درّاجة » dessiné à la main, en encre
 * NOIRE sur le thème clair et BLANCHE sur le thème sombre (le shadda reste noir sur sa touche de crayon jaune). Dans
 * l'en-tête, le mot seul — le nom latin reste dans le lien, lu par les lecteurs d'écran, mais n'est affiché nulle part
 * (décision du fondateur du 16 octobre 2026 : ni sur téléphone, ni sur ordinateur) ; au pied de page, le mot et
 * « DARRAJA BIKES » dessous.
 *
 * Le logo suit les DEUX portes du thème, comme les couleurs : le choix mémorisé (`data-theme`), sinon la préférence
 * du système — y compris sans JavaScript, où un logo noir disparaîtrait sur le fond sombre.
 */
const TOGGLE = { 'ar-sa': 'تبديل المظهر', 'en-sa': 'Toggle theme' } as const;
const WORDMARK = { light: 'wordmark-black', dark: 'wordmark-white' } as const;
const LOCKUP = { light: 'lockup-black', dark: 'lockup-white' } as const;
const LOCKUP_NAME = 'درّاجة Darraja Bikes';

/** Le lien de la marque, en tête de la barre du haut. */
const brandLink = (page: Page) => page.getByRole('banner').locator('nav a').first();

/**
 * Le logo affiché dans `scope` — un seul : l'autre encre est masquée, donc hors de l'arbre d'accessibilité —, une fois
 * CHARGÉ (un fichier absent laisserait une largeur naturelle nulle). Rend le fichier que le navigateur a choisi.
 */
async function shownLogo(scope: Locator, name: string): Promise<{ logo: Locator; file: string }> {
  const logo = scope.getByRole('img', { name, exact: true });
  await expect(logo).toHaveCount(1);
  await expect(logo).toBeVisible();
  await expect
    .poll(() => logo.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)), { message: name })
    .toBeGreaterThan(0);
  return { logo, file: await logo.evaluate((el: HTMLImageElement) => el.currentSrc) };
}

/** Les deux logos du thème `theme` : le mot dans l'en-tête, le logo complet au pied de page. */
async function expectTheme(page: Page, theme: 'light' | 'dark') {
  const header = await shownLogo(brandLink(page), 'درّاجة');
  expect(header.file, `en-tête en thème ${theme}`).toMatch(new RegExp(`/brand/${WORDMARK[theme]}-(120|240)-v1\\.webp$`));

  const footer = page.getByRole('contentinfo');
  await footer.scrollIntoViewIfNeeded();
  const lockup = await shownLogo(footer, LOCKUP_NAME);
  expect(lockup.file, `pied de page en thème ${theme}`).toMatch(new RegExp(`/brand/${LOCKUP[theme]}-(400|600)-v1\\.webp$`));
}

for (const locale of ['ar-sa', 'en-sa'] as const) {
  test(`${locale} : logo noir en thème clair, blanc en thème sombre, choix gardé au rechargement`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`/${locale}/bikes`);

    // Le nom accessible du lien ne change pas avec l'image : « درّاجة » (l'image) puis « Darraja Bikes » (le texte).
    await expect(brandLink(page)).toHaveAccessibleName('درّاجة Darraja Bikes');
    await expectTheme(page, 'light');

    await page.getByRole('button', { name: TOGGLE[locale] }).click();
    await expectTheme(page, 'dark');

    await page.reload();
    await expectTheme(page, 'dark');
  });
}

// Décision du fondateur du 16 octobre 2026 : « Darraja Bikes » en petites capitales, à côté du mot dessiné, ressemblait à
// un quatrième lien du menu et alourdissait la barre. Le texte reste dans le lien — c'est lui qui le nomme pour les lecteurs
// d'écran —, réduit à un point comme sur téléphone depuis le 15 octobre ; le nom latin vit au pied de page et dans le titre.
test('en-tête : le nom latin nomme le lien mais n’occupe aucune place à l’écran, sur ordinateur comme sur téléphone', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  for (const locale of ['ar-sa', 'en-sa'] as const) {
    await page.goto(`/${locale}`);
    const link = brandLink(page);
    await expect(link, locale).toHaveAccessibleName('درّاجة Darraja Bikes');

    // Le texte est là (trouvé par son nom), mais réduit à un point : rien n'est affiché à côté du mot dessiné…
    const label = (await link.getByText('Darraja Bikes', { exact: true }).boundingBox())!;
    expect(label.width, `${locale} : largeur du nom latin`).toBeLessThanOrEqual(1);
    expect(label.height, `${locale} : hauteur du nom latin`).toBeLessThanOrEqual(1);

    // … et le lien ne mesure que le logo : aucune place gardée pour un texte.
    const { logo } = await shownLogo(link, 'درّاجة');
    expect((await link.boundingBox())!.width, `${locale} : largeur du lien`).toBeCloseTo((await logo.boundingBox())!.width, 0);
  }
});

test('sans choix mémorisé, le logo suit la préférence du système ; un choix clair mémorisé l’emporte', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/en-sa');
  await expectTheme(page, 'dark');

  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.reload();
  await expectTheme(page, 'light');
});

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const theme of ['light', 'dark'] as const) {
    test(`préférence ${theme === 'light' ? 'claire' : 'sombre'} du système : le logo suit les couleurs`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/ar-sa');

      // Le script du thème n'a pas tourné : seule la préférence du système décide, couleurs comme logo.
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
      const other = theme === 'light' ? 'dark' : 'light';
      const link = brandLink(page);
      await expect(link.locator(`img[src*="/brand/${WORDMARK[theme]}-"]`)).toBeVisible();
      await expect(link.locator(`img[src*="/brand/${WORDMARK[other]}-"]`)).toBeHidden();
      const footer = page.getByRole('contentinfo');
      await expect(footer.locator(`img[src*="/brand/${LOCKUP[theme]}-"]`)).toBeVisible();
      await expect(footer.locator(`img[src*="/brand/${LOCKUP[other]}-"]`)).toBeHidden();
    });
  }
});

test('le pied de page ne télécharge que le logo du thème affiché', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/brand/lockup-')) requested.push(request.url());
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/en-sa');
  await expectTheme(page, 'light');

  expect(requested.some((url) => url.includes('/brand/lockup-black-'))).toBe(true);
  expect(requested.filter((url) => url.includes('/brand/lockup-white-'))).toEqual([]);
});

test('tailles : le mot fait 20 px de haut sur téléphone, 32 px dès 640 px ; le logo complet 176 px de large', async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/ar-sa');

  const header = await shownLogo(brandLink(page), 'درّاجة');
  const footer = page.getByRole('contentinfo');
  await footer.scrollIntoViewIfNeeded();
  const lockup = await shownLogo(footer, LOCKUP_NAME);
  expect((await header.logo.boundingBox())!.height).toBeCloseTo(isMobile ? 20 : 32, 0);
  expect((await lockup.logo.boundingBox())!.width).toBeCloseTo(176, 0);

  // Place réservée (attributs width/height) = proportions du fichier servi : rien ne bouge au chargement. Pour une
  // image à `srcset` en largeurs, `naturalWidth` est ramené au pixel CSS : on relit les vraies dimensions du fichier.
  for (const { logo } of [header, lockup]) {
    const ratios = await logo.evaluate(async (el: HTMLImageElement) => {
      const raw = new Image();
      raw.src = el.currentSrc;
      await raw.decode();
      return {
        reserved: Number(el.getAttribute('width')) / Number(el.getAttribute('height')),
        file: raw.naturalWidth / raw.naturalHeight,
        chosen: el.currentSrc,
      };
    });
    expect(Math.abs(ratios.reserved - ratios.file) / ratios.file, JSON.stringify(ratios)).toBeLessThan(0.01);
  }
});

// Huit fichiers, noms versionnés (`-v1`) : le cache peut être immuable, un nouveau logo change le nom.
for (const [shape, widths] of [['wordmark', [120, 240]], ['lockup', [400, 600]]] as const) {
  for (const ink of ['black', 'white']) {
    for (const width of widths) {
      test(`/brand/${shape}-${ink}-${width}-v1.webp est servi en WebP et immuable`, async ({ request }) => {
        const response = await request.get(`/brand/${shape}-${ink}-${width}-v1.webp`);

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toBe('image/webp');
        expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
      });
    }
  }
}
