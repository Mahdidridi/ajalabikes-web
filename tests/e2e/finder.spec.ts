import { expect, test } from '@playwright/test';

const EN = '/en-sa/finder';
const AR = '/ar-sa/finder';

test('le parcours complet mene du premier ecran a une shortlist reelle', async ({ page }) => {
  await page.goto(EN);

  // Les libelles viennent de l'API (arbre localise), pas du front.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Mountain', exact: true }).click();
  await expect(page).toHaveURL(/\/finder\/mountain$/);

  await page.getByRole('link', { name: 'No, pedal power only' }).click();
  await expect(page).toHaveURL(/\/finder\/mountain\/no-power$/);

  await page.getByRole('link', { name: 'Natural trails, up and down' }).click();
  await page.getByRole('link', { name: '$2,500 to $6,000' }).click();

  await expect(page).toHaveURL(/\/finder\/mountain\/no-power\/trails\/budget-mid$/);

  // Les chips recapitulent les choix — transparence du raisonnement.
  await expect(page.getByText('Mountain', { exact: true })).toBeVisible();
  await expect(page.getByText('$2,500 to $6,000')).toBeVisible();

  // La shortlist est faite de VRAIES cartes menant aux fiches.
  const cartes = page.locator('main a.rounded-xl');
  await expect(cartes.first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Compare these bikes' })).toHaveAttribute(
    'href',
    /\/en-sa\/compare\?bikes=/,
  );
});

test('le retour navigateur refait une question en arriere', async ({ page }) => {
  await page.goto(EN);
  await page.getByRole('link', { name: 'Mountain', exact: true }).click();
  await page.getByRole('link', { name: 'No, pedal power only' }).click();
  await expect(page).toHaveURL(/no-power$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/finder\/mountain$/);
});

test('un chemin inconnu rend un 404, pas une page vide', async ({ page }) => {
  const response = await page.goto(`${EN}/mountain/tapis-volant`);
  expect(response?.status()).toBe(404);
});

test('le parcours arabe est en RTL avec les libelles de l API', async ({ page }) => {
  await page.goto(AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // Le libelle de la question racine vient de lang/ar/bikefinder.php.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const premierChoix = page.locator('main ul a').first();
  await expect(premierChoix).toBeVisible();
});
