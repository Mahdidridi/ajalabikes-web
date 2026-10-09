import { expect, test } from '@playwright/test';

const EN = '/en-sa/finder';
const AR = '/ar-sa/finder';

test('le parcours complet mene du premier ecran a une shortlist reelle', async ({ page }) => {
  await page.goto(EN);

  // Les libelles viennent de l'API (arbre localise), pas du front.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Mountain', exact: true }).click();
  await expect(page).toHaveURL(/\/finder\/mountain$/);

  await page.getByRole('link', { name: 'No, pedal power only' }).click();
  await expect(page).toHaveURL(/\/finder\/mountain\/no-power$/);

  await page.getByRole('link', { name: 'Natural trails, up and down' }).click();
  await page.getByRole('link', { name: '$2,500 to $6,000' }).click();

  await expect(page).toHaveURL(/\/finder\/mountain\/no-power\/trails\/budget-mid$/);

  // Les chips recapitulent les choix — transparence du raisonnement.
  await expect(page.getByText('Mountain', { exact: true })).toBeVisible();
  await expect(page.getByText('$2,500 to $6,000')).toBeVisible();

  // La shortlist est faite de VRAIES cartes menant aux fiches.
  const cartes = page.locator('main a.rounded-xl');
  await expect(cartes.first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Compare these bikes' })).toHaveAttribute(
    'href',
    /\/en-sa\/compare\?bikes=/,
  );
});

test('le retour navigateur refait une question en arriere', async ({ page }) => {
  await page.goto(EN);
  await page.getByRole('link', { name: 'Mountain', exact: true }).click();
  await page.getByRole('link', { name: 'No, pedal power only' }).click();
  await expect(page).toHaveURL(/no-power$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/finder\/mountain$/);
});

test('un chemin inconnu rend un 404, pas une page vide', async ({ page }) => {
  const response = await page.goto(`${EN}/mountain/tapis-volant`);
  expect(response?.status()).toBe(404);
});

test('le parcours arabe est en RTL avec les libelles de l API', async ({ page }) => {
  await page.goto(AR);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // Le libelle de la question racine vient de lang/ar/bikefinder.php.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const premierChoix = page.locator('main ul a').first();
  await expect(premierChoix).toBeVisible();
});

/*
 * Decision du 9 octobre 2026 (fondateur) : chaque tuile de la QUESTION RACINE porte une teinte —
 * les quatre du bikefinder de Trek, releves au pixel sur sa page, plus un jaune pour Kids.
 * Meme teinte en clair et en sombre, encre fixe : un fond pastel ne suit pas le theme.
 * Les ecrans suivants restent neutres : cette regle est testee dans `finder-tones.spec.tsx`.
 * Changer une teinte = ce tableau, `globals.css` et `finder/question.tsx` dans le meme commit.
 */
const TEINTES = {
  road: 'rgb(208, 185, 211)', // lavande
  mountain: 'rgb(131, 164, 135)', // vert sauge
  'gravel-cx': 'rgb(108, 168, 187)', // bleu
  'city-fitness': 'rgb(255, 180, 149)', // peche
  kids: 'rgb(246, 215, 124)', // jaune beurre
} as const;

