import { expect, test, type APIRequestContext } from '@playwright/test';
import { ACTIVE_HERO_PAIR, HERO_PAIRS, heroPair } from '@/lib/home-hero';
import type { Media } from '@/lib/images';
import { requiredApiBaseUrl } from './helpers/environment';

/*
 * L'accueil montre DEUX VRAIS VÉLOS DE ROUTE FACE À FACE sous ses deux boutons, deux flèches entre eux — décision du
 * fondateur du 21 octobre 2026, d'après le hero de 99 Spokes. Photos du catalogue telles que la marque les publie, choisies
 * pour leur logo ton sur ton ; aucune galerie n'ayant de vue du côté gauche, la photo de DROITE est affichée en miroir
 * (exception à la règle « image non modifiée », décidée par le fondateur, accueil seulement). Chaque photo garde son crédit.
 */
const ACTIVE = HERO_PAIRS.find((p) => p.key === ACTIVE_HERO_PAIR)!;
const [GAUCHE, DROITE] = ACTIVE.bikes;

/** Une photo de l'API, réduite à ce que la règle lit : son id et son crédit. */
const photo = (id: number, attribution: string | null = 'Maison'): Media => {
  const size = (w: number) => ({ url: `https://media.test/${id}/${w}.webp`, w, h: Math.round(w * 0.75) });
  return { id, alt: '', attribution, sizes: { thumb: size(200), card: size(400), detail: size(800), detail_2x: size(1600) } };
};

/** Le crédit de chaque photo de la paire active, tel que l'API le sert — jamais recopié ici. */
async function creditsFromApi(request: APIRequestContext, locale: string): Promise<string[]> {
  const credits: string[] = [];
  for (const { bike, media } of ACTIVE.bikes) {
    const res = await request.get(`${requiredApiBaseUrl()}/v1/${locale}/builds/${bike}`);
    const { data } = await res.json();
    credits.push(data.images.find((m: Media) => m.id === media).attribution);
  }
  return [...new Set(credits)];
}

test.describe('heroPair : la règle seule', () => {
  test('les deux photos servies : la paire, dans l’ordre, la droite en miroir', () => {
    const pair = heroPair(ACTIVE, [[photo(1), photo(GAUCHE.media, 'A')], [photo(DROITE.media, 'B'), photo(2)]]);

    expect(pair?.bikes.map((b) => b.media.id)).toEqual([GAUCHE.media, DROITE.media]);
    expect(pair?.bikes.map((b) => b.mirrored)).toEqual([false, true]);
    expect(pair?.bikes.map((b) => b.frame)).toEqual([GAUCHE.frame, DROITE.frame]);
    expect(pair?.credits).toEqual(['A', 'B']);
  });

  test('une même maison n’est créditée qu’une fois', () => {
    const pair = heroPair(ACTIVE, [[photo(GAUCHE.media, 'Trek')], [photo(DROITE.media, 'Trek')]]);

    expect(pair?.credits).toEqual(['Trek']);
  });

  test('un vélo absent, une photo retirée ou un crédit manquant : pas de paire, l’accueil d’avant', () => {
    expect(heroPair(ACTIVE, [null, [photo(DROITE.media)]])).toBeNull();
    expect(heroPair(ACTIVE, [[photo(GAUCHE.media)], null])).toBeNull();
    expect(heroPair(ACTIVE, [[photo(GAUCHE.media)], [photo(999_999)]])).toBeNull();
    expect(heroPair(ACTIVE, [[photo(GAUCHE.media, null)], [photo(DROITE.media)]])).toBeNull();
    expect(heroPair(ACTIVE, [[photo(GAUCHE.media)], [photo(DROITE.media, '')]])).toBeNull();
  });

  test('la paire active fait partie de la liste, et chaque paire a deux vélos', () => {
    expect(HERO_PAIRS.map((p) => p.key)).toContain(ACTIVE_HERO_PAIR);
    for (const pair of HERO_PAIRS) expect(pair.bikes, pair.key).toHaveLength(2);
  });
});

test('l’API sert toujours la photo de chaque vélo de chaque paire, avec son crédit', async ({ request }) => {
  // Le garde-fou : si une photo disparaît, l'accueil retombe sans bruit sur sa version d'avant — ce test, lui, le dit.
  for (const pair of HERO_PAIRS) {
    for (const { bike, media } of pair.bikes) {
      const res = await request.get(`${requiredApiBaseUrl()}/v1/en-sa/builds/${bike}`);
      expect(res.status(), `${pair.key} ${bike}`).toBe(200);

      const { data } = await res.json();
      const image = data.images.find((m: Media) => m.id === media);
      expect(image, `${pair.key} ${bike} #${media}`).toBeTruthy();
      expect(image.attribution, `${pair.key} ${bike} #${media}`).toBeTruthy();
    }
  }
});

