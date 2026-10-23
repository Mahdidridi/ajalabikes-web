import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { BuildCard, CatalogPage, Locale } from '@/lib/api';
import { LEGAL_PAGES } from '@/lib/legal';
import { categorySlug, hasCategoryPage } from '@/lib/routes';
import { INDEXING_LOCKED } from '@/lib/seo';
import { readCatalog } from './helpers/catalog-api';

/**
 * Ouverture a Google (decision du fondateur du 16 octobre 2026) : le verrou d'indexation est leve. Ce fichier remplace
 * `noindex.spec.ts` et garde l'INVERSE de ce qu'il gardait, page par page :
 *
 *  - aucun en-tete `X-Robots-Tag` sur le site : un en-tete global ne peut que fermer, jamais ouvrir — le remettre seul,
 *    sans repasser `INDEXING_LOCKED` a `true`, desindexerait tout le site ;
 *  - `robots.txt` autorise tout sauf le webhook et annonce le sitemap ;
 *  - chaque page suit la politique que l'API ou la page decide : indexable → `index, follow, noimageindex` ; refusee par
 *    l'API (categorie sous le seuil, adresse en attente, pas de photo) ou simple etat d'interface (filtre, comparaison,
 *    etape du bikefinder) → `noindex, follow, noimageindex`. `noimageindex` toujours : les droits des images
 *    constructeur ne sont pas documentes ;
 *  - le sitemap liste exactement les fiches que l'API dit indexables.
 *
 * L'oracle de l'indexabilite est l'API au moment du test, jamais le code du site (un front qui rederiverait la regle
 * pourrait se tromper avec elle).
 */
const SITE = 'https://darrajabikes.com';
const INDEX = 'index, follow, noimageindex';
const NOINDEX = 'noindex, follow, noimageindex';
const LOCALES: Locale[] = ['ar-sa', 'en-sa'];

const robotsOf = async (page: Page, chemin: string) => {
  await page.goto(chemin);
  const balises = page.locator('meta[name="robots"]');
  await expect(balises, chemin).toHaveCount(1);

  return balises.getAttribute('content');
};

/** Tout le catalogue d'une locale, page de curseur apres page de curseur (800 = la borne haute de l'API). */
async function allCards(request: APIRequestContext, locale: Locale): Promise<{ cards: BuildCard[]; first: CatalogPage }> {
  const first = await readCatalog(request, locale, { per_page: '800' });
  const cards = [...first.data];
  const vus = new Set<string>();
  let { has_more, next_cursor } = first.meta;
  while (has_more && next_cursor) {
    expect(vus.has(next_cursor), 'Le curseur API doit progresser').toBe(false);
    vus.add(next_cursor);
    const page = await readCatalog(request, locale, { per_page: '800', cursor: next_cursor });
    cards.push(...page.data);
    ({ has_more, next_cursor } = page.meta);
  }

  return { cards, first };
}

test.describe('verrou leve', () => {
  test('le verrou est leve', () => {
    expect(INDEXING_LOCKED).toBe(false);
  });

  test('aucune reponse du site ne porte X-Robots-Tag', async ({ request }) => {
    // Pages, 404, redirection racine, robots.txt, sitemap et webhook : l'en-tete global a ete retire avec le verrou.
    for (const chemin of ['/ar-sa', '/en-sa/bikes', '/ar-sa/finder', '/en-sa/nulle-part', '/', '/robots.txt', '/sitemap.xml', '/api/revalidate']) {
      const res = await request.get(chemin, { maxRedirects: 0 });

      expect(res.headers()['x-robots-tag'], chemin).toBeUndefined();
    }
  });

  test('robots.txt autorise tout sauf le webhook et annonce le sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
    // Next ecrit `User-Agent` avec sa capitale ; la casse d'un champ est libre (RFC 9309).
    expect((await res.text()).replace(/\r\n/g, '\n').trim()).toBe(
      `User-Agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml`,
    );
  });
});

