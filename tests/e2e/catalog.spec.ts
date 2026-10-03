import { expect, test } from '@playwright/test';
import { expectedBikeCount, readCatalog } from './helpers/catalog-api';

const AR = '/ar-sa/bikes';
const EN = '/en-sa/bikes';

test('la grille charge les velos avec leurs photos', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa');
  await page.goto(EN);

  await expect(page.getByRole('heading', { name: 'Bikes', level: 1 })).toBeVisible();
  // 24 par page : le compteur, lui, annonce le total du catalogue.
  expect(catalog.data.length).toBeGreaterThan(0);
  await expect(page.locator('main a.rounded-xl')).toHaveCount(catalog.data.length);
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('en-sa', catalog.meta.total));
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
  const hauteurs = await cadres.evaluateAll((n) => n.map((e) => e.getBoundingClientRect().height));

  expect(hauteurs.length).toBeGreaterThan(4);
  // Tolerance sub-pixel, pas de confort : sur une grille de 3 colonnes la largeur
  // disponible ne se divise pas en entiers et CSS Grid repartit le reste fractionnaire —
  // les cadres mesurent 294.484 ou 294.5 px selon la colonne. Arrondir tombait pile sur
  // la frontiere .5 et rendait 294 puis 295. Un vrai defaut (16:9 servi sans cadre
  // impose) se compterait en dizaines de pixels.
  const ecart = Math.max(...hauteurs) - Math.min(...hauteurs);
  expect(ecart).toBeLessThan(1);
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

test('un filtre reduit les resultats et vit dans l URL', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa', { brand: 'trek' });
  // L'etat dans l'URL rend un resultat filtre partageable, et evite d'avoir
  // deux sources de verite qui finissent par diverger.
  await page.goto(EN);

  await page.getByLabel('Brand').selectOption('trek');

  await expect(page).toHaveURL(/brand=trek/);
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('en-sa', catalog.meta.total));

  // Sur les CARTES, pas dans le menu deroulant : la liste des marques doit
  // rester complete pour qu'on puisse revenir en arriere.
  await expect(page.locator('main a[href*="/bikes/specialized/"]')).toHaveCount(0);
  expect(catalog.data.length).toBeGreaterThan(0);
  await expect(page.locator('main a[href*="/bikes/trek/"]')).toHaveCount(catalog.data.length);
});

test('deux filtres se combinent', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa', { brand: 'trek', category: 'fat' });
  const brand = await readCatalog(request, 'en-sa', { brand: 'trek' });
  const category = await readCatalog(request, 'en-sa', { category: 'fat' });
  expect(catalog.meta.total).toBeLessThanOrEqual(Math.min(brand.meta.total, category.meta.total));
  expect(catalog.data.length, 'La combinaison choisie doit exercer des cartes').toBeGreaterThan(0);
  for (const bike of catalog.data) {
    expect(bike.brand.slug).toBe('trek');
    expect(bike.category?.key).toBe('fat');
  }
  await page.goto(`${EN}?brand=trek&category=fat`);

  const cards = page.locator('main a.rounded-xl');
  await expect(cards).toHaveCount(catalog.data.length);
  expect(await cards.evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
    .toEqual(catalog.data.map((bike) => `${EN}/${bike.brand.slug}/${bike.slug}`));
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('en-sa', catalog.meta.total));
});

test('les seaux de facettes portent leur decompte', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa');
  // Les decomptes viennent de l'API. Coder une liste de marques en dur cote
  // front deriverait au premier ajout.
  await page.goto(EN);

  const options = page.getByLabel('Brand').locator('option:not([value=""])');
  await expect(options).toHaveText(catalog.facets.brands.map((b) => `${b.label} (${b.count})`));
  expect(await options.evaluateAll((items) => items.map((item) => item.getAttribute('value'))))
    .toEqual(catalog.facets.brands.map((b) => b.key));
});

