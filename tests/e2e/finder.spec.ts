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

/*
 * Decision du 9 octobre 2026 (fondateur) : chaque tuile de la QUESTION RACINE porte une teinte —
 * les quatre du bikefinder de Trek, releves au pixel sur sa page, plus un jaune pour Kids.
 * Meme teinte en clair et en sombre, encre fixe : un fond pastel ne suit pas le theme.
 * Les ecrans suivants restent neutres : cette regle est testee dans `finder-tones.spec.tsx`.
 * Changer une teinte = ce tableau, `globals.css` et `finder/question.tsx` dans le meme commit.
 */
const TEINTES = {
  road: 'rgb(208, 185, 211)', // lavande
  mountain: 'rgb(131, 164, 135)', // vert sauge
  'gravel-cx': 'rgb(108, 168, 187)', // bleu
  'city-fitness': 'rgb(255, 180, 149)', // peche
  kids: 'rgb(246, 215, 124)', // jaune beurre
} as const;

/** Luminance relative WCAG d'une couleur `rgb(r, g, b)` lue dans le style calcule. */
function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).slice(0, 3).map((canal) => {
    const v = Number(canal) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}

for (const locale of ['en-sa', 'ar-sa'] as const) {
  test(`${locale} : chacune des cinq tuiles de la question racine a sa teinte`, async ({ page }) => {
    await page.goto(`/${locale}/finder`);

    for (const [cle, teinte] of Object.entries(TEINTES)) {
      await expect(page.locator(`main ul a[href="/${locale}/finder/${cle}"]`)).toHaveCSS(
        'background-color',
        teinte,
      );
    }
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test(`${scheme} : le texte des tuiles teintees reste lisible, la teinte ne suit pas le theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(EN);
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);

    for (const [cle, teinte] of Object.entries(TEINTES)) {
      const tuile = page.locator(`main ul a[href="/en-sa/finder/${cle}"]`);
      await expect(tuile).toHaveCSS('background-color', teinte);

      const encre = await tuile.evaluate((el) => getComputedStyle(el).color);
      // Seuil AA du texte courant : 4,5.
      expect(contraste(encre, teinte), `${cle} : ${encre} sur ${teinte}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
