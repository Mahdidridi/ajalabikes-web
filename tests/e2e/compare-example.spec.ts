import { expect, test, type Page } from '@playwright/test';
import { EXAMPLE_COMPARISON, exampleSelection } from '@/lib/compare-example';
import { requiredApiBaseUrl } from './helpers/environment';

/*
 * La page Comparer nue ouvre un EXEMPLE — décision du fondateur du 16 octobre 2026 : au lieu d'un tableau vide, deux
 * semi-rigides d'entrée de gamme au même prix constructeur à un cent près, Trek Marlin 6 Gen 3 et Giant Talon 1, en taille M (sans
 * taille, l'API ne sert pas la géométrie). L'exemple est étiqueté comme tel ; choisir un vélo démarre SA comparaison,
 * retirer un vélo de l'exemple garde l'autre — dès lors, l'état vit dans l'URL, comme avant.
 */
const [MARLIN, TALON] = EXAMPLE_COMPARISON.bikes;
const EXAMPLE = { 'ar-sa': 'مثال', 'en-sa': 'Example' } as const;
const VIEW = { 'ar-sa': 'عرض التفاصيل', 'en-sa': 'View details' } as const;
const SIZE = { 'ar-sa': 'اختر المقاس', 'en-sa': 'Choose size' } as const;

/** Une colonne = un vélo : le lien vers sa fiche en est le marqueur sûr. */
const fiches = (page: Page, locale: keyof typeof VIEW) => page.getByRole('link', { name: VIEW[locale] });
const etiquette = (page: Page) => page.locator('[data-compare-example]');

test.describe('exampleSelection : la règle seule', () => {
  const partout = () => true;

  test('la page nue ouvre l’exemple, en taille M pour les deux vélos', () => {
    expect(exampleSelection({}, partout)).toEqual({ bikes: [MARLIN, TALON], sizes: ['M', 'M'] });
    // Un lien de campagne reste la page nue.
    expect(exampleSelection({ utm_source: 'x' }, partout)).toEqual({ bikes: [MARLIN, TALON], sizes: ['M', 'M'] });
  });

  test('une sélection dans l’adresse, même vide, l’emporte toujours', () => {
    expect(exampleSelection({ bikes: 'trek/farley-5' }, partout)).toBeNull();
    expect(exampleSelection({ bikes: '' }, partout)).toBeNull();
  });

  test('un vélo de l’exemple sorti du catalogue : pas d’exemple, la page vide d’avant', () => {
    expect(exampleSelection({}, (key) => key !== TALON)).toBeNull();
    expect(exampleSelection({}, (key) => key !== MARLIN)).toBeNull();
  });
});

test('l’API sert toujours les deux vélos de l’exemple et leur géométrie en M', async ({ request }) => {
  // Le garde-fou : si un vélo sort du catalogue, le site retombe sans bruit sur la page vide — ce test, lui, le dit.
  const query = new URLSearchParams({ builds: `${MARLIN},${TALON}`, sizes: 'M,M' });
  const res = await request.get(`${requiredApiBaseUrl()}/v1/en-sa/compare?${query}`);
  expect(res.status()).toBe(200);

  const { data } = await res.json();
  expect(data.sizes_selected).toEqual(['M', 'M']);
  const geometry = data.sections.find((s: { key: string }) => s.key === 'geometry');
  expect(geometry.rows.length).toBeGreaterThan(0);
  expect(geometry.figure).not.toBeNull();
});

for (const locale of ['ar-sa', 'en-sa'] as const) {
  test(`${locale} : la page nue montre l’exemple, étiqueté, en taille M, géométrie dessinée`, async ({ page }) => {
    await page.goto(`/${locale}/compare`);

    await expect(etiquette(page)).toHaveText(EXAMPLE[locale]);
    await expect(fiches(page, locale)).toHaveCount(2);
    await expect(fiches(page, locale).nth(0)).toHaveAttribute('href', `/${locale}/bikes/${MARLIN}`);
    await expect(fiches(page, locale).nth(1)).toHaveAttribute('href', `/${locale}/bikes/${TALON}`);

    // La taille est choisie ET affichée sur la carte de chaque vélo : jamais de comparaison silencieuse entre tailles.
    const tailles = page.getByLabel(SIZE[locale], { exact: true });
    await expect(tailles).toHaveCount(2);
    await expect(tailles.nth(0)).toHaveValue('M');
    await expect(tailles.nth(1)).toHaveValue('M');

    await expect(page.locator('section[aria-labelledby="geometry-heading"] svg').first()).toBeVisible();
  });
}

test('choisir un vélo depuis l’exemple démarre SA comparaison', async ({ page }) => {
  await page.goto('/en-sa/compare');

  await page.getByPlaceholder('Find a bike…').fill('Farley 5');
  await page.getByRole('button', { name: 'Trek Farley 5' }).click();

  await expect(page).toHaveURL(/farley-5/);
  await expect(page).not.toHaveURL(/marlin|talon/);
  await expect(fiches(page, 'en-sa')).toHaveCount(1);
  await expect(etiquette(page)).toHaveCount(0);
});

test('retirer un vélo de l’exemple garde l’autre, et l’adresse le dit', async ({ page }) => {
  await page.goto('/en-sa/compare');

  await page.getByRole('link', { name: 'Remove' }).first().click();

  await expect(page).toHaveURL(/talon-1/);
  await expect(page).not.toHaveURL(/marlin/);
  await expect(page).toHaveURL(/sizes=M/);
  await expect(fiches(page, 'en-sa')).toHaveCount(1);
  await expect(etiquette(page)).toHaveCount(0);
});

test('la même paire choisie dans l’adresse n’est pas un exemple', async ({ page }) => {
  await page.goto(`/en-sa/compare?bikes=${MARLIN},${TALON}&sizes=M,M`);

  await expect(fiches(page, 'en-sa')).toHaveCount(2);
  await expect(etiquette(page)).toHaveCount(0);
});

test('une sélection vide dans l’adresse garde le tableau vide', async ({ page }) => {
  await page.goto('/en-sa/compare?bikes=');

  await expect(fiches(page, 'en-sa')).toHaveCount(0);
  await expect(page.getByText('Add two or three bikes to compare them side by side.')).toBeVisible();
  await expect(etiquette(page)).toHaveCount(0);
});
