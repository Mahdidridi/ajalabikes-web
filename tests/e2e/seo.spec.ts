import { expect, test, type Page } from '@playwright/test';

/**
 * SEO prepare SANS lever le noindex (decisions du 2 septembre 2026, CLAUDE.md
 * « Routes et locales » points 1 a 5) : canonical absolu et sans query,
 * hreflang reciproques ar-SA / en-SA / x-default, JSON-LD assemble depuis
 * l'API — et `noindex` toujours present sur chaque page.
 *
 * L'hote canonique est celui de la production : les balises disent ou vit la
 * page, pas d'ou elle est servie. Un serveur local doit donc emettre les
 * memes URL absolues que la prod.
 */
const SITE = 'https://darrajabikes.com';
const FUEL = '/bikes/trek/fuel-mx-9-8-xt-gen-7-81563';
const FUEL_EN = `/en-sa${FUEL}`;
const FUEL_AR = `/ar-sa${FUEL}`;

/** Les liens hreflang de la page, tels que rendus : `{ 'ar-SA': href, … }`. */
const hreflangs = (page: Page) =>
  page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((liens) =>
      Object.fromEntries(liens.map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')])),
    );

const canonical = (page: Page) => page.locator('link[rel="canonical"]');

type JsonLd = Record<string, unknown> & { '@type': string };

/** Tous les blocs JSON-LD de la page, parses — un bloc illisible fait echouer le test. */
const jsonLd = async (page: Page): Promise<JsonLd[]> => {
  const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();

  return blocs.map((b) => JSON.parse(b));
};

const bloc = (blocs: JsonLd[], type: string) => blocs.find((b) => b['@type'] === type);

test.describe('canonical', () => {
  test('la fiche porte un canonical absolu, sans la query', async ({ page }) => {
    await page.goto(`${FUEL_EN}?utm_source=test`);

    await expect(canonical(page)).toHaveAttribute('href', `${SITE}${FUEL_EN}`);
  });

  test('le catalogue filtre garde le canonical du catalogue nu', async ({ page }) => {
    // `?brand=trek` duplique la future page marque, `per_page=` est un etat
    // d'interface : ni l'un ni l'autre n'est une page a part entiere.
    await page.goto('/en-sa/bikes?brand=trek');
    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/en-sa/bikes`);

    await page.goto('/ar-sa/bikes?per_page=48');
    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/ar-sa/bikes`);
  });

  test('le comparateur et le bikefinder ont un canonical sans query', async ({ page }) => {
    await page.goto('/en-sa/compare?bikes=trek/farley-5,trek/farley-7&diff=1');
    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/en-sa/compare`);

    await page.goto('/ar-sa/finder');
    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/ar-sa/finder`);

    await page.goto('/en-sa/finder/mountain');
    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/en-sa/finder/mountain`);
  });

  test('l accueil a un canonical par locale', async ({ page }) => {
    await page.goto('/ar-sa');

    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/ar-sa`);
  });
});

test.describe('hreflang', () => {
  test('la fiche declare ar-SA, en-SA et x-default, avec auto-reference', async ({ page }) => {
    await page.goto(FUEL_EN);

    expect(await hreflangs(page)).toEqual({
      'ar-SA': `${SITE}${FUEL_AR}`,
      'en-SA': `${SITE}${FUEL_EN}`,
      // Le repli pour les autres langues est l'anglais : les expatries du Golfe.
      'x-default': `${SITE}${FUEL_EN}`,
    });
  });

  test('les deux locales d une fiche se pointent mutuellement', async ({ page }) => {
    // Google ignore un hreflang non reciproque : la page arabe doit declarer
    // exactement le meme groupe que la page anglaise, elle-meme comprise.
    await page.goto(FUEL_EN);
    const depuisEn = await hreflangs(page);

    await page.goto(FUEL_AR);
    const depuisAr = await hreflangs(page);

    expect(depuisAr).toEqual(depuisEn);
    await expect(canonical(page)).toHaveAttribute('href', depuisAr['ar-SA']!);
  });

  test('le catalogue filtre declare le groupe du catalogue nu', async ({ page }) => {
    await page.goto('/ar-sa/bikes?brand=trek');

    expect(await hreflangs(page)).toEqual({
      'ar-SA': `${SITE}/ar-sa/bikes`,
      'en-SA': `${SITE}/en-sa/bikes`,
      'x-default': `${SITE}/en-sa/bikes`,
    });
  });

  test('aucune locale non servie n est declaree', async ({ page }) => {
    // `ae` n'existe pas encore : le declarer enverrait Google vers un 404.
    await page.goto('/en-sa');

    const liens = await hreflangs(page);
    expect(Object.keys(liens).sort()).toEqual(['ar-SA', 'en-SA', 'x-default']);
  });
});

