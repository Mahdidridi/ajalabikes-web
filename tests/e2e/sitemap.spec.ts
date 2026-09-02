import { expect, test } from '@playwright/test';
import { INDEXING_LOCKED, robotsRules } from '@/lib/seo';
import { sitemapEntries, type SitemapData } from '@/lib/sitemap';

/**
 * robots.txt et sitemap.xml derriere le verrou d'indexation (decision du
 * 28 aout 2026, reaffirmee le 2 septembre) : tant qu'il est pose, un robot
 * recoit « tout interdit » et un sitemap vide ; la politique cible existe
 * deja dans le code, sans etre servie.
 *
 * Deux niveaux. Les routes, telles que servies AUJOURD'HUI. Puis les
 * fonctions pures, verrou force a `false` : la politique cible se verifie
 * sans toucher au verrou.
 */
const SITE = 'https://darrajabikes.com';

test.describe('routes servies, verrou pose', () => {
  test('le verrou est pose — a la levee, ces tests changent avec lui', () => {
    expect(INDEXING_LOCKED).toBe(true);
  });

  test('GET /robots.txt interdit tout, sans annoncer de sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');

    // Le contenu de l'ancien fichier statique — Next ecrit `User-Agent`, la
    // casse d'un champ est libre (RFC 9309).
    const corps = (await res.text()).replace(/\r\n/g, '\n');
    expect(corps.trim()).toBe('User-Agent: *\nDisallow: /');
    expect(corps).not.toContain('Sitemap:');
  });

  test('GET /sitemap.xml repond 200 avec un urlset vide', async ({ request }) => {
    const res = await request.get('/sitemap.xml');

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/xml');

    const corps = await res.text();
    expect(corps).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(corps).not.toContain('<url>');
    expect(corps).not.toContain('<loc>');
  });
});

test.describe('politique cible, verrou simule', () => {
  const FIXTURE: SitemapData = {
    brands: [{ key: 'trek' }, { key: 'specialized' }],
    // `uncategorized` est un etat de la donnee, pas une categorie : pas de page.
    // `unicycle` : une cle que l'API ajouterait avant la table des slugs — pas
    // de page tant qu'on ne lui a pas choisi un slug, jamais un segment invente.
    categories: [{ key: 'road' }, { key: 'e_mtb' }, { key: 'uncategorized' }, { key: 'unicycle' }],
    builds: [
      { slug: 'fuel-mx-9-8-xt-gen-7-81563', brand: { slug: 'trek', name: 'Trek' } },
      { slug: 'allez-elite', brand: { slug: 'specialized', name: 'Specialized' } },
    ],
  };

  test('verrouille : aucune entree, quelles que soient les donnees', () => {
    expect(sitemapEntries(true, FIXTURE)).toEqual([]);
  });

  test('deverrouille : chaque page une fois par locale, avec son groupe hreflang', () => {
    const entrees = sitemapEntries(false, FIXTURE);
    const urls = entrees.map((e) => e.url);

    // 3 pages fixes + 2 marques + 2 categories a page + 2 fiches = 9 pages, en 2 locales.
    expect(urls).toHaveLength(18);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toEqual(
      expect.arrayContaining([
        `${SITE}/ar-sa`,
        `${SITE}/en-sa`,
        `${SITE}/ar-sa/bikes`,
        `${SITE}/en-sa/finder`,
        `${SITE}/en-sa/bikes/trek`,
        `${SITE}/ar-sa/bikes/specialized`,
        `${SITE}/en-sa/road-bikes`,
        // Le slug parlant de la table, pas la cle de l'API.
        `${SITE}/ar-sa/electric-mountain-bikes`,
        `${SITE}/en-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563`,
        `${SITE}/ar-sa/bikes/specialized/allez-elite`,
      ]),
    );
    expect(urls.filter((u) => u.includes('uncategorized') || u.includes('unicycle'))).toEqual([]);
    expect(urls.filter((u) => u.includes('e-mtb') || u.includes('e_mtb'))).toEqual([]);

    // Le meme groupe que le <head> de la page : ar-SA, en-SA, x-default vers l'anglais.
    const fiche = entrees.find((e) => e.url === `${SITE}/ar-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563`);
    expect(fiche?.alternates?.languages).toEqual({
      'ar-SA': `${SITE}/ar-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563`,
      'en-SA': `${SITE}/en-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563`,
      'x-default': `${SITE}/en-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563`,
    });

    // Rien d'invente : ni lastmod, ni changefreq, ni priority — et jamais de query.
    for (const entree of entrees) {
      expect(entree).not.toHaveProperty('lastModified');
      expect(entree).not.toHaveProperty('changeFrequency');
      expect(entree).not.toHaveProperty('priority');
      expect(entree.url).not.toContain('?');
    }
  });

  test('robots verrouille : l ancien fichier, mot pour mot', () => {
    expect(robotsRules(true)).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  test('robots deverrouille : tout permis sauf les etats d interface, sitemap annonce', () => {
    expect(robotsRules(false)).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        // Locale en tete : une regle robots se compare au debut du chemin.
        disallow: ['/ar-sa/compare?', '/en-sa/compare?', '/*per_page=', '/api/'],
      },
      sitemap: `${SITE}/sitemap.xml`,
    });
  });
});
