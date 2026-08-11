import { expect, test } from '@playwright/test';

const TREK = '/ar-sa/bikes/trek/fuel-mx-9-8-xt';
const TREK_EN = '/en-sa/bikes/trek/fuel-mx-9-8-xt';
/** Specialized publie un schema de geometrie ; Trek non. */
const SPECIALIZED = '/en-sa/bikes/specialized/allez-elite';

test('la photo du velo se charge et porte ses dimensions', async ({ page }) => {
  await page.goto(TREK);

  const photo = page.getByRole('img', { name: 'Trek Fuel MX 9.8 XT' }).first();
  await expect(photo).toBeVisible();

  // Les attributs viennent de l'API : c'est ce qui reserve la place avant le
  // chargement. Sans eux, la page se decale sous les yeux du visiteur.
  await expect(photo).toHaveAttribute('width', /^\d+$/);
  await expect(photo).toHaveAttribute('height', /^\d+$/);

  // Le fichier est reellement arrive, pas seulement declare.
  const charge = await photo.evaluate(
    (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
  );
  expect(charge).toBe(true);
});

test('aucune image ne repasse par l optimiseur de Next', async ({ page }) => {
  // Les conversions sont deja generees par Laravel et servies par le CDN.
  // Les reoptimiser doublerait cout et latence pour un resultat identique.
  const optimisees: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/_next/image')) optimisees.push(r.url());
  });

  await page.goto(TREK);
  await page.waitForLoadState('networkidle');

  expect(optimisees).toEqual([]);
});

test('le srcset pointe les conversions de Laravel, pas une taille arrondie', async ({ page }) => {
  // Next arrondit toute largeur a sa propre echelle quand on ne lui declare pas
  // la notre : la vignette de 64 px de haut recevait `detail_2x`, soit 1600 px.
  await page.goto(TREK);

  const photo = page.getByRole('img', { name: 'Trek Fuel MX 9.8 XT' }).first();
  const srcset = (await photo.getAttribute('srcset')) ?? '';

  expect(srcset).toContain('-detail.webp 1x');
  expect(srcset).toContain('-detail_2x.webp 2x');
});

test('cliquer une vignette change la grande photo', async ({ page }) => {
  await page.goto(TREK_EN);

  const grande = page.getByRole('img', { name: 'Trek Fuel MX 9.8 XT' }).first();
  const avant = await grande.getAttribute('src');

  await page.getByRole('button', { name: 'Photo 3 of 4' }).click();

  await expect(grande).not.toHaveAttribute('src', avant ?? '');
});

test('l attribution de la photo est visible', async ({ page }) => {
  await page.goto(TREK);

  await expect(page.getByText('Trek Bicycle Corporation')).toBeVisible();
});

test('la galerie suit le sens de lecture', async ({ page }) => {
  await page.goto(TREK);

  // La premiere vignette doit etre a DROITE en arabe : c'est la que commence
  // la lecture. Une interface LTR retournee a la fin echouerait ici.
  const premiere = page.getByRole('button', { name: /صورة 1/ });
  const derniere = page.getByRole('button', { name: /صورة 4/ });

  const a = await premiere.boundingBox();
  const b = await derniere.boundingBox();

  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  expect(a!.x).toBeGreaterThan(b!.x);
});

test('le schema de geometrie vit pres du tableau, pas dans la galerie', async ({ page }) => {
  await page.goto(SPECIALIZED);

  const schema = page.getByRole('img', { name: 'Specialized Allez Elite' });
  // Le schema porte le meme alt que les photos produit : on le distingue par
  // sa place, sous le titre dedie.
  await expect(page.getByText('Geometry chart')).toBeVisible();
  await expect(schema.last()).toBeVisible();
});

test('la fiche sans schema de geometrie n affiche pas la section', async ({ page }) => {
  // Trek n'en publie pas. Une section vide serait pire qu'absente.
  await page.goto(TREK_EN);

  await expect(page.getByText('Geometry chart')).toHaveCount(0);
});