/** Luminance relative WCAG d'une couleur `rgb(r, g, b)` lue dans le style calcule. */
function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).slice(0, 3).map((canal) => {
    const v = Number(canal) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}

for (const locale of ['en-sa', 'ar-sa'] as const) {
  test(`${locale} : chacune des cinq tuiles de la question racine a sa teinte`, async ({ page }) => {
    await page.goto(`/${locale}/finder`);

    for (const [cle, teinte] of Object.entries(TEINTES)) {
      await expect(page.locator(`main ul a[href="/${locale}/finder/${cle}"]`)).toHaveCSS(
        'background-color',
        teinte,
      );
    }
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test(`${scheme} : le texte des tuiles teintees reste lisible, la teinte ne suit pas le theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(EN);
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);

    for (const [cle, teinte] of Object.entries(TEINTES)) {
      const tuile = page.locator(`main ul a[href="/en-sa/finder/${cle}"]`);
      await expect(tuile).toHaveCSS('background-color', teinte);

      const encre = await tuile.evaluate((el) => getComputedStyle(el).color);
      // Seuil AA du texte courant : 4,5.
      expect(contraste(encre, teinte), `${cle} : ${encre} sur ${teinte}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

/*
 * Illustrations des tuiles — decisions du 9 octobre 2026 (fondateur) : Road et Mountain d'abord,
 * puis les trois autres le meme jour. Le rendu des attributs est teste dans `finder-tones.spec.tsx` ;
 * ici, la vraie page : l'image est CHARGEE (un 404 laisserait une image cassee), ENTIERE dans sa
 * tuile, aux proportions reservees, et les tuiles d'une meme rangee ont la meme hauteur.
 */
for (const locale of ['en-sa', 'ar-sa'] as const) {
  test(`${locale} : chaque tuile montre son illustration, entiere, dans sa tuile`, async ({ page }) => {
    await page.goto(`/${locale}/finder`);

    for (const cle of ['road', 'mountain', 'gravel-cx', 'city-fitness', 'kids']) {
      const tuile = page.locator(`main ul a[href="/${locale}/finder/${cle}"]`);
      const image = tuile.locator('img');
      await expect(image).toBeVisible();

      // Chargee : un fichier absent laisserait une largeur naturelle nulle.
      await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)), { message: cle })
        .toBeGreaterThan(0);

      // Entiere : jamais rognee, sa boite tient dans celle de la tuile.
      const t = await tuile.boundingBox();
      const i = await image.boundingBox();
      if (!t || !i) throw new Error(`${cle} : boite introuvable`);
      expect(i.x, `${cle} : bord debut`).toBeGreaterThanOrEqual(t.x);
      expect(i.y, `${cle} : bord haut`).toBeGreaterThanOrEqual(t.y);
      expect(i.x + i.width, `${cle} : bord fin`).toBeLessThanOrEqual(t.x + t.width);
      expect(i.y + i.height, `${cle} : bord bas`).toBeLessThanOrEqual(t.y + t.height);

      // Proportions reservees (attributs width/height) = celles du fichier servi. Pour une image a
      // `srcset` en largeurs, `naturalWidth` est corrige de la densite puis arrondi au pixel CSS (155 x 84
      // ici : 1 % de bruit) : on relit donc les vraies dimensions du fichier choisi, sans `srcset`.
      const ratios = await image.evaluate(async (el: HTMLImageElement) => {
        const brut = new Image();
        brut.src = el.currentSrc;
        await brut.decode();
        return {
          reserve: Number(el.getAttribute('width')) / Number(el.getAttribute('height')),
          fichier: brut.naturalWidth / brut.naturalHeight,
          choisi: el.currentSrc,
        };
      });
      expect(Math.abs(ratios.reserve - ratios.fichier) / ratios.fichier, `${cle} : ${JSON.stringify(ratios)}`).toBeLessThan(0.01);
    }
  });
}

test('les tuiles d une meme rangee ont la meme hauteur, illustrees ou non', async ({ page }) => {
  await page.goto(EN);

  const boites = await page.locator('main ul a').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { haut: Math.round(r.top), hauteur: Math.round(r.height) };
    }),
  );
  expect(boites.length).toBeGreaterThan(0);

  const rangees = new Map<number, number[]>();
  for (const { haut, hauteur } of boites) rangees.set(haut, [...(rangees.get(haut) ?? []), hauteur]);
  for (const [haut, hauteurs] of rangees) {
    expect(new Set(hauteurs).size, `rangee a ${haut} px : hauteurs ${hauteurs}`).toBe(1);
  }
});

// Dix fichiers, noms versionnes (`-v1`) : le cache peut etre immuable, un remplacement change le nom.
for (const nom of ['road', 'mountain', 'gravel', 'city', 'kids']) {
  for (const largeur of [320, 480]) {
    test(`/finder-art/${nom}-${largeur}-v1.webp est servi en WebP et immuable`, async ({ request }) => {
      const reponse = await request.get(`/finder-art/${nom}-${largeur}-v1.webp`);

      expect(reponse.status()).toBe(200);
      expect(reponse.headers()['content-type']).toBe('image/webp');
      expect(reponse.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
    });
  }
}
