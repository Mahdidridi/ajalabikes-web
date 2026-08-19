import { expect, test } from '@playwright/test';

const EN = '/en-sa/bikes';

test('la bascule force le sombre et s en souvient au rechargement', async ({ page }) => {
  // Préférence système CLAIRE, aucun choix mémorisé : la page démarre claire.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(EN);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Le choix survit au rechargement — il est mémorisé, pas éphémère.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('le choix explicite l emporte sur la préférence système', async ({ page }) => {
  // Système SOMBRE : la page démarre sombre…
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(EN);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // …mais un clic force le clair, et le fond suit réellement.
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const fond = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(fond).toBe('rgb(255, 255, 255)');
});