for (const locale of ['ar-sa', 'en-sa'] as const) {
  test(`${locale} : deux vrais vélos face à face sous les boutons, la droite en miroir, crédités`, async ({ page, request }) => {
    await page.goto(`/${locale}`);

    const figure = page.locator('[data-hero-pair]');
    await expect(figure).toBeVisible();
    const velos = figure.locator('[data-hero-bike]');
    await expect(velos).toHaveCount(2);

    for (const [i, { media }] of ACTIVE.bikes.entries()) {
      const img = velos.nth(i).locator('img');
      // La photo de l'API, choisie par le loader du projet — jamais l'optimiseur de Next —, sa place réservée.
      await expect(img).toHaveAttribute('srcset', new RegExp(`/storage/media/${media}/conversions/`));
      await expect(img).toHaveAttribute('width', /^\d+$/);
      await expect(img).toHaveAttribute('height', /^\d+$/);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { message: `photo ${media}` }).toBeGreaterThan(0);
    }

    // Même ordre en arabe et en anglais : la paire ne se retourne pas avec la page.
    const gauche = (await velos.nth(0).boundingBox())!;
    const droite = (await velos.nth(1).boundingBox())!;
    expect(gauche.x).toBeLessThan(droite.x);
    // Les deux roues sur la même ligne : chaque photo est cadrée sur son vélo.
    expect(Math.abs(gauche.y + gauche.height - (droite.y + droite.height))).toBeLessThanOrEqual(1);

    // Seule la photo de droite est en miroir : c'est ce qui met les deux vélos face à face. Tailwind 4 l'écrit dans la
    // propriété `scale` (`-scale-x-100`), une autre écriture passerait par `transform` : les deux sont lues.
    const miroir = (el: Element) => {
      const style = getComputedStyle(el);
      return style.scale.startsWith('-1 ') || /^matrix\(-1, 0, 0, 1,/.test(style.transform);
    };
    expect(await velos.nth(0).evaluate(miroir)).toBe(false);
    expect(await velos.nth(1).evaluate(miroir)).toBe(true);

    // Sous les deux boutons, au-dessus de la bande des marques.
    const boutons = (await page.locator('main > section').first().getByRole('link').last().boundingBox())!;
    expect(gauche.y).toBeGreaterThan(boutons.y + boutons.height);

    // Le crédit de chaque maison, tel que l'API le sert, une fois chacun.
    const credits = await creditsFromApi(request, locale);
    await expect(figure.locator('figcaption')).toHaveText(credits.map((c) => `© ${c}`).join(' · '));
  });
}

test('le cadrage : chaque vélo remplit exactement son cadre, lu sur la photo servie elle-même', async ({ page }) => {
  // Les réglages de `frame` ont été mesurés le 21 octobre 2026 ; si l'API régénère une photo avec d'autres marges, les
  // roues ne tomberaient plus sur la ligne — ce test relit l'alpha de la photo affichée et le dit. Les médias ne
  // portent pas d'en-tête CORS : le test l'ajoute, pour lui seul, afin de lire les pixels.
  await page.route(/\/storage\/media\//, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
  });
  await page.goto('/en-sa');

  const velos = page.locator('[data-hero-pair] [data-hero-bike]');
  await expect(velos).toHaveCount(2);
  for (const i of [0, 1]) {
    const ecarts = await velos.nth(i).evaluate(async (cadre) => {
      const img = cadre.querySelector('img')!;
      if (!img.complete) await new Promise((ok) => img.addEventListener('load', ok, { once: true }));
      const sonde = new Image();
      sonde.crossOrigin = 'anonymous';
      sonde.src = img.currentSrc;
      await sonde.decode();
      const toile = document.createElement('canvas');
      toile.width = sonde.naturalWidth;
      toile.height = sonde.naturalHeight;
      const ctx = toile.getContext('2d')!;
      ctx.drawImage(sonde, 0, 0);
      const { data } = ctx.getImageData(0, 0, toile.width, toile.height);
      let x0 = toile.width, y0 = toile.height, x1 = 0, y1 = 0;
      for (let y = 0; y < toile.height; y++) {
        for (let x = 0; x < toile.width; x++) {
          if (data[(y * toile.width + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      // Le vélo à l'écran : la boîte de la photo, réduite à son emprise visible (miroir compris pour celle de droite).
      const photo = img.getBoundingClientRect();
      const boite = cadre.getBoundingClientRect();
      const sx = photo.width / toile.width, sy = photo.height / toile.height;
      const miroir = getComputedStyle(cadre).scale.startsWith('-1 ');
      const gauche = miroir ? photo.right - (x1 + 1) * sx : photo.left + x0 * sx;
      const droite = miroir ? photo.right - x0 * sx : photo.left + (x1 + 1) * sx;
      return {
        gauche: gauche - boite.left, droite: droite - boite.right,
        haut: photo.top + y0 * sy - boite.top, bas: photo.top + (y1 + 1) * sy - boite.bottom,
      };
    });
    // À 2 px près : la mesure de l'API et l'arrondi d'affichage, jamais une roue coupée ni flottante.
    for (const [bord, ecart] of Object.entries(ecarts)) expect(Math.abs(ecart), `vélo ${i + 1}, bord ${bord}`).toBeLessThanOrEqual(2);
  }
});

test.describe('en thème sombre', () => {
  test.use({ colorScheme: 'dark' });

  test('un halo clair derrière les vélos et leur crédit : des cadres noirs restent visibles sur fond noir', async ({ page }) => {
    await page.goto('/en-sa');

    const scene = page.locator('[data-hero-pair].hero-pair-stage');
    await expect(scene).toBeVisible();
    expect(await scene.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('radial-gradient');
  });
});

test('en thème clair, aucun halo derrière les vélos', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/en-sa');

  const scene = page.locator('[data-hero-pair].hero-pair-stage');
  await expect(scene).toBeVisible();
  expect(await scene.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe('none');
});
