import { expect, test } from '@playwright/test';

const TREK = '/ar-sa/bikes/trek/fuel-mx-9-8-xt';
const TREK_EN = '/en-sa/bikes/trek/fuel-mx-9-8-xt';
const SPECIALIZED = '/en-sa/bikes/specialized/allez-elite';

test('la fiche arabe est en RTL et affiche le reach en millimetres', async ({ page }) => {
  await page.goto(TREK);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'Fuel MX 9.8 XT' })).toBeVisible();

  // Chiffres arabo-indiens, formates par Laravel et non par le front.
  await expect(page.getByText('٤٢٦ مم')).toBeVisible();
  // La valeur telle que Trek la publie reste visible a cote.
  await expect(page.getByText('42.6 cm')).toBeVisible();
});

test('la meme fiche en anglais passe en LTR', async ({ page }) => {
  await page.goto(TREK_EN);

  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByText('426 mm')).toBeVisible();
});

test('un prix ne devient jamais zero', async ({ page }) => {
  // Ce test visait le Trek quand il n'avait pas de prix. Depuis que le MSRP
  // remonte du listing, AUCUN des 98 velos n'en est depourvu : le rendu de
  // l'absence n'est plus atteignable depuis les donnees reelles.
  //
  // La regle elle-meme reste verrouillee cote API, sur fixture figee —
  // `BuildImporterTest::test_a_build_without_price_keeps_a_null_msrp_and_never_zero`,
  // ou le Chisel est volontairement prive de prix. Ce qui se verifie ici, c'est
  // qu'aucun zero ne s'affiche a l'ecran, dans les deux systemes de chiffres.
  await page.goto(TREK);

  await expect(page.getByText('٥٬٩٩٩٫٩٩', { exact: false })).toBeVisible();
  await expect(page.getByText('٠٫٠٠')).toHaveCount(0);
  await expect(page.getByText('0.00')).toHaveCount(0);
});

test('une annee inconnue est declaree, pas masquee', async ({ page }) => {
  // Sur un SPECIALIZED : la marque ne publie pas de millesime par fiche, alors
  // que Trek le porte dans son JSON de listing. Le vide se teste la ou il est.
  await page.goto('/ar-sa/bikes/specialized/allez-elite');

  await expect(page.getByText('السنة غير محددة')).toBeVisible();
});

test('un millesime publie par la marque est affiche tel quel', async ({ page }) => {
  await page.goto(TREK_EN);

  await expect(page.getByText('2027', { exact: true })).toBeVisible();
});

test('un prix present porte toujours son avertissement', async ({ page }) => {
  await page.goto(SPECIALIZED);

  await expect(page.getByText('$1,350.00')).toBeVisible();
  await expect(page.getByText('Not a local price')).toBeVisible();
});

test('les deux marques affichent leur reach en millimetres', async ({ page }) => {
  await page.goto(TREK_EN);
  const trek = await page.getByRole('row').filter({ hasText: 'Reach' }).first().innerText();

  await page.goto(SPECIALIZED);
  const spec = await page.getByRole('row').filter({ hasText: 'Reach' }).first().innerText();

  // Le critere du chantier, verifie a l'ecran : deux unites d'origine, une seule en sortie.
  expect(trek).toContain('mm');
  expect(trek).toContain('42.6 cm'); // publie en centimetres
  expect(spec).toContain('mm');
  expect(spec).toContain('mm'); // publie deja en millimetres
});

test('changer de taille change la geometrie sans recharger', async ({ page }) => {
  await page.goto(TREK_EN);

  await expect(page.getByText('426 mm')).toBeVisible();
  await page.getByRole('button', { name: 'XL', exact: false }).first().click();
  await expect(page.getByText('507 mm')).toBeVisible();
});

test('le mullet garde sa taille de roue brute', async ({ page }) => {
  await page.goto(TREK_EN);

  await expect(page.getByText('29"/27.5"')).toBeVisible();
});

test('un montage inconnu rend 404', async ({ page }) => {
  const response = await page.goto('/ar-sa/bikes/trek/inexistant');

  expect(response?.status()).toBe(404);
});
