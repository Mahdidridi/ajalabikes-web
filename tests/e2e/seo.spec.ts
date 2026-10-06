import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { Build, BuildCard, Locale } from '@/lib/api';
import { bikeDescription, hreflangGroup, seoFor } from '@/lib/seo';
import { currentBuild, expectedBikeCount, readBuild, readCatalog, requiredFacet } from './helpers/catalog-api';
import { expectLatinBrand } from './helpers/catalog-invariants';

/**
 * SEO prepare SANS lever le noindex (decisions du 2 septembre 2026, CLAUDE.md
 * « Routes et locales » points 1 a 5) : canonical absolu et sans query,
 * hreflang reciproques ar-SA / ar / en-SA / en / x-default, JSON-LD assemble depuis
 * l'API — et `noindex` toujours present sur chaque page.
 *
 * L'hote canonique est celui de la production : les balises disent ou vit la
 * page, pas d'ou elle est servie. Un serveur local doit donc emettre les
 * memes URL absolues que la prod.
 */
const SITE = 'https://darrajabikes.com';

const modelPath = (build: Build) => {
  expect(build.model_path, 'La fiche choisie doit publier son adresse modele').not.toBeNull();

  return build.model_path!;
};

const localizedBuild = (request: APIRequestContext, locale: Locale, build: Build) =>
  readBuild(request, locale, build.brand.slug, build.slug);

/** Oracle de presentation independant : les champs et tailles viennent de l'API. */
const fullDescription = (locale: Locale, build: Build | BuildCard) => {
  const name = `${build.brand.name} ${build.model_name}${build.year === null ? '' : ` ${build.year_label}`}`;
  const count = build.sizes.length;
  const remainder = count % 100;
  const sizeWord = locale === 'en-sa'
    ? count === 1 ? 'size' : 'sizes'
    : remainder >= 3 && remainder <= 10 ? 'مقاسات' : remainder >= 11 && remainder <= 99 ? 'مقاسًا' : 'مقاس';
  const sizes = count > 0 ? ` (${count} ${sizeWord})` : '';

  return locale === 'en-sa'
    ? `${name}: full specs, geometry by size${sizes}, components and side-by-side comparison.`
    : `دراجة ${name}: المواصفات الكاملة، الهندسة حسب المقاس${sizes}، المكونات، والمقارنة مع دراجات أخرى.`;
};

// Ces scenarios doivent reellement exercer un millesime et un MSRP connus.
const seoBuild = async (request: APIRequestContext, locale: Locale) => {
  let cursor: string | undefined;
  const visited = new Set<string>();
  do {
    const catalog = await readCatalog(request, locale, { per_page: '100', sort: 'year_desc', ...(cursor ? { cursor } : {}) });
    const candidate = catalog.data.find((card) => card.model_path !== null && card.image !== null &&
      card.year !== null && card.msrp_formatted !== null && fullDescription(locale, card).length <= 160);
    if (candidate) {
      const build = await readBuild(request, locale, candidate.brand.slug, candidate.slug);
      expect(build.year, 'Le sujet SEO doit avoir un millesime connu').not.toBeNull();
      expect(build.msrp?.formatted, 'Le sujet SEO doit publier un MSRP').toBeTruthy();
      expect(fullDescription(locale, build).length).toBeLessThanOrEqual(160);
      return build;
    }
    cursor = catalog.meta.next_cursor ?? undefined;
    if (cursor) {
      expect(visited.has(cursor), 'Le curseur API doit progresser').toBe(false);
      visited.add(cursor);
    }
  } while (cursor);
  throw new Error('Une fiche avec millesime, MSRP, photo et description courte est requise pour ce scenario SEO.');
};

const comparisonQuery = async (request: APIRequestContext) => {
  const catalog = await readCatalog(request, 'en-sa');
  const cards = catalog.data.filter((card) => card.model_path !== null).slice(0, 2);
  expect(cards, 'Deux fiches actuelles sont necessaires pour le comparateur').toHaveLength(2);

  return new URLSearchParams({ bikes: cards.map((card) => `${card.brand.slug}/${card.slug}`).join(',') });
};

