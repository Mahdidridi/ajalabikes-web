import { expect, test } from '@playwright/test';

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

test('le hero porte la signature, le compteur du catalogue et mene a lui', async ({ page }) => {
  await page.goto(EN);

  // Un seul h1, et c'est la signature de la marque.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: SIGNATURE_EN, level: 1 })).toBeVisible();

  // 634 vient de l'API — le meme total que le catalogue affiche.
  const cta = page.getByRole('link', { name: 'Browse 634 bikes' });
  await expect(cta).toBeVisible();
  await cta.click();

  await expect(page).toHaveURL(/\/en-sa\/bikes$/);
  await expect(page.getByText('634 bikes')).toBeVisible();
});

test('la pastille du hero annonce le bikefinder et y mene', async ({ page }) => {
  await page.goto(EN);

  await page.getByRole('link', { name: 'Try it' }).click();

  await expect(page).toHaveURL(/\/en-sa\/finder$/);
});

test('une marque mene a sa page', async ({ page }) => {
  await page.goto(EN);

  // Le decompte vient des facettes, pas d'une liste codee en dur.
  await page.getByRole('link', { name: 'Trek 196 bikes' }).click();

  // La page marque (`/bikes/{brand}`), pas le catalogue filtre — meme total.
  await expect(page).toHaveURL(/\/en-sa\/bikes\/trek$/);
  await expect(page.getByRole('heading', { name: 'Trek', level: 1 })).toBeVisible();
  await expect(page.getByText('196 bikes')).toBeVisible();
});

test('une tuile de categorie mene a sa page', async ({ page }) => {
  await page.goto(EN);

  await page.getByRole('link', { name: 'Road 137 bikes' }).click();

  // La page categorie (`/{category}-bikes`), titree du libelle de l'API.
  await expect(page).toHaveURL(/\/en-sa\/road-bikes$/);
  await expect(page.getByRole('heading', { name: 'Road', level: 1 })).toBeVisible();
  await expect(page.getByText('137 bikes')).toBeVisible();
});

test('l apercu montre trois cartes, les memes que le catalogue', async ({ page }) => {
  await page.goto(EN);

  // Les seules images de la page sont les cartes — le meme composant que le
  // catalogue, donc les memes liens vers les fiches.
  const cartes = page.getByRole('link').filter({ has: page.locator('img') });
  await expect(cartes).toHaveCount(3);
  await expect(cartes.first()).toHaveAttribute(
    'href',
    /\/en-sa\/bikes\/(trek|specialized|giant|canyon|scott)\//,
  );

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

test('les chiffres sont ceux de l API : total et facettes', async ({ page }) => {
  await page.goto(EN);

  const chiffres = page.locator('dl').filter({ hasText: 'Wheel sizes' });
  const tuiles = chiffres.locator('div');
  await expect(tuiles).toHaveCount(4);

  // Le total du catalogue, puis les cinq marques — les memes que la bande des marques.
  await expect(tuiles.nth(0)).toContainText('634');
  await expect(tuiles.nth(0)).toContainText('Bikes');
  await expect(tuiles.nth(1)).toContainText('5');
  await expect(tuiles.nth(1)).toContainText('Brands');
  await expect(tuiles.nth(2)).toContainText('Categories');
  await expect(tuiles.nth(3)).toContainText('Wheel sizes');

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

test('la version arabe est en RTL avec les libelles traduits', async ({ page }) => {
  await page.goto(AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: SIGNATURE_AR, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'اكتشف، قارن، ثم اختر', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'الكتالوج بالأرقام', level: 2 })).toBeVisible();
  // Les libelles des tuiles arrivent traduits de l'API, pas du front.
  await expect(page.getByRole('link', { name: 'دراجات هوائية للمدينة والهجين' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trek 196 دراجةً' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ابدأ دليل اختيار الدراجة' })).toHaveAttribute(
    'href',
    '/ar-sa/finder',
  );
});

test('le mot du compteur s accorde au nombre, dans les deux langues', async ({ page }) => {
  // Le generique arabe est « دراجة » (decision du 4 septembre 2026) ; la regle du
  // nombre — 3 a 10 « دراجات », 11 a 99 l'accusatif « دراجةً », le reste « دراجة » — vient
  // d'`Intl.PluralRules`, pas d'une liste ecrite a la main. Les decomptes sont
  // ceux des facettes de l'API.
  await page.goto(AR);
  await expect(page.getByRole('link', { name: 'إندورو 4 دراجات' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'سيكلوكروس 1 دراجة' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'للطريق 137 دراجةً' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'تصفح 634 دراجةً' })).toBeVisible();

  // En anglais, le singulier existe aussi : « 1 bike », jamais « 1 bikes ».
  await page.goto(EN);
  await expect(page.getByRole('link', { name: 'Cyclocross 1 bike' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enduro 4 bikes' })).toBeVisible();
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
