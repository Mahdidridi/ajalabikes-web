import { expect, test } from '@playwright/test';
import { CATEGORY_SLUGS, categoryKeyOf, categorySlug, hasCategoryPage } from '@/lib/routes';
import { currentBuild, expectedBikeCount, readCatalog, requiredFacet } from './helpers/catalog-api';

/**
 * Pages marque et catégorie — décision du 2 septembre 2026 (rapport SEO, § 1) :
 * deux pages à chemin propre, bilingues, rendues une fois puis servies du cache.
 *
 *   /{locale}/bikes/{brand}   ex. /ar-sa/bikes/trek
 *   /{locale}/{slug}          ex. /en-sa/road-bikes, e_mtb → /en-sa/electric-mountain-bikes
 *                             (slugs parlants, table de `routes.ts` — décision du 3 septembre 2026)
 *
 * Nom, libellés, décomptes, tuiles et cartes viennent tous de l'API. Les
 * attentes sont lues dans la meme requete API que chaque page, au moment du test.
 */
const TREK_AR = '/ar-sa/bikes/trek';
const TREK_EN = '/en-sa/bikes/trek';
const ROAD_EN = '/en-sa/road-bikes';

test('la page marque arabe est en RTL et porte le nom, le compteur et les catégories de l API', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'ar-sa', { brand: 'trek', sort: 'year_desc', per_page: '12' });
  const brand = requiredFacet(catalog.facets.brands, 'trek');
  await page.goto(TREK_AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // Un seul h1 : le nom de la marque, tel que l'API le rend — latin canonique.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(brand.label);
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('ar-sa', catalog.meta.total));

  // Les tuiles sont les catégories DE LA MARQUE — facette filtrée, libellée
  // par l'API dans la langue de la page — et ouvrent le catalogue filtré.
  const categories = page.locator('main a[href^="/ar-sa/bikes?brand=trek&category="]');
  await expect(categories).toHaveCount(catalog.facets.categories.length);
  for (const category of catalog.facets.categories) {
    const tile = page.getByRole('link', {
      name: `${category.label} ${expectedBikeCount('ar-sa', category.count)}`, exact: true,
    });
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAttribute('href', `/ar-sa/bikes?brand=trek&category=${category.key}`);
  }
  // Aucun seau absent de la facette filtree, quelle que soit son evolution.
  expect(await categories.evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).searchParams.get('category'))))
    .toEqual(catalog.facets.categories.map((c) => c.key));

  // La grille : les cartes du catalogue, toutes de la marque.
  const cartes = page.getByRole('link').filter({ has: page.locator('img') });
  expect(catalog.data.length).toBeGreaterThan(0);
  await expect(cartes).toHaveCount(catalog.data.length);
  for (const carte of await cartes.all()) {
    await expect(carte).toHaveAttribute('href', /^\/ar-sa\/bikes\/trek\//);
  }

  await expect(page.getByRole('link', { name: `كل دراجات ${brand.label}`, exact: true })).toHaveAttribute(
    'href',
    '/ar-sa/bikes?brand=trek',
  );
});

test('une marque inconnue rend 404', async ({ page }) => {
  const reponse = await page.goto('/ar-sa/bikes/nimportequoi');

  expect(reponse?.status()).toBe(404);
});

test('la page catégorie anglaise porte le libellé de l API, ses marques et ses cartes', async ({ page, request }) => {
  const catalog = await readCatalog(request, 'en-sa', { category: 'road', sort: 'year_desc', per_page: '12' });
  const category = requiredFacet(catalog.facets.categories, 'road');
  await page.goto(ROAD_EN);

  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  // « Road » est le libellé de la facette, pas le segment d'URL.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(category.label);
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('en-sa', catalog.meta.total));

  // Les marques présentes dans la catégorie, comptées DANS la catégorie.
  const brands = page.locator('main a[href$="&category=road"]');
  await expect(brands).toHaveCount(catalog.facets.brands.length);
  for (const brand of catalog.facets.brands) {
    const tile = page.getByRole('link', {
      name: `${brand.label} ${expectedBikeCount('en-sa', brand.count)}`, exact: true,
    });
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAttribute('href', `/en-sa/bikes?brand=${brand.key}&category=road`);
  }

  const cartes = page.getByRole('link').filter({ has: page.locator('img') });
  expect(catalog.data.length).toBeGreaterThan(0);
  await expect(cartes).toHaveCount(catalog.data.length);

  await expect(page.getByRole('link', { name: `All ${category.label} bikes`, exact: true })).toHaveAttribute(
    'href',
    '/en-sa/bikes?category=road',
  );
});

test('le slug de catégorie est parlant, lu dans la table, et vaut dans les deux langues', async ({ page, request }) => {
  const en = await readCatalog(request, 'en-sa', { category: 'e_mtb', sort: 'year_desc', per_page: '12' });
  // `e_mtb` → `electric-mountain-bikes` : le mot que l'on cherche, pas la clé de l'API.
  await page.goto('/en-sa/electric-mountain-bikes');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(requiredFacet(en.facets.categories, 'e_mtb').label);
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('en-sa', en.meta.total));

  // La même adresse en arabe : le libellé change, le chemin non — la bascule
  // de langue de la navbar mène à LA MÊME page.
  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar-sa\/electric-mountain-bikes$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const ar = await readCatalog(request, 'ar-sa', { category: 'e_mtb', sort: 'year_desc', per_page: '12' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(requiredFacet(ar.facets.categories, 'e_mtb').label);
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('ar-sa', ar.meta.total));
});

