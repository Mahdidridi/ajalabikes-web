import { expect, test } from '@playwright/test';
import { bikesCount } from '@/lib/vocabulary';
import { expectedBikeCount, readCatalog, requiredFacet } from './helpers/catalog-api';
import { expectArabicCategory, expectLatinBrand } from './helpers/catalog-invariants';

const AR = '/ar-sa';
const EN = '/en-sa';

/** Les signatures de marque, titres h1 de l'accueil — les mêmes que le layout. */
const SIGNATURE_EN = "The Gulf's bike comparison platform";
const SIGNATURE_AR = 'منصة عربية لاكتشاف الدراجات ومقارنتها';

test('la racine redirige vers la locale par defaut', async ({ page }) => {
  // L'arabe est la marque : `/` n'existe pas, il mene a `/ar-sa`.
  await page.goto('/');

  await expect(page).toHaveURL(/\/ar-sa$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('le hero porte la signature, le compteur du catalogue et mene a lui', async ({ page, request }) => {
  const home = await readCatalog(request, 'en-sa', { per_page: '3', sort: 'year_desc' });
  await page.goto(EN);

  // Un seul h1, et c'est la signature de la marque.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: SIGNATURE_EN, level: 1 })).toBeVisible();

  const cta = page.getByRole('link', { name: `Browse ${expectedBikeCount('en-sa', home.meta.total)}`, exact: true });
  await expect(cta).toBeVisible();
  await cta.click();

  await expect(page).toHaveURL(/\/en-sa\/bikes$/);
  const catalog = await readCatalog(request, 'en-sa');
  await expect(page.locator('main header > p')).toBeVisible();
  await expect(page.locator('main header > p')).toHaveText(expectedBikeCount('en-sa', catalog.meta.total));
});

test('la pastille du hero annonce le bikefinder et y mene', async ({ page }) => {
  await page.goto(EN);

  await page.getByRole('link', { name: 'Try it' }).click();

  await expect(page).toHaveURL(/\/en-sa\/finder$/);
});

test('une marque mene a sa page', async ({ page, request }) => {
  const home = await readCatalog(request, 'en-sa', { per_page: '3', sort: 'year_desc' });
  const brand = requiredFacet(home.facets.brands, 'trek');
  await page.goto(EN);

  // Le decompte vient des facettes, pas d'une liste codee en dur.
  await page.getByRole('link', { name: `${brand.label} ${expectedBikeCount('en-sa', brand.count)}`, exact: true }).click();

  // La page marque (`/bikes/{brand}`), pas le catalogue filtre — meme total.
  await expect(page).toHaveURL(/\/en-sa\/bikes\/trek$/);
  const collection = await readCatalog(request, 'en-sa', { brand: 'trek', sort: 'year_desc', per_page: '12' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(brand.label);
  await expect(page.getByText(expectedBikeCount('en-sa', collection.meta.total), { exact: true })).toBeVisible();
});

test('une tuile de categorie mene a sa page', async ({ page, request }) => {
  const home = await readCatalog(request, 'en-sa', { per_page: '3', sort: 'year_desc' });
  const category = requiredFacet(home.facets.categories, 'road');
  await page.goto(EN);

  await page.getByRole('link', { name: `${category.label} ${expectedBikeCount('en-sa', category.count)}`, exact: true }).click();

  // La page categorie (`/{category}-bikes`), titree du libelle de l'API.
  await expect(page).toHaveURL(/\/en-sa\/road-bikes$/);
  const collection = await readCatalog(request, 'en-sa', { category: 'road', sort: 'year_desc', per_page: '12' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(category.label);
  await expect(page.getByText(expectedBikeCount('en-sa', collection.meta.total), { exact: true })).toBeVisible();
});

test('l apercu montre trois cartes, les memes que le catalogue', async ({ page, request }) => {
  const home = await readCatalog(request, 'en-sa', { per_page: '3', sort: 'year_desc' });
  await page.goto(EN);

  const cartes = page.locator('main a.rounded-xl').filter({ has: page.locator('h2') });
  await expect(cartes).toHaveCount(home.data.length);
  expect(home.data.length).toBeGreaterThan(0);
  const hrefs = await cartes.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(hrefs).toEqual(home.data.map((bike) => `/en-sa/bikes/${bike.brand.slug}/${bike.slug}`));

  // « Voir tout » rouvre exactement le tri de l'apercu dans le catalogue :
  // l'accueil ne met en avant aucun velo que l'API n'ordonne pas elle-meme.
  await expect(page.getByRole('link', { name: 'View all' })).toHaveAttribute(
    'href',
    /sort=year_desc/,
  );
});

test('les trois piliers menent au catalogue, au comparateur et au bikefinder', async ({ page }) => {
  await page.goto(EN);

  const piliers = page.getByRole('list').filter({
    has: page.getByRole('heading', { name: 'Choose with the bike finder', level: 3 }),
  });
  await expect(piliers.getByRole('heading', { level: 3 })).toHaveText([
    'Discover',
    'Compare',
    'Choose with the bike finder',
  ]);

  await expect(piliers.getByRole('link', { name: 'Browse the catalogue' })).toHaveAttribute(
    'href',
    '/en-sa/bikes',
  );
  await expect(piliers.getByRole('link', { name: 'Compare bikes' })).toHaveAttribute(
    'href',
    '/en-sa/compare',
  );
  await expect(piliers.getByRole('link', { name: 'Start the bike finder' })).toHaveAttribute(
    'href',
    '/en-sa/finder',
  );
});

test('les chiffres sont ceux de l API : total et facettes', async ({ page, request }) => {
  const home = await readCatalog(request, 'en-sa', { per_page: '3', sort: 'year_desc' });
  await page.goto(EN);

  const chiffres = page.locator('dl').filter({ hasText: 'Wheel sizes' });
  const tuiles = chiffres.locator('div');
  await expect(tuiles).toHaveCount(4);

  await expect(chiffres.locator('dt')).toHaveText(['Bikes', 'Brands', 'Categories', 'Wheel sizes']);
  await expect(chiffres.locator('dd')).toHaveText([
    String(home.meta.total), String(home.facets.brands.length),
    String(home.facets.categories.length), String(home.facets.wheel_sizes.length),
  ]);

  // Aucun chiffre qui ne soit pas dans l'API : ni avis, ni note, ni utilisateurs.
  await expect(page.getByText(/testimonial|review|rating|users/i)).toHaveCount(0);
});

test('l appel final mene au bikefinder', async ({ page }) => {
  await page.goto(EN);

  const cta = page.getByRole('link', { name: 'Start the bike finder' }).last();
  await cta.scrollIntoViewIfNeeded();
  await cta.click();

  await expect(page).toHaveURL(/\/en-sa\/finder$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('la version arabe est en RTL avec les libelles traduits', async ({ page, request }) => {
  const home = await readCatalog(request, 'ar-sa', { per_page: '3', sort: 'year_desc' });
  const city = requiredFacet(home.facets.categories, 'city');
  const brand = requiredFacet(home.facets.brands, 'trek');
  await page.goto(AR);

  for (const category of home.facets.categories.filter((bucket) => bucket.key !== 'uncategorized')) {
    expectArabicCategory(category.label);
  }
  for (const item of home.facets.brands) expectLatinBrand(item.label);
  expect(brand.label).toBe('Trek');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: SIGNATURE_AR, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'اكتشف، قارن، ثم اختر', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'الكتالوج بالأرقام', level: 2 })).toBeVisible();
  // Les libelles des tuiles arrivent traduits de l'API, pas du front.
  await expect(page.getByRole('link', { name: `${city.label} ${expectedBikeCount('ar-sa', city.count)}`, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: `${brand.label} ${expectedBikeCount('ar-sa', brand.count)}`, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ابدأ دليل اختيار الدراجة' })).toHaveAttribute(
    'href',
    '/ar-sa/finder',
  );
});

test('le mot du compteur s accorde au nombre, dans les deux langues', async ({ page, request }) => {
  for (const locale of ['ar-sa', 'en-sa'] as const) {
    const home = await readCatalog(request, locale, { per_page: '3', sort: 'year_desc' });
    expect(home.facets.categories.length).toBeGreaterThan(0);
    await page.goto(`/${locale}`);
    for (const category of home.facets.categories) {
      await expect(page.getByRole('link', {
        name: `${category.label} ${expectedBikeCount(locale, category.count)}`, exact: true,
      })).toBeVisible();
    }
    const prefix = locale === 'ar-sa' ? 'تصفح' : 'Browse';
    await expect(page.getByRole('link', {
      name: `${prefix} ${expectedBikeCount(locale, home.meta.total)}`, exact: true,
    })).toBeVisible();
  }
});

test('l accord couvre aussi les nombres absents du catalogue courant', () => {
  // Cas linguistiques, pas un instantane du catalogue. Oracle et application
  // sont verifies contre ces formes litterales, jamais l'un contre l'autre.
  for (const [count, ar, en] of [
    [0, '0 دراجة', '0 bikes'], [1, '1 دراجة', '1 bike'], [2, '2 دراجة', '2 bikes'],
    [3, '3 دراجات', '3 bikes'], [10, '10 دراجات', '10 bikes'], [11, '11 دراجةً', '11 bikes'],
    [99, '99 دراجةً', '99 bikes'], [100, '100 دراجة', '100 bikes'],
    [101, '101 دراجة', '101 bikes'], [102, '102 دراجة', '102 bikes'],
    [103, '103 دراجات', '103 bikes'], [111, '111 دراجةً', '111 bikes'],
  ] as const) {
    expect(bikesCount('ar-sa', count)).toBe(ar);
    expect(bikesCount('en-sa', count)).toBe(en);
    expect(expectedBikeCount('ar-sa', count)).toBe(ar);
    expect(expectedBikeCount('en-sa', count)).toBe(en);
  }
});

test('en arabe, les fleches « vers la suite » pointent vers la gauche', async ({ page }) => {
  // Le miroir est fait par la variante `rtl:` sur le SVG, jamais par le texte :
  // la meme fleche pointe a droite en anglais, a gauche en arabe.
  await page.goto(AR);
  const fleche = page.getByRole('link', { name: 'عرض الكل' }).locator('svg');
  await expect(fleche).toHaveCSS('scale', '-1 1');

  await page.goto(EN);
  const arrow = page.getByRole('link', { name: 'View all' }).locator('svg');
  await expect(arrow).not.toHaveCSS('scale', '-1 1');
});

test('le logo de la navbar mene a l accueil', async ({ page }) => {
  await page.goto(`${EN}/bikes`);

  await page.locator('header nav').getByRole('link', { name: 'Darraja Bikes' }).click();

  await expect(page).toHaveURL(/\/en-sa$/);
  await expect(page.getByRole('heading', { name: SIGNATURE_EN, level: 1 })).toBeVisible();
});

test('la navbar mene au catalogue, au comparateur et au bikefinder', async ({ page, isMobile }) => {
  await page.goto(EN);
  const nav = page.locator('header nav');

  // `exact` : le logo, lui aussi un lien, contient « Bikes ».
  await expect(nav.getByRole('link', { name: 'Bikes', exact: true })).toHaveAttribute(
    'href',
    '/en-sa/bikes',
  );
  await expect(nav.getByRole('link', { name: 'Compare', exact: true })).toHaveAttribute(
    'href',
    '/en-sa/compare',
  );
  // Le nom du pied de page des `sm` ; sur telephone, la forme courte du pilier de l'accueil.
  await expect(
    nav.getByRole('link', { name: isMobile ? 'Finder' : 'Bike finder', exact: true }),
  ).toHaveAttribute('href', '/en-sa/finder');

  await page.goto(AR);
  await expect(
    nav.getByRole('link', { name: isMobile ? 'الدليل' : 'دليل اختيار الدراجة', exact: true }),
  ).toHaveAttribute('href', '/ar-sa/finder');
});

test('le pied de page porte les liens du site, la signature et la provenance', async ({ page }) => {
  await page.goto(EN);

  const pied = page.locator('footer');
  await expect(pied.getByRole('link', { name: 'Bikes' })).toHaveAttribute('href', '/en-sa/bikes');
  await expect(pied.getByRole('link', { name: 'Compare' })).toHaveAttribute(
    'href',
    '/en-sa/compare',
  );
  await expect(pied.getByRole('link', { name: 'Bike finder' })).toHaveAttribute(
    'href',
    '/en-sa/finder',
  );
  await expect(pied.getByText(SIGNATURE_EN)).toBeVisible();
  await expect(
    pied.getByText("Specifications from manufacturers' official websites."),
  ).toBeVisible();
  await expect(pied.getByText(/© \d{4} Darraja Bikes/)).toBeVisible();
});

test('la page ne deborde pas horizontalement, meme avec les halos du hero', async ({ page }) => {
  for (const chemin of [EN, AR]) {
    await page.goto(chemin);

    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde, chemin).toBe(false);
  }
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