const longDescriptionBuild = async (request: APIRequestContext) => {
  let cursor: string | undefined;
  const visited = new Set<string>();
  do {
    const catalog = await readCatalog(request, 'en-sa', { per_page: '100', ...(cursor ? { cursor } : {}) });
    const candidate = catalog.data.find((card) => card.model_path !== null && fullDescription('en-sa', card).length > 160);
    if (candidate) {
      return readBuild(request, 'en-sa', candidate.brand.slug, candidate.slug);
    }
    cursor = catalog.meta.next_cursor ?? undefined;
    if (cursor) {
      expect(visited.has(cursor), 'Le curseur API doit progresser').toBe(false);
      visited.add(cursor);
    }
  } while (cursor);

  throw new Error('Le catalogue doit fournir une fiche dont la description depasse 160 caracteres.');
};

/** Les liens hreflang de la page, tels que rendus : `{ 'ar-SA': href, … }`. */
const hreflangs = async (page: Page) => {
  const links = page.locator('link[rel="alternate"][hreflang]');
  // Compter avant Object.fromEntries : une cle dupliquee ne doit pas disparaitre.
  await expect(links).toHaveCount(5);
  return links.evaluateAll((liens) =>
    Object.fromEntries(liens.map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')])),
  );
};

const canonical = (page: Page) => page.locator('link[rel="canonical"]');

type JsonLd = Record<string, unknown> & { '@type': string };

/** Tous les blocs JSON-LD de la page, parses — un bloc illisible fait echouer le test. */
const jsonLd = async (page: Page): Promise<JsonLd[]> => {
  const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();

  return blocs.map((b) => JSON.parse(b));
};

const bloc = (blocs: JsonLd[], type: string) => blocs.find((b) => b['@type'] === type);

test.describe('canonical', () => {
  test('la fiche porte un canonical absolu, sans la query', async ({ page, request }) => {
    const path = modelPath(await currentBuild(request, 'en-sa'));
    await page.goto(`${path}?utm_source=test`);

    await expect(canonical(page)).toHaveAttribute('href', `${SITE}${path}`);
  });

  test('le catalogue filtre garde le canonical du catalogue nu', async ({ page }) => {
    // `?brand=trek` duplique la future page marque, `per_page=` est un etat
    // d'interface : ni l'un ni l'autre n'est une page a part entiere.
    await page.goto('/en-sa/bikes?brand=trek');
    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/en-sa/bikes`);

    await page.goto('/ar-sa/bikes?per_page=48');
    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/ar-sa/bikes`);
  });

  test('le comparateur et le bikefinder ont un canonical sans query', async ({ page, request }) => {
    const query = await comparisonQuery(request);
    query.set('diff', '1');
    await page.goto(`/en-sa/compare?${query}`);
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
  test('la fiche declare cinq alternates, avec auto-reference et catchalls sa', async ({ page, request }) => {
    const build = await currentBuild(request, 'en-sa');
    const buildAr = await localizedBuild(request, 'ar-sa', build);
    await page.goto(modelPath(build));

    expect(await hreflangs(page)).toEqual({
      'ar-SA': `${SITE}${modelPath(buildAr)}`,
      ar: `${SITE}${modelPath(buildAr)}`,
      'en-SA': `${SITE}${modelPath(build)}`,
      en: `${SITE}${modelPath(build)}`,
      // Le repli pour les autres langues est l'anglais : les expatries du Golfe.
      'x-default': `${SITE}${modelPath(build)}`,
    });
  });

  test('les deux locales d une fiche se pointent mutuellement', async ({ page, request }) => {
    // Google ignore un hreflang non reciproque : la page arabe doit declarer
    // exactement le meme groupe que la page anglaise, elle-meme comprise.
    const build = await currentBuild(request, 'en-sa');
    const buildAr = await localizedBuild(request, 'ar-sa', build);
    await page.goto(modelPath(build));
    const depuisEn = await hreflangs(page);

    await page.goto(modelPath(buildAr));
    const depuisAr = await hreflangs(page);

    expect(depuisAr).toEqual(depuisEn);
    expect(depuisAr).toEqual({
      'ar-SA': `${SITE}${modelPath(buildAr)}`,
      ar: `${SITE}${modelPath(buildAr)}`,
      'en-SA': `${SITE}${modelPath(build)}`,
      en: `${SITE}${modelPath(build)}`,
      'x-default': `${SITE}${modelPath(build)}`,
    });
    await expect(canonical(page)).toHaveAttribute('href', depuisAr['ar-SA']!);
  });

  test('le catalogue filtre declare le groupe du catalogue nu', async ({ page }) => {
    await page.goto('/ar-sa/bikes?brand=trek');

    expect(await hreflangs(page)).toEqual({
      'ar-SA': `${SITE}/ar-sa/bikes`,
      ar: `${SITE}/ar-sa/bikes`,
      'en-SA': `${SITE}/en-sa/bikes`,
      en: `${SITE}/en-sa/bikes`,
      'x-default': `${SITE}/en-sa/bikes`,
    });
  });

  test('aucune locale non servie n est declaree', async ({ page }) => {
    // `ae` n'existe pas encore : le declarer enverrait Google vers un 404.
    await page.goto('/en-sa');

    const liens = await hreflangs(page);
    expect(Object.keys(liens).sort()).toEqual(['ar', 'ar-SA', 'en', 'en-SA', 'x-default']);
  });

  for (const [name, path] of [
    ['accueil', ''],
    ['catalogue', '/bikes'],
    ['marque', '/bikes/trek'],
    ['categorie', '/road-bikes'],
    ['comparateur', '/compare'],
    ['finder', '/finder'],
    ['etape finder', '/finder/mountain'],
  ]) {
    test(`${name} : cinq alternates identiques depuis les deux locales`, async ({ page }) => {
      const expected = {
        'ar-SA': `${SITE}/ar-sa${path}`,
        ar: `${SITE}/ar-sa${path}`,
        'en-SA': `${SITE}/en-sa${path}`,
        en: `${SITE}/en-sa${path}`,
        'x-default': `${SITE}/en-sa${path}`,
      };
      for (const locale of ['ar-sa', 'en-sa']) {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status()).toBe(200);
        expect(await hreflangs(page)).toEqual(expected);
        await expect(canonical(page)).toHaveCount(1);
        await expect(canonical(page)).toHaveAttribute('href', `${SITE}/${locale}${path}`);
      }
    });
  }

  test('fonctions pures : catchalls sa, reciprocite et URL sans etat d interface', () => {
    for (const [input, path] of [
      ['', ''],
      ['/', ''],
      ['bikes/trek/marlin-7/?utm_source=test#geometry', '/bikes/trek/marlin-7'],
    ]) {
      const expected = {
        'ar-SA': `${SITE}/ar-sa${path}`,
        ar: `${SITE}/ar-sa${path}`,
        'en-SA': `${SITE}/en-sa${path}`,
        en: `${SITE}/en-sa${path}`,
        'x-default': `${SITE}/en-sa${path}`,
      };
      expect(hreflangGroup(input)).toEqual(expected);
      for (const locale of ['ar-sa', 'en-sa'] as const) {
        const metadata = seoFor({ locale, path: input });
        expect(metadata.alternates).toEqual({
          canonical: `${SITE}/${locale}${path}`,
          languages: expected,
        });
        expect(metadata.robots).toEqual({ index: false, follow: false });
      }
    }
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

  test('la fiche porte un Product sans offre, sans prix, sans note', async ({ page, request }) => {
    const build = await seoBuild(request, 'en-sa');
    await page.goto(modelPath(build));
    const produit = bloc(await jsonLd(page), 'Product');

    expect(produit).toMatchObject({
      '@context': 'https://schema.org',
      name: `${build.brand.name} ${build.model_name}`,
      brand: { '@type': 'Brand', name: build.brand.name },
      url: `${SITE}${modelPath(build)}`,
    });
    expect(produit!.name).not.toContain(build.year_label);

    // Les photos de la galerie, en taille `detail`, en URL absolues.
    const images = produit!.image as string[];
    expect(images.length).toBeGreaterThan(0);
    expect(images).toEqual(build.images.map((image) => image.sizes.detail.url));
    for (const image of images) expect(image).toMatch(/^https:\/\/.+-detail\.webp$/);

    // Le MSRP US n'est pas un prix local : aucune offre. Aucune note fabriquee.
    for (const interdit of ['offers', 'aggregateRating', 'review', 'price']) {
      expect(produit, interdit).not.toHaveProperty(interdit);
    }
    const formatted = build.msrp!.formatted!;
    const amount = formatted.match(/[0-9][0-9,]*(?:\.[0-9]+)?/)?.[0];
    expect(amount, 'Le MSRP choisi doit contenir un montant verifiable').toBeTruthy();
    expect(JSON.stringify(produit)).not.toContain(formatted);
    expect(JSON.stringify(produit)).not.toContain(amount!);
  });

  test('le fil d Ariane de la fiche a quatre maillons absolus', async ({ page, request }) => {
    const build = await seoBuild(request, 'en-sa');
    await page.goto(modelPath(build));
    const fil = bloc(await jsonLd(page), 'BreadcrumbList');

    const maillons = fil!.itemListElement as { position: number; name: string; item: string }[];
    expect(maillons.map((m) => m.position)).toEqual([1, 2, 3, 4]);
    expect(maillons.map((m) => m.name)).toEqual(['Home', 'Bikes', build.brand.name, build.model_name]);
    expect(maillons[3].name).not.toContain(build.year_label);
    expect(maillons.map((m) => m.item)).toEqual([
      `${SITE}/en-sa`,
      `${SITE}/en-sa/bikes`,
      // La page marque est figee par la decision du 2 septembre 2026.
      `${SITE}/en-sa/bikes/${build.brand.slug}`,
      `${SITE}${modelPath(build)}`,
    ]);

    // Une langue par page : les libelles suivent la locale, les noms restent
    // latins. « الدراجات الهوائية » : le generique complet, que Google affiche a la
    // place de l'URL (decision du 3 septembre 2026).
    const buildAr = await localizedBuild(request, 'ar-sa', build);
    await page.goto(modelPath(buildAr));
    const filAr = bloc(await jsonLd(page), 'BreadcrumbList');
    const nomsAr = (filAr!.itemListElement as { name: string }[]).map((m) => m.name);
    expect(nomsAr).toEqual(['الرئيسية', 'الدراجات الهوائية', buildAr.brand.name, buildAr.model_name]);
    expect(nomsAr[3]).not.toContain(buildAr.year_label);
  });

  test('le catalogue nu porte un ItemList des cartes de la page, le filtre non', async ({ page, request }) => {
    const catalog = await readCatalog(request, 'en-sa');
    await page.goto('/en-sa/bikes');
    const liste = bloc(await jsonLd(page), 'ItemList');

    const elements = liste!.itemListElement as { position: number; url: string }[];
    expect(elements).toHaveLength(catalog.data.length);
    expect(elements[0].position).toBe(1);
    expect(elements).toEqual(catalog.data.map((card, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE}/en-sa/bikes/${card.brand.slug}/${card.slug}`,
    })));
    for (const e of elements) expect(e.url).toMatch(new RegExp(`^${SITE}/en-sa/bikes/[a-z0-9-]+/[a-z0-9-]+$`));

    // Un filtre n'est pas une page : il ne decrit rien a Google.
    await page.goto('/en-sa/bikes?brand=trek');
    expect(bloc(await jsonLd(page), 'ItemList')).toBeUndefined();
  });

  test('aucun bloc ne porte de Product hors de la fiche', async ({ page, request }) => {
    const query = await comparisonQuery(request);
    for (const chemin of ['/en-sa', '/en-sa/bikes', `/en-sa/compare?${query}`]) {
      await page.goto(chemin);

      expect(bloc(await jsonLd(page), 'Product'), chemin).toBeUndefined();
    }
  });
});

test.describe('noindex conserve', () => {
  test('chaque page reste noindex malgre canonical et hreflang', async ({ page, request }) => {
    // Le verrou global tient tant que la levee n'est pas decidee : rien ne
    // s'indexe, meme les pages dont la politique cible est « index ».
    for (const chemin of [
      '/ar-sa',
      '/en-sa/bikes',
      '/en-sa/bikes?brand=trek',
      modelPath(await currentBuild(request, 'en-sa')),
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
    for (const chemin of [modelPath(await currentBuild(request, 'en-sa')), '/en-sa/bikes?brand=trek']) {
      const res = await request.get(chemin, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
      });
      // Next ecrit l'attribut `hrefLang` tel quel ; HTML est insensible a la casse.
      const head = (await res.text()).split('</head>')[0].toLowerCase();

      expect(head, chemin).toContain('rel="canonical"');
      const languages = Array.from(head.matchAll(/hreflang="([^"]+)"/g), (match) => match[1]);
      expect(languages.sort(), chemin).toEqual(['ar', 'ar-sa', 'en', 'en-sa', 'x-default']);
      expect(head, chemin).toContain('noindex');
    }
  });
});

test.describe('pages marque et categorie', () => {
  test('la page marque porte canonical, hreflang reciproques et un fil d Ariane a 3 maillons', async ({ page, request }) => {
    const catalog = await readCatalog(request, 'ar-sa', { brand: 'trek', sort: 'year_desc', per_page: '12' });
    const brand = requiredFacet(catalog.facets.brands, 'trek');
    expectLatinBrand(brand.label);
    expect(brand.label).toBe('Trek');
    await page.goto('/ar-sa/bikes/trek');

    await expect(canonical(page)).toHaveAttribute('href', `${SITE}/ar-sa/bikes/trek`);
    const liens = await hreflangs(page);
    expect(liens).toEqual({
      'ar-SA': `${SITE}/ar-sa/bikes/trek`,
      ar: `${SITE}/ar-sa/bikes/trek`,
      'en-SA': `${SITE}/en-sa/bikes/trek`,
      en: `${SITE}/en-sa/bikes/trek`,
      'x-default': `${SITE}/en-sa/bikes/trek`,
    });
    // « دراجات Trek » : le generique en tete du titre — jamais « سياكل Trek ».
    await expect(page).toHaveTitle(`دراجات ${brand.label} · Darraja Bikes`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      `${expectedBikeCount('ar-sa', catalog.meta.total)} من ${brand.label}: المواصفات الكاملة والهندسة حسب المقاس ومقارنة الدراجات الهوائية جنبًا إلى جنب.`,
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
    expect(liens).toEqual({
      'ar-SA': `${SITE}/ar-sa/road-bikes`,
      ar: `${SITE}/ar-sa/road-bikes`,
      'en-SA': `${SITE}/en-sa/road-bikes`,
      en: `${SITE}/en-sa/road-bikes`,
      'x-default': `${SITE}/en-sa/road-bikes`,
    });
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);

    const fil = bloc(await jsonLd(page), 'BreadcrumbList');
    const maillons = fil!.itemListElement as { item: string }[];
    expect(maillons).toHaveLength(2);
    expect(maillons[1].item).toBe(`${SITE}/en-sa/road-bikes`);
  });
});

test.describe('description des fiches', () => {
  const description = (page: Page) => page.locator('meta[name="description"]').getAttribute('content');

  test('chaque fiche a sa propre description, batie sur ses champs', async ({ page, request }) => {
    const build = await seoBuild(request, 'en-sa');
    await page.goto(modelPath(build));
    const first = await description(page);
    // Marque, modele, millesime tel que l'API le libelle, nombre de tailles publiees.
    expect(first).toBe(fullDescription('en-sa', build));
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', first!);

    const catalog = await readCatalog(request, 'en-sa');
    const other = catalog.data.find((card) => card.model_path !== null &&
      fullDescription('en-sa', card).length <= 160 &&
      (card.brand.slug !== build.brand.slug || card.slug !== build.slug));
    expect(other, 'Le catalogue doit fournir une seconde fiche distincte').toBeDefined();
    const secondBuild = await readBuild(request, 'en-sa', other!.brand.slug, other!.slug);
    await page.goto(modelPath(secondBuild));
    const second = await description(page);
    expect(second).toBe(fullDescription('en-sa', secondBuild));
    expect(second).toContain(secondBuild.model_name);
    expect(second).not.toBe(first);
    // Plus jamais la signature partagee par toutes les fiches.
    expect(second).not.toContain('bike comparison platform');
  });

  test('en arabe : « دراجة » en tete, le modele, puis le decompte de tailles accorde', async ({ page, request }) => {
    const build = await seoBuild(request, 'ar-sa');
    await page.goto(modelPath(build));

    const actual = await description(page);
    expect(actual).toBe(fullDescription('ar-sa', build));
    expect(actual).toContain(build.year_label);
  });

  test('une description trop longue est coupee au dernier mot, sous 160 caracteres', async ({ page, request }) => {
    const build = await longDescriptionBuild(request);
    expect(fullDescription('en-sa', build).length).toBeGreaterThan(160);
    await page.goto(modelPath(build));
    const longue = await description(page);

    expect(longue!.length).toBeLessThanOrEqual(160);
    // Pas d'oracle de troncature recopie : prefixe reel, frontiere de mot,
    // puis preuve que le mot suivant ne tiendrait plus. Cas limites litteraux a part.
    const full = fullDescription('en-sa', build);
    const prefix = longue!.slice(0, -1);
    expect(full.startsWith(prefix)).toBe(true);
    const following = full.slice(prefix.length).match(/^[\s،,:;(]+\S+/)?.[0];
    expect(following, 'La coupe doit terminer un mot entier').toBeTruthy();
    expect(`${prefix}${following}…`.length).toBeGreaterThan(160);
    expect(longue).toMatch(/\S…$/);
    expect(longue).not.toContain('comparison.');
  });

  test('la fonction omet ce que la fiche ne publie pas, et coupe proprement', () => {
    const base = {
      brand: { slug: 'marque', name: 'Marque' },
      model_name: 'Modele',
      year: null,
      year_label: 'non renseigne',
      sizes: [],
    };

    // Ni millesime ni tailles : ni l'un ni l'autre n'apparait, rien n'est estime.
    expect(bikeDescription('en-sa', base)).toBe(
      'Marque Modele: full specs, geometry by size, components and side-by-side comparison.',
    );
    expect(bikeDescription('ar-sa', base)).toBe(
      'دراجة Marque Modele: المواصفات الكاملة، الهندسة حسب المقاس، المكونات، والمقارنة مع دراجات أخرى.',
    );

    // Une seule taille : le singulier, dans les deux langues ; 3 a 10 : le pluriel arabe.
    expect(bikeDescription('en-sa', { ...base, sizes: [{}] })).toContain('(1 size)');
    expect(bikeDescription('ar-sa', { ...base, sizes: [{}] })).toContain('(1 مقاس)');
    expect(bikeDescription('ar-sa', { ...base, sizes: [{}, {}, {}] })).toContain('(3 مقاسات)');

    // Coupe au dernier mot entier, jamais au milieu, avec des points de suspension.
    const longue = bikeDescription('en-sa', { ...base, model_name: 'Modele '.repeat(30).trim() });
    expect(longue.length).toBeLessThanOrEqual(160);
    expect(longue).toMatch(/Modele…$/);
  });
});