test('la table des slugs est une bijection stricte sur les seize catégories', () => {
  // Chaque clé de l'API a son slug, chaque slug rend sa clé — et rien d'autre.
  const cles = Object.keys(CATEGORY_SLUGS);
  expect(cles).toHaveLength(16);
  for (const cle of cles) {
    expect(hasCategoryPage(cle), cle).toBe(true);
    expect(categoryKeyOf(categorySlug(cle as keyof typeof CATEGORY_SLUGS)), cle).toBe(cle);
  }
  expect(categorySlug('e_mtb')).toBe('electric-mountain-bikes');
  expect(categorySlug('e_city')).toBe('electric-city-bikes');
  expect(categorySlug('cross_country')).toBe('cross-country-bikes');

  // L'inverse est strict : ni la clé brute, ni l'ancien slug dérivé, ni un
  // état de la donnée, ni une propriété héritée d'`Object`.
  for (const segment of ['e_mtb', 'e-mtb-bikes', 'e_mtb-bikes', 'uncategorized-bikes', 'bikes', 'constructor', '']) {
    expect(categoryKeyOf(segment), segment).toBeNull();
  }
  expect(hasCategoryPage('uncategorized')).toBe(false);
  expect(hasCategoryPage('constructor')).toBe(false);
});

test('le seau des vélos sans catégorie n a pas de page', async ({ page }) => {
  // « Non catégorisé » est un état de la donnée, pas une catégorie.
  const reponse = await page.goto('/en-sa/uncategorized-bikes');

  expect(reponse?.status()).toBe(404);
});

test('un segment inconnu à la racine de la locale rend 404', async ({ page }) => {
  // `e-mtb-bikes` : l'ancien slug dérivé de la clé, en ligne quelques heures
  // et jamais indexé — 404, pas de redirection.
  for (const chemin of [
    '/en-sa/nimportequoi',
    '/en-sa/nimportequoi-bikes',
    '/ar-sa/-bikes',
    '/en-sa/e-mtb-bikes',
    '/en-sa/e_mtb',
  ]) {
    const reponse = await page.goto(chemin);

    expect(reponse?.status(), chemin).toBe(404);
  }
});

test('les segments statiques gardent la main sur la page catégorie', async ({ page }) => {
  // `bikes`, `compare` et `finder` sont des dossiers statiques à côté de
  // `[category]` : Next les fait gagner. Vérifié, pas supposé.
  const bikes = await page.goto('/en-sa/bikes');
  expect(bikes?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Bikes', level: 1 })).toBeVisible();

  const compare = await page.goto('/en-sa/compare');
  expect(compare?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Compare bikes', level: 1 })).toBeVisible();

  const finder = await page.goto('/en-sa/finder');
  expect(finder?.status()).toBe(200);
  await expect(page).toHaveURL(/\/en-sa\/finder$/);
  // Dans `main` : la navbar porte aussi « Bike finder », masqué sur téléphone.
  await expect(page.locator('main').getByText('Bike finder').first()).toBeVisible();
});

test('la fiche mène à la page de sa marque', async ({ page, request }) => {
  const build = await currentBuild(request, 'en-sa', { brand: 'trek' });
  expect(build.model_path).not.toBeNull();
  await page.goto(build.model_path!);

  await page.locator('main').getByRole('link', { name: build.brand.name, exact: true }).click();

  await expect(page).toHaveURL(/\/en-sa\/bikes\/trek$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(build.brand.name);
});

test('l accueil mène aux pages marque et catégorie', async ({ page, request }) => {
  const home = await readCatalog(request, 'en-sa', { per_page: '3', sort: 'year_desc' });
  await page.goto('/en-sa');

  const trek = requiredFacet(home.facets.brands, 'trek');
  await expect(page.getByRole('link', {
    name: `${trek.label} ${expectedBikeCount('en-sa', trek.count)}`, exact: true,
  })).toHaveAttribute('href', '/en-sa/bikes/trek');
  for (const [key, path] of [['road', '/en-sa/road-bikes'], ['e_mtb', '/en-sa/electric-mountain-bikes']]) {
    const category = requiredFacet(home.facets.categories, key);
    await expect(page.getByRole('link', {
      name: `${category.label} ${expectedBikeCount('en-sa', category.count)}`, exact: true,
    })).toHaveAttribute('href', path);
  }
  // Le seau « non catégorisé » n'a pas de page : sa tuile garde le catalogue
  // filtré — un résultat réel, jamais un 404 depuis l'accueil.
  const uncategorized = home.facets.categories.find((c) => c.key === 'uncategorized');
  const tile = page.locator('a[href="/en-sa/bikes?category=uncategorized"]');
  if (uncategorized) {
    await expect(tile).toHaveAccessibleName(`${uncategorized.label} ${expectedBikeCount('en-sa', uncategorized.count)}`);
    await expect(tile).toBeVisible();
  } else {
    await expect(tile).toHaveCount(0);
  }
});

test('les deux pages ne sont pas indexables', async ({ page }) => {
  // Décision du 28 août 2026 : rien n'est indexé tant que les URL ne sont pas
  // figées. Le helper SEO (canonical, hreflang) viendra par-dessus.
  for (const chemin of [TREK_EN, ROAD_EN]) {
    const reponse = await page.goto(chemin);

    expect(await reponse!.text(), chemin).toContain('noindex');
  }
});

test('les deux pages sont rendues une fois puis servies du cache', async ({ request }) => {
  // Même schéma que la fiche : ISR, tag `catalog`. La preuve est l'en-tête
  // `x-nextjs-cache` ; on attend le HIT en interrogeant, pour rester
  // insensible aux purges que `cache.spec` lance en parallèle.
  for (const chemin of [TREK_EN, ROAD_EN]) {
    await request.get(chemin);

    await expect
      .poll(async () => (await request.get(chemin)).headers()['x-nextjs-cache'], {
        message: `${chemin} devrait être servie du cache`,
      })
      .toBe('HIT');
  }
});