test.describe('JSON-LD', () => {
  test('l accueil porte WebSite et Organization, sans SearchAction', async ({ page }) => {
    await page.goto('/ar-sa');
    const blocs = await jsonLd(page);

    const site = bloc(blocs, 'WebSite');
    expect(site).toMatchObject({
      '@context': 'https://schema.org',
      name: 'Darraja Bikes',
      alternateName: 'دراجة',
      inLanguage: 'ar',
    });
    // Google a retire la sitelinks search box en 2024 : rien a declarer.
    expect(site).not.toHaveProperty('potentialAction');

    expect(bloc(blocs, 'Organization')).toMatchObject({ name: 'Darraja Bikes', alternateName: 'دراجة' });

    await page.goto('/en-sa');
    expect(bloc(await jsonLd(page), 'WebSite')).toMatchObject({ inLanguage: 'en' });
  });

  test('la fiche porte un Product sans offre, sans prix, sans note', async ({ page }) => {
    await page.goto(FUEL_EN);
    const produit = bloc(await jsonLd(page), 'Product');

    expect(produit).toMatchObject({
      '@context': 'https://schema.org',
      name: 'Trek Fuel MX 9.8 XT Gen 7',
      brand: { '@type': 'Brand', name: 'Trek' },
      url: `${SITE}${FUEL_EN}`,
    });

    // Les photos de la galerie, en taille `detail`, en URL absolues.
    const images = produit!.image as string[];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image).toMatch(/^https:\/\/.+-detail\.webp$/);

    // Le MSRP US n'est pas un prix local : aucune offre. Aucune note fabriquee.
    for (const interdit of ['offers', 'aggregateRating', 'review', 'price']) {
      expect(produit, interdit).not.toHaveProperty(interdit);
    }
    expect(JSON.stringify(produit)).not.toContain('5,999');
  });

  test('le fil d Ariane de la fiche a quatre maillons absolus', async ({ page }) => {
    await page.goto(FUEL_EN);
    const fil = bloc(await jsonLd(page), 'BreadcrumbList');

    const maillons = fil!.itemListElement as { position: number; name: string; item: string }[];
    expect(maillons.map((m) => m.position)).toEqual([1, 2, 3, 4]);
    expect(maillons.map((m) => m.name)).toEqual(['Home', 'Bikes', 'Trek', 'Fuel MX 9.8 XT Gen 7']);
    expect(maillons.map((m) => m.item)).toEqual([
      `${SITE}/en-sa`,
      `${SITE}/en-sa/bikes`,
      // La page marque est figee par la decision du 2 septembre 2026.
      `${SITE}/en-sa/bikes/trek`,
      `${SITE}${FUEL_EN}`,
    ]);

    // Une langue par page : les libelles suivent la locale, les noms restent
    // latins. « السياكل » : le mot mesure du Golfe, que Google affiche a la
    // place de l'URL (decision du 3 septembre 2026).
    await page.goto(FUEL_AR);
    const filAr = bloc(await jsonLd(page), 'BreadcrumbList');
    const nomsAr = (filAr!.itemListElement as { name: string }[]).map((m) => m.name);
    expect(nomsAr).toEqual(['الرئيسية', 'السياكل', 'Trek', 'Fuel MX 9.8 XT Gen 7']);
  });

  test('le catalogue nu porte un ItemList des cartes de la page, le filtre non', async ({ page }) => {
    await page.goto('/en-sa/bikes');
    const liste = bloc(await jsonLd(page), 'ItemList');

    const elements = liste!.itemListElement as { position: number; url: string }[];
    expect(elements).toHaveLength(24);
    expect(elements[0].position).toBe(1);
    for (const e of elements) expect(e.url).toMatch(new RegExp(`^${SITE}/en-sa/bikes/[a-z0-9-]+/[a-z0-9-]+$`));

    // Un filtre n'est pas une page : il ne decrit rien a Google.
    await page.goto('/en-sa/bikes?brand=trek');
    expect(bloc(await jsonLd(page), 'ItemList')).toBeUndefined();
  });

  test('aucun bloc ne porte de Product hors de la fiche', async ({ page }) => {
    for (const chemin of ['/en-sa', '/en-sa/bikes', '/en-sa/compare?bikes=trek/farley-5,trek/farley-7']) {
      await page.goto(chemin);

      expect(bloc(await jsonLd(page), 'Product'), chemin).toBeUndefined();
    }
  });
});

