import { expect, test } from '@playwright/test';

const AR = '/ar-sa/bikes';
const EN = '/en-sa/bikes';

test('la grille charge les velos avec leurs photos', async ({ page }) => {
  await page.goto(EN);

  await expect(page.getByRole('heading', { name: 'Bikes', level: 1 })).toBeVisible();
  // 24 par page : le compteur, lui, annonce le total du catalogue.
  await expect(page.getByRole('link').filter({ has: page.locator('img') })).toHaveCount(24);
  await expect(page.getByText('634 bikes')).toBeVisible();
});

test('chaque carte reserve la place de sa photo', async ({ page }) => {
  // Sans dimensions, la grille se decale au chargement et l'utilisateur clique
  // sur la mauvaise carte.
  await page.goto(EN);

  const photos = page.locator('main img');
  const total = await photos.count();
  expect(total).toBeGreaterThan(0);

  for (const photo of await photos.all()) {
    await expect(photo).toHaveAttribute('width', /^\d+$/);
    await expect(photo).toHaveAttribute('height', /^\d+$/);
  }
});

test('les cartes ont toutes la meme hauteur malgre deux formats source', async ({ page }) => {
  // Specialized publie en 16:9, Trek en 4:3. Sans cadre impose, la grille
  // aurait des cartes inegales et le melange se verrait immediatement.
  await page.goto(EN);

  const cadres = page.locator('main .aspect-4\\/3');
  const hauteurs = await cadres.evaluateAll((n) => n.map((e) => Math.round(e.getBoundingClientRect().height)));

  expect(hauteurs.length).toBeGreaterThan(4);
  expect(new Set(hauteurs).size).toBe(1);
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

test('un filtre reduit les resultats et vit dans l URL', async ({ page }) => {
  // L'etat dans l'URL rend un resultat filtre partageable, et evite d'avoir
  // deux sources de verite qui finissent par diverger.
  await page.goto(EN);

  await page.getByLabel('Brand').selectOption('trek');

  await expect(page).toHaveURL(/brand=trek/);
  await expect(page.getByText('196 bikes')).toBeVisible();

  // Sur les CARTES, pas dans le menu deroulant : la liste des marques doit
  // rester complete pour qu'on puisse revenir en arriere.
  await expect(page.locator('main a[href*="/bikes/specialized/"]')).toHaveCount(0);
  await expect(page.locator('main a[href*="/bikes/trek/"]')).toHaveCount(24);
});

test('deux filtres se combinent', async ({ page }) => {
  await page.goto(`${EN}?brand=trek&category=fat`);

  await expect(page.getByText('3 bikes')).toBeVisible();
});

test('les seaux de facettes portent leur decompte', async ({ page }) => {
  // Les decomptes viennent de l'API. Coder une liste de marques en dur cote
  // front deriverait au premier ajout.
  await page.goto(EN);

  const marque = page.getByLabel('Brand');
  await expect(marque.locator('option', { hasText: /Trek \(196\)/ })).toHaveCount(1);
  await expect(marque.locator('option', { hasText: /Specialized \(205\)/ })).toHaveCount(1);
  await expect(marque.locator('option', { hasText: /Giant \(76\)/ })).toHaveCount(1);
  await expect(marque.locator('option', { hasText: /Canyon \(63\)/ })).toHaveCount(1);
  await expect(marque.locator('option', { hasText: /Scott \(94\)/ })).toHaveCount(1);
});

test('le seau des velos sans categorie declare son unique occupant', async ({ page }) => {
  // Le seau « Not categorised » n'existe que si un velo le justifie. Depuis le
  // 26 aout 2026 il en a UN : le Canyon dont le breadcrumb passe par
  // « Outlet|Road Outlet » et les 94 Scott (codes OCC en sac, canonisation a venir) — volontairement non mappes
  // plutot que range dans un seau proche (CategoryTaxonomy).
  await page.goto(EN);

  await expect(
    page.getByLabel('Category').locator('option', { hasText: /Not categorised \(2\)/ }),
  ).toHaveCount(1);
  await expect(
    page.getByLabel('Category').locator('option', { hasText: /Electric mountain \(82\)/ }),
  ).toHaveCount(1);
});

test('effacer les filtres revient au catalogue entier', async ({ page }) => {
  await page.goto(`${EN}?brand=trek`);

  await page.getByRole('button', { name: 'Clear filters' }).click();

  await expect(page.getByText('634 bikes')).toBeVisible();
  await expect(page).not.toHaveURL(/brand=/);
});

test('une carte mene a la fiche du velo', async ({ page }) => {
  await page.goto(`${EN}?brand=trek&category=fat`);

  const premiere = page.getByRole('link').filter({ has: page.locator('img') }).first();
  const cible = await premiere.getAttribute('href');
  await premiere.click();

  await expect(page).toHaveURL(new RegExp(cible!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('la version arabe est en RTL et formate ses prix par l API', async ({ page }) => {
  await page.goto(AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // « السياكل » : le mot mesuré du Golfe, pas « الدراجات » (décision du 3 septembre 2026).
  await expect(page.getByRole('heading', { name: 'السياكل', level: 1 })).toBeVisible();
  // Chiffres arabo-indiens : aucun montant n'est mis en forme cote front.
  await expect(page.locator('main').getByText(/[٠-٩]/).first()).toBeVisible();
});

test('un millesime inconnu est declare sur la carte', async ({ page }) => {
  await page.goto(`${EN}?brand=specialized`);

  await expect(page.getByText('Year not recorded').first()).toBeVisible();
});

test('afficher plus allonge la liste, il ne la remplace jamais', async ({ page }) => {
  // Le libellé promet « plus » : les cartes déjà vues restent, les suivantes
  // s'ajoutent dessous. Et le bouton reste un lien — sans JavaScript il
  // fonctionne encore, l'URL se partage et reproduit ce qui était à l'écran.
  await page.goto(EN);

  const cartes = page.getByRole('link').filter({ has: page.locator('img') });
  const premiere = await cartes.first().getAttribute('href');

  const suite = page.getByRole('link', { name: 'Show more' });
  await expect(suite).toHaveAttribute('href', /per_page=48/);

  await suite.click();
  await expect(page).toHaveURL(/per_page=48/);
  await expect(cartes).toHaveCount(48);
  // La première carte du premier lot est toujours en tête : rien n'a disparu.
  await expect(cartes.first()).toHaveAttribute('href', premiere!);
});

test('la liste entière se déroule et le bouton s efface à la fin', async ({ page }) => {
  // Le défaut d'origine : la dernière « page » n'affichait que 2 vélos seuls.
  // 800 est le PAR_PAGE_MAX de l'API — assez pour les 634 du catalogue.
  await page.goto(`${EN}?per_page=800`);

  await expect(page.locator('main a.rounded-xl')).toHaveCount(634);
  await expect(page.getByRole('link', { name: 'Show more' })).toHaveCount(0);
});

test('le catalogue n est pas indexable', async ({ page }) => {
  // Decision du 11 aout 2026 : rien n'est indexe tant que la strategie
  // d'indexation n'est pas decidee.
  const reponse = await page.goto(EN);

  expect(await reponse!.text()).toContain('noindex');
});
