import { expect, test, type Page } from '@playwright/test';

/**
 * Le comparateur. Deux Trek de la même famille : ils partagent le cadre et
 * diffèrent par la fourche, ce qui donne des lignes `same` ET `differs` dans
 * la même page — le filtre « différences » devient alors réellement testable.
 */
const EN = '/en-sa/compare';
const A = 'trek/farley-5';
const B = 'trek/farley-7';

/** Une colonne = un vélo. Le lien vers la fiche en est le marqueur sûr. */
const colonnes = (page: Page) => page.getByRole('link', { name: 'View details' });

test('la page vide est une vraie page, pas un cul-de-sac', async ({ page }) => {
  // Un lien de navbar qui mène à un écran mort coûte plus qu'il ne rapporte.
  await page.goto(EN);

  await expect(page.getByRole('heading', { name: 'Compare bikes', level: 1 })).toBeVisible();
  await expect(page.getByText('Add two or three bikes to compare them side by side.')).toBeVisible();
  await expect(page.getByPlaceholder('Find a bike…')).toBeVisible();
});

test('choisir deux velos par le selecteur remplit les colonnes', async ({ page }) => {
  await page.goto(EN);

  await page.getByPlaceholder('Find a bike…').fill('Farley 5');
  await page.getByRole('button', { name: 'Trek Farley 5' }).click();
  await expect(page).toHaveURL(/farley-5/);
  await expect(colonnes(page)).toHaveCount(1);

  await page.getByPlaceholder('Find a bike…').fill('Farley 7');
  await page.getByRole('button', { name: 'Trek Farley 7' }).click();
  await expect(page).toHaveURL(/farley-7/);
  await expect(colonnes(page)).toHaveCount(2);

  // La comparaison n'existe qu'à partir de deux vélos.
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Components' })).toBeVisible();
});