test.describe('noindex conserve', () => {
  test('chaque page reste noindex malgre canonical et hreflang', async ({ page }) => {
    // Le verrou global tient tant que la levee n'est pas decidee : rien ne
    // s'indexe, meme les pages dont la politique cible est « index ».
    for (const chemin of [
      '/ar-sa',
      '/en-sa/bikes',
      '/en-sa/bikes?brand=trek',
      FUEL_EN,
      '/en-sa/compare',
      '/en-sa/finder',
    ]) {
      await page.goto(chemin);

      const robots = page.locator('meta[name="robots"]');
      await expect(robots, chemin).toHaveCount(1);
      await expect(robots, chemin).toHaveAttribute('content', /noindex/);
    }
  });

  test('un robot sans JavaScript recoit canonical et hreflang dans le head', async ({ request }) => {
    // Next diffère les metadonnees des pages dynamiques dans le <body> pour
    // les navigateurs ; les robots « HTML seulement » (Bingbot ici) doivent les
    // trouver dans le <head>, avant tout script.
    for (const chemin of [FUEL_EN, '/en-sa/bikes?brand=trek']) {
      const res = await request.get(chemin, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
      });
      // Next ecrit l'attribut `hrefLang` tel quel ; HTML est insensible a la casse.
      const head = (await res.text()).split('</head>')[0].toLowerCase();

      expect(head, chemin).toContain('rel="canonical"');
      expect(head, chemin).toContain('hreflang="ar-sa"');
      expect(head, chemin).toContain('hreflang="x-default"');
      expect(head, chemin).toContain('noindex');
    }
  });
});

test.describe('pages marque et categorie', () => {
  test('la page marque porte canonical, hreflang reciproques et un fil d Ariane a 3 maillons', async ({ page }) => {
    await page.goto('/ar-sa/bikes/trek');

    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/ar-sa/bikes/trek`);
    const liens = await hreflangs(page);
    expect(liens['ar-SA']).toBe(`${SITE}/ar-sa/bikes/trek`);
    expect(liens['en-SA']).toBe(`${SITE}/en-sa/bikes/trek`);
    expect(liens['x-default']).toBe(`${SITE}/en-sa/bikes/trek`);
    // « سياكل Trek », le mot mesure du Golfe en tete du titre — jamais « دراجات Trek ».
    await expect(page).toHaveTitle('سياكل Trek · Darraja Bikes');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /^196 سيكل من Trek: .*الدراجات الهوائية/,
    );

    const fil = bloc(await jsonLd(page), 'BreadcrumbList');
    const maillons = fil!.itemListElement as { item: string }[];
    expect(maillons).toHaveLength(3);
    expect(maillons[2].item).toBe(`${SITE}/ar-sa/bikes/trek`);
  });

  test('la page categorie porte canonical, hreflang et un fil d Ariane a 2 maillons', async ({ page }) => {
    await page.goto('/en-sa/road-bikes');

    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/en-sa/road-bikes`);
    const liens = await hreflangs(page);
    expect(liens['ar-SA']).toBe(`${SITE}/ar-sa/road-bikes`);
    expect(liens['x-default']).toBe(`${SITE}/en-sa/road-bikes`);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);

    const fil = bloc(await jsonLd(page), 'BreadcrumbList');
    const maillons = fil!.itemListElement as { item: string }[];
    expect(maillons).toHaveLength(2);
    expect(maillons[1].item).toBe(`${SITE}/en-sa/road-bikes`);
  });
});