test.describe('politique robots servie', () => {
  test('les pages sans condition sont indexables', async ({ page }) => {
    const chemins = [
      ...LOCALES.flatMap((l) => [`/${l}`, `/${l}/bikes`, `/${l}/finder`, `/${l}/compare`]),
      ...LOCALES.flatMap((l) => LEGAL_PAGES.map((p) => `/${l}/${p}`)),
    ];
    for (const chemin of chemins) {
      expect(await robotsOf(page, chemin), chemin).toBe(INDEX);
    }
  });

  test('un etat d interface n est jamais indexe, mais ses liens comptent', async ({ page, request }) => {
    const { cards } = await allCards(request, 'en-sa');
    const deux = cards.filter((c) => c.model_path !== null).slice(0, 2).map((c) => `${c.brand.slug}/${c.slug}`);
    expect(deux, 'Deux fiches actuelles sont necessaires pour le comparateur').toHaveLength(2);

    for (const chemin of [
      '/en-sa/bikes?brand=trek',
      '/ar-sa/bikes?sort=price_asc',
      `/en-sa/compare?bikes=${deux.join(',')}`,
    ]) {
      expect(await robotsOf(page, chemin), chemin).toBe(NOINDEX);
    }
  });

  test('marque et categorie : la page suit l avis de l API', async ({ page, request }) => {
    const { first } = await allCards(request, 'en-sa');
    expect(first.facets.brands.length).toBeGreaterThan(0);
    // Au moins une page de chaque sorte, sinon le test ne prouve rien : le jour ou toute categorie depassera le seuil,
    // le cas « refusee » disparaitra des donnees et ce test le dira.
    // Seules les clés qui ont une page (table des slugs) ; le ternaire garde le type de la clé.
    const categories = first.facets.categories.flatMap((c) =>
      hasCategoryPage(c.key) ? [{ key: c.key, indexable: c.indexable }] : [],
    );
    expect(categories.some((c) => c.indexable), 'une categorie indexable').toBe(true);
    expect(categories.some((c) => !c.indexable), 'une categorie sous le seuil (l API la refuse)').toBe(true);

    for (const marque of first.facets.brands) {
      expect(await robotsOf(page, `/en-sa/bikes/${marque.key}`), `marque ${marque.key}`).toBe(marque.indexable ? INDEX : NOINDEX);
    }
    for (const categorie of categories) {
      expect(await robotsOf(page, `/en-sa/${categorySlug(categorie.key)}`), `categorie ${categorie.key}`).toBe(
        categorie.indexable ? INDEX : NOINDEX,
      );
    }
  });

  test('fiche : la page suit l avis de l API, indexable ou refusee pour chacune de ses raisons', async ({ page, request }) => {
    const { cards } = await allCards(request, 'en-sa');
    const indexables = cards.filter((c) => c.indexable && c.model_path !== null);
    expect(indexables.length).toBeGreaterThan(1);

    // Deux fiches indexables, puis une fiche refusee par raison que l'API donne (adresse en attente, categorie sous le
    // seuil, pas de photo…) : chacune reste visible des visiteurs mais sort `noindex`.
    const refusees = new Map<string, BuildCard>();
    for (const c of cards) {
      if (c.indexable) continue;
      const raison = c.indexable_reasons.join('+');
      if (!refusees.has(raison)) refusees.set(raison, c);
    }
    expect(refusees.size, 'l API doit refuser au moins une fiche').toBeGreaterThan(0);

    for (const c of indexables.slice(0, 2)) {
      expect(await robotsOf(page, c.model_path!), c.model_path!).toBe(INDEX);
    }
    for (const [raison, c] of refusees) {
      const chemin = c.model_path ?? `/en-sa/bikes/${c.brand.slug}/${c.slug}`;
      expect(await robotsOf(page, chemin), `${raison} : ${chemin}`).toBe(NOINDEX);
    }
  });
});

test.describe('sitemap', () => {
  test('liste exactement les fiches que l API dit indexables, dans chaque locale, avec leur date', async ({ request }) => {
    const res = await request.get('/sitemap.xml');

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/xml');
    const xml = await res.text();
    const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    expect(new Set(urls).size, 'aucune URL en double').toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(`${SITE}/`), url).toBe(true);
      expect(url, url).not.toMatch(/[?#]/);
    }

    const { cards } = await allCards(request, 'en-sa');
    const indexables = cards.filter((c) => c.indexable);
    const refusees = cards.filter((c) => !c.indexable);
    expect(indexables.length).toBeGreaterThan(0);

    for (const locale of LOCALES) {
      const fiches = urls.filter((u) => new RegExp(`^${SITE}/${locale}/bikes/[^/]+/[^/]+$`).test(u));
      expect(fiches.length, `fiches ${locale}`).toBe(indexables.length);

      // Ce que l'API refuse n'y est pas : ni l'adresse modele, ni l'adresse brute du slug.
      for (const c of refusees) {
        if (c.model_path !== null) expect(urls, c.model_path).not.toContain(`${SITE}${c.model_path.replace(/^\/[a-z]{2}-sa/, `/${locale}`)}`);
        expect(urls, `${locale} ${c.brand.slug}/${c.slug}`).not.toContain(`${SITE}/${locale}/bikes/${c.brand.slug}/${c.slug}`);
      }
    }

    // `lastmod` = la date de dernier changement que l'API sert, sur chaque fiche ; aucune date inventee ailleurs.
    const blocs = xml.split('<url>').slice(1);
    const fiche = (b: string) => /<loc>[^<]*\/bikes\/[^/<]+\/[^/<]+<\/loc>/.test(b);
    for (const bloc of blocs.filter(fiche)) {
      expect(bloc, bloc).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
    }
    for (const bloc of blocs.filter((b) => !fiche(b))) {
      expect(bloc, bloc).not.toContain('<lastmod>');
    }
  });

  test('chaque version de langue d une entree est aussi dans le sitemap', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const urls = new Set(Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]));
    const liens = Array.from(xml.matchAll(/<xhtml:link\b[^>]*\bhref="([^"]+)"/g), (m) => m[1]);

    expect(liens.length).toBeGreaterThan(0);
    for (const href of new Set(liens)) {
      expect(urls.has(href), href).toBe(true);
    }
  });

  test('des pages du sitemap, prises a intervalle regulier, sont bien indexables et canoniques', async ({ page, request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
    const pas = Math.max(1, Math.floor(urls.length / 8));

    for (const url of urls.filter((_, i) => i % pas === 0)) {
      const chemin = url.slice(SITE.length);
      expect(await robotsOf(page, chemin), chemin).toBe(INDEX);
      await expect(page.locator('link[rel="canonical"]'), chemin).toHaveAttribute('href', url);
    }
  });
});
