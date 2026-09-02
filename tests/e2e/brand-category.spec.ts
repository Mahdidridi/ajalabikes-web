import { expect, test } from '@playwright/test';
import { CATEGORY_SLUGS, categoryKeyOf, categorySlug, hasCategoryPage } from '@/lib/routes';

/**
 * Pages marque et catégorie — décision du 2 septembre 2026 (rapport SEO, § 1) :
 * deux pages à chemin propre, bilingues, rendues une fois puis servies du cache.
 *
 *   /{locale}/bikes/{brand}   ex. /ar-sa/bikes/trek
 *   /{locale}/{slug}          ex. /en-sa/road-bikes, e_mtb → /en-sa/electric-mountain-bikes
 *                             (slugs parlants, table de `routes.ts` — décision du 3 septembre 2026)
 *
 * Nom, libellés, décomptes, tuiles et cartes viennent tous de l'API. Les
 * chiffres écrits ici sont ceux du catalogue réel — les mêmes que `home.spec`
 * et `catalog.spec`.
 */
const TREK_AR = '/ar-sa/bikes/trek';
const TREK_EN = '/en-sa/bikes/trek';
const ROAD_EN = '/en-sa/road-bikes';
const FICHE_EN = '/en-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563';

test('la page marque arabe est en RTL et porte le nom, le compteur et les catégories de l API', async ({ page }) => {
  await page.goto(TREK_AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // Un seul h1 : le nom de la marque, tel que l'API le rend — latin canonique.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Trek', level: 1 })).toBeVisible();
  // 196 : le total du filtre brand=trek, le même que le catalogue affiche —
  // suivi du mot mesuré du Golfe, « سيكل », accordé au nombre.
  await expect(page.getByText('196 سيكل')).toBeVisible();

  // Les tuiles sont les catégories DE LA MARQUE — facette filtrée, libellée
  // par l'API dans la langue de la page — et ouvrent le catalogue filtré.
  await expect(page.getByRole('link', { name: 'سيكل رود 32 سيكل' })).toHaveAttribute(
    'href',
    '/ar-sa/bikes?brand=trek&category=road',
  );
  // Une catégorie que Trek n'a pas ne s'affiche pas : la facette est celle du filtre.
  await expect(page.getByRole('link', { name: /سيكلوكروس/ })).toHaveCount(0);

  // La grille : les cartes du catalogue, toutes de la marque.
  const cartes = page.getByRole('link').filter({ has: page.locator('img') });
  await expect(cartes).toHaveCount(12);
  for (const carte of await cartes.all()) {
    await expect(carte).toHaveAttribute('href', /^\/ar-sa\/bikes\/trek\//);
  }

  await expect(page.getByRole('link', { name: 'كل سياكل Trek' })).toHaveAttribute(
    'href',
    '/ar-sa/bikes?brand=trek',
  );
});

test('une marque inconnue rend 404', async ({ page }) => {
  const reponse = await page.goto('/ar-sa/bikes/nimportequoi');

  expect(reponse?.status()).toBe(404);
});

test('la page catégorie anglaise porte le libellé de l API, ses marques et ses cartes', async ({ page }) => {
  await page.goto(ROAD_EN);

  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  // « Road » est le libellé de la facette, pas le segment d'URL.
  await expect(page.getByRole('heading', { name: 'Road', level: 1 })).toBeVisible();
  await expect(page.getByText('137 bikes')).toBeVisible();

  // Les marques présentes dans la catégorie, comptées DANS la catégorie.
  await expect(page.getByRole('link', { name: 'Trek 32 bikes' })).toHaveAttribute(
    'href',
    '/en-sa/bikes?brand=trek&category=road',
  );
  await expect(page.getByRole('link', { name: 'Specialized 38 bikes' })).toBeVisible();

  const cartes = page.getByRole('link').filter({ has: page.locator('img') });
  await expect(cartes).toHaveCount(12);

  await expect(page.getByRole('link', { name: 'All Road bikes' })).toHaveAttribute(
    'href',
    '/en-sa/bikes?category=road',
  );
});

test('le slug de catégorie est parlant, lu dans la table, et vaut dans les deux langues', async ({ page }) => {
  // `e_mtb` → `electric-mountain-bikes` : le mot que l'on cherche, pas la clé de l'API.
  await page.goto('/en-sa/electric-mountain-bikes');
  await expect(page.getByRole('heading', { name: 'Electric mountain', level: 1 })).toBeVisible();
  await expect(page.getByText('82 bikes')).toBeVisible();

  // La même adresse en arabe : le libellé change, le chemin non — la bascule
  // de langue de la navbar mène à LA MÊME page.
  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar-sa\/electric-mountain-bikes$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'سيكل جبلي كهربائي', level: 1 })).toBeVisible();
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

test('la fiche mène à la page de sa marque', async ({ page }) => {
  await page.goto(FICHE_EN);

  await page.locator('main').getByRole('link', { name: 'Trek', exact: true }).click();

  await expect(page).toHaveURL(/\/en-sa\/bikes\/trek$/);
  await expect(page.getByRole('heading', { name: 'Trek', level: 1 })).toBeVisible();
});

test('l accueil mène aux pages marque et catégorie', async ({ page }) => {
  await page.goto('/en-sa');

  await expect(page.getByRole('link', { name: 'Trek 196 bikes' })).toHaveAttribute(
    'href',
    '/en-sa/bikes/trek',
  );
  await expect(page.getByRole('link', { name: 'Road 137 bikes' })).toHaveAttribute(
    'href',
    '/en-sa/road-bikes',
  );
  await expect(page.getByRole('link', { name: 'Electric mountain 82 bikes' })).toHaveAttribute(
    'href',
    '/en-sa/electric-mountain-bikes',
  );
  // Le seau « non catégorisé » n'a pas de page : sa tuile garde le catalogue
  // filtré — un résultat réel, jamais un 404 depuis l'accueil.
  await expect(page.getByRole('link', { name: 'Not categorised 2 bikes' })).toHaveAttribute(
    'href',
    '/en-sa/bikes?category=uncategorized',
  );
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
