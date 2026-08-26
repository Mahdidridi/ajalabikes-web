import { expect, test } from '@playwright/test';

const AR = '/ar-sa';
const EN = '/en-sa';

test('la racine redirige vers la locale par defaut', async ({ page }) => {
  // L'arabe est la marque : `/` n'existe pas, il mene a `/ar-sa`.
  await page.goto('/');

  await expect(page).toHaveURL(/\/ar-sa$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('le hero porte le compteur du catalogue et mene a lui', async ({ page }) => {
  await page.goto(EN);

  await expect(
    page.getByRole('heading', { name: 'Find your next bike', level: 1 }),
  ).toBeVisible();

  // 477 vient de l'API — le meme total que le catalogue affiche.
  const cta = page.getByRole('link', { name: 'Browse 477 bikes' });
  await expect(cta).toBeVisible();
  await cta.click();

  await expect(page).toHaveURL(/\/en-sa\/bikes$/);
  await expect(page.getByText('477 bikes')).toBeVisible();
});

test('un exemple de requete mene au catalogue filtre par marque', async ({ page }) => {
  await page.goto(EN);

  // Le decompte du chip vient des facettes, pas d'une liste codee en dur.
  await page.getByRole('link', { name: 'Trek 196' }).click();

  await expect(page).toHaveURL(/\/en-sa\/bikes\?brand=trek$/);
  await expect(page.getByText('196 bikes')).toBeVisible();
});

test('une tuile de categorie mene au catalogue filtre', async ({ page }) => {
  await page.goto(EN);

  await page.getByRole('link', { name: 'Road 90 bikes' }).click();

  await expect(page).toHaveURL(/category=road/);
  await expect(page.getByText('90 bikes')).toBeVisible();
});

test('l apercu montre quatre cartes, les memes que le catalogue', async ({ page }) => {
  await page.goto(EN);

  // Les seules images de la page sont les cartes — le meme composant que le
  // catalogue, donc les memes liens vers les fiches.
  const cartes = page.getByRole('link').filter({ has: page.locator('img') });
  await expect(cartes).toHaveCount(4);
  await expect(cartes.first()).toHaveAttribute(
    'href',
    /\/en-sa\/bikes\/(trek|specialized|giant)\//,
  );

  // « Voir tout » rouvre exactement le tri de l'apercu dans le catalogue :
  // l'accueil ne met en avant aucun velo que l'API n'ordonne pas elle-meme.
  await expect(page.getByRole('link', { name: 'View all' })).toHaveAttribute(
    'href',
    /sort=year_desc/,
  );
});

test('la version arabe est en RTL avec les libelles traduits', async ({ page }) => {
  await page.goto(AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(
    page.getByRole('heading', { name: 'اعثر على دراجتك القادمة', level: 1 }),
  ).toBeVisible();
  // Les libelles des tuiles arrivent traduits de l'API, pas du front.
  await expect(page.getByRole('link', { name: 'مدينة ولياقة' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trek 196' })).toBeVisible();
});

test('le logo de la navbar mene a l accueil', async ({ page }) => {
  await page.goto(`${EN}/bikes`);

  await page.locator('header nav').getByRole('link', { name: 'Ajala' }).click();

  await expect(page).toHaveURL(/\/en-sa$/);
  await expect(
    page.getByRole('heading', { name: 'Find your next bike', level: 1 }),
  ).toBeVisible();
});

test('le pied de page porte la signature et la provenance des donnees', async ({ page }) => {
  await page.goto(EN);

  const pied = page.locator('footer');
  await expect(pied.getByText("The Gulf's bike comparison platform")).toBeVisible();
  await expect(
    pied.getByText("Specifications from manufacturers' official websites."),
  ).toBeVisible();
});

test('l accueil n est pas indexable', async ({ page }) => {
  // Decision du 11 aout 2026 : rien n'est indexe avant la strategie
  // d'indexation — l'accueil herite du noindex du layout.
  const reponse = await page.goto(EN);

  expect(await reponse!.text()).toContain('noindex');
});

test('aucune image ne repasse par l optimiseur de Next', async ({ page }) => {
  const optimisees: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/_next/image')) optimisees.push(r.url());
  });

  await page.goto(EN);
  await page.waitForLoadState('networkidle');

  expect(optimisees).toEqual([]);
});