test('le seau des velos sans categorie declare ses occupants reels', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa');
  // Le seau n'est affiche que si l'API le publie : aucun occupant suppose.
  await page.goto(EN);

  const options = page.getByLabel('Category').locator('option:not([value=""])');
  await expect(options).toHaveText(catalog.facets.categories.map((c) => `${c.label} (${c.count})`));
  const uncategorized = catalog.facets.categories.find((c) => c.key === 'uncategorized');
  const option = page.locator('#category option[value="uncategorized"]');
  if (uncategorized) {
    await expect(option).toHaveText(`${uncategorized.label} (${uncategorized.count})`);
    const filtered = await readCatalog(request, 'en-sa', { category: 'uncategorized' });
    expect(filtered.meta.total).toBe(uncategorized.count);
  } else {
    await expect(option).toHaveCount(0);
  }
});

test('effacer les filtres revient au catalogue entier', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa');
  await page.goto(`${EN}?brand=trek`);

  await page.getByRole('button', { name: 'Clear filters' }).click();

  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('en-sa', catalog.meta.total));
  await expect(page).not.toHaveURL(/brand=/);
});

test('une carte mene a la fiche du velo', async ({ page }) => {
  await page.goto(`${EN}?brand=trek&category=fat`);

  const premiere = page.locator('main a.rounded-xl').first();
  const cible = await premiere.getAttribute('href');
  await premiere.click();

  await expect(page).toHaveURL(new RegExp(cible!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('la version arabe est en RTL et formate ses prix par l API', async ({ page }) => {
  await page.goto(AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // « الدراجات الهوائية » : le générique complet, décision du 4 septembre 2026 —
  // ce H1 est aussi le <title>, et « دراجات » nu appelle la moto.
  await expect(page.getByRole('heading', { name: 'الدراجات الهوائية', level: 1 })).toBeVisible();
  // Un seul systeme de chiffres, 0-9 (decision api #11) : aucun chiffre
  // arabo-indien nulle part, et le prix, formate par Laravel, porte le
  // symbole de la locale arabe avec des chiffres latins.
  await expect(page.locator('main').getByText(/[٠-٩]/)).toHaveCount(0);
  await expect(page.locator('main').getByText(/\d,\d{3}\.\d{2}\sUS\$/).first()).toBeVisible();
});

test('un millesime inconnu est declare sur la carte', async ({ page }) => {
  await page.goto(`${EN}?brand=specialized`);

  await expect(page.getByText('Year not recorded').first()).toBeVisible();
});

test('afficher plus allonge la liste, il ne la remplace jamais', async ({ page, request }) => {
  const nextPage = await readCatalog(request, 'en-sa', { per_page: '48' });
  // Le libellé promet « plus » : les cartes déjà vues restent, les suivantes
  // s'ajoutent dessous. Et le bouton reste un lien — sans JavaScript il
  // fonctionne encore, l'URL se partage et reproduit ce qui était à l'écran.
  await page.goto(EN);

  const cartes = page.locator('main a.rounded-xl');
  const premiere = await cartes.first().getAttribute('href');

  const suite = page.getByRole('link', { name: 'Show more' });
  await expect(suite).toHaveAttribute('href', /per_page=48/);

  await suite.click();
  await expect(page).toHaveURL(/per_page=48/);
  await expect(cartes).toHaveCount(nextPage.data.length);
  // La première carte du premier lot est toujours en tête : rien n'a disparu.
  await expect(cartes.first()).toHaveAttribute('href', premiere!);
});

test('la liste entière se déroule et le bouton s efface à la fin', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa', { per_page: '800' });
  // Le défaut d'origine : la dernière « page » n'affichait que 2 vélos seuls.
  // 800 est la borne de requete existante, pas un nombre de velos attendu.
  expect(catalog.meta.has_more, 'Le scenario de fin de liste doit atteindre tout le catalogue').toBe(false);
  expect(catalog.data).toHaveLength(catalog.meta.total);
  await page.goto(`${EN}?per_page=800`);

  await expect(page.locator('main a.rounded-xl')).toHaveCount(catalog.meta.total);
  await expect(page.getByRole('link', { name: 'Show more' })).toHaveCount(0);
});

test('le catalogue n est pas indexable', async ({ page }) => {
  // Decision du 11 aout 2026 : rien n'est indexe tant que la strategie
  // d'indexation n'est pas decidee.
  const reponse = await page.goto(EN);

  expect(await reponse!.text()).toContain('noindex');
});