test('un velo deja choisi ne se propose plus', async ({ page }) => {
  // Se comparer à soi-même est refusé par l'API (422) : l'interface ne doit
  // même pas offrir le chemin qui y mène.
  await page.goto(`${EN}?bikes=${A}`);

  await page.getByPlaceholder('Find a bike…').fill('Farley');

  await expect(page.getByRole('button', { name: 'Trek Farley 5' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Trek Farley 7' })).toBeVisible();
});

test('la troisieme colonne remplie ferme le selecteur', async ({ page }) => {
  await page.goto(`${EN}?bikes=${A},${B},specialized/chisel`);

  await expect(colonnes(page)).toHaveCount(3);
  await expect(page.getByPlaceholder('Find a bike…')).toHaveCount(0);
});

test('retirer un velo laisse les autres en place', async ({ page }) => {
  await page.goto(`${EN}?bikes=${A},${B}`);

  await page.getByRole('link', { name: 'Remove' }).first().click();

  await expect(colonnes(page)).toHaveCount(1);
  await expect(page).toHaveURL(/farley-7/);
  await expect(page).not.toHaveURL(/farley-5/);
});

test('la geometrie reste fermee tant que CHAQUE velo n a pas sa taille', async ({ page }) => {
  // Règle non négociable : jamais de comparaison silencieuse entre tailles.
  // Une taille sur deux ne suffit pas — c'est exactement le cas qui produirait
  // un tableau faux sans lever la moindre erreur.
  await page.goto(`${EN}?bikes=${A},${B}`);

  await expect(page.getByText('Select a size for each bike to compare geometry.')).toBeVisible();
  await expect(page.getByText('Seat tube angle')).toHaveCount(0);

  await page.getByLabel('Choose size').first().selectOption('M');

  await expect(page).toHaveURL(/sizes=M/);
  await expect(page.getByText('Select a size for each bike to compare geometry.')).toBeVisible();
  await expect(page.getByText('Seat tube angle')).toHaveCount(0);
});

test('les deux tailles ouvrent la geometrie et gardent la valeur constructeur', async ({ page }) => {
  await page.goto(`${EN}?bikes=${A},${B}&sizes=M,M`);

  await expect(page.getByText('Select a size for each bike to compare geometry.')).toHaveCount(0);
  await expect(page.getByText('Seat tube angle').first()).toBeVisible();

  // Trek publie en CENTIMÈTRES. La cellule affiche le millimètre normalisé et
  // conserve « 42.0 cm » à côté : la conversion reste vérifiable à l'œil, et un
  // facteur 10 ne peut plus passer inaperçu.
  const ligne = page.getByRole('row').filter({ hasText: 'Seat tube length' });
  await expect(ligne.getByText('420 mm').first()).toBeVisible();
  await expect(ligne.getByText('42.0 cm').first()).toBeVisible();
});

test('la taille se change apres coup sans perdre la comparaison', async ({ page }) => {
  await page.goto(`${EN}?bikes=${A},${B}&sizes=M,M`);

  await page.getByLabel('Choose size').nth(1).selectOption('XL');

  await expect(page).toHaveURL(/sizes=M(%2C|,)XL/);
  await expect(colonnes(page)).toHaveCount(2);
  await expect(page.getByText('Seat tube angle').first()).toBeVisible();
});

test('seulement les differences masque les lignes identiques', async ({ page }) => {
  // Le front FILTRE sur le statut calculé par Laravel — il ne compare rien.
  await page.goto(`${EN}?bikes=${A},${B}`);

  await expect(page.getByText('Frame', { exact: true })).toBeVisible();
  await expect(page.getByText('Fork', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Differences only' }).click();

  await expect(page).toHaveURL(/diff=1/);
  await expect(page.getByText('Frame', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fork', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'All rows' }).click();
  await expect(page.getByText('Frame', { exact: true })).toBeVisible();
});

test('une donnee absente est declaree, jamais inventee', async ({ page }) => {
  // Depuis le 25 août 2026, le listing searchProducts fournit le millésime à
  // presque tout Specialized — le Chisel, ancien cobaye de ce test, est daté.
  // L'Allez Elite, lui, a été retiré du catalogue AVANT cette découverte : son
  // année est réellement inconnue, et la ligne doit le DIRE.
  await page.goto(`${EN}?bikes=${A},specialized/allez-elite`);

  const ligne = page.getByRole('row').filter({ hasText: 'Model year' });
  await expect(ligne.getByText('2027')).toBeVisible();
  await expect(ligne.getByText('Year not recorded')).toBeVisible();
});

test('la navbar est sur toutes les pages et mene au comparateur', async ({ page }) => {
  await page.goto('/en-sa/bikes');

  const nav = page.locator('header nav');
  await expect(nav.getByRole('link', { name: 'Bikes', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Compare' }).click();

  await expect(page).toHaveURL(/\/en-sa\/compare/);
  await expect(page.locator('header nav').getByRole('link', { name: 'Bikes', exact: true })).toBeVisible();
});

test('la bascule de langue conserve la page ET la comparaison en cours', async ({ page }) => {
  // Changer de langue au milieu d'une comparaison ne doit pas la perdre :
  // c'est la même donnée, dans l'autre locale.
  await page.goto(`${EN}?bikes=${A},${B}&sizes=M,L`);

  await page.getByRole('link', { name: 'العربية' }).click();

  await expect(page).toHaveURL(/\/ar-sa\/compare/);
  await expect(page).toHaveURL(/farley-5/);
  await expect(page).toHaveURL(/sizes=M/);
  await expect(page.getByRole('link', { name: 'عرض التفاصيل' })).toHaveCount(2);
});

test('la version arabe est en RTL et localise ses libelles par l API', async ({ page }) => {
  await page.goto(`/ar-sa/compare?bikes=${A},${B}&sizes=M,M`);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'قارن السياكل', level: 1 })).toBeVisible();
  // Les libellés de sections et de lignes viennent de Laravel, pas d'un
  // dictionnaire front qui dériverait au premier champ ajouté.
  await expect(page.getByRole('heading', { name: 'القياسات الهندسية' })).toBeVisible();

  // La mesure est en chiffres arabo-indiens, la publication constructeur reste
  // telle quelle : aucun nombre n'est mis en forme côté front.
  const ligne = page.getByRole('row').filter({ hasText: '42.0 cm' });
  await expect(ligne.getByText('٤٢٠').first()).toBeVisible();
});

test('le theme reste commande depuis le comparateur', async ({ page }) => {
  // Le bouton a migré du catalogue vers la navbar : il doit rester opérant sur
  // les pages qui ne l'hébergeaient pas auparavant.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`${EN}?bikes=${A},${B}`);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('aucune image du comparateur ne repasse par l optimiseur de Next', async ({ page }) => {
  // Les conversions sont déjà générées par Laravel et servies par le CDN.
  const optimisees: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/_next/image')) optimisees.push(r.url());
  });

  await page.goto(`${EN}?bikes=${A},${B}`);
  await page.waitForLoadState('networkidle');

  expect(optimisees).toEqual([]);
});

test('le comparateur n est pas indexable', async ({ page }) => {
  const reponse = await page.goto(`${EN}?bikes=${A},${B}`);

  expect(await reponse!.text()).toContain('noindex');
});

test('un velo inconnu dans l URL donne un 404, pas une page a moitie vide', async ({ page }) => {
  const reponse = await page.goto(`${EN}?bikes=${A},trek/nexistepas`);

  expect(reponse!.status()).toBe(404);
});
