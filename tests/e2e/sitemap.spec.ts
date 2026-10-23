import { expect, test } from '@playwright/test';
import { robotsRules } from '@/lib/seo';
import { sitemapEntries, type SitemapData } from '@/lib/sitemap';

/**
 * robots.txt et sitemap.xml : les fonctions pures, verrou pose ET leve (le verrou est leve depuis l'ouverture a Google du
 * 23 octobre 2026). Les routes telles que servies sont gardees par `tests/e2e/indexation.spec.ts`.
 */
const SITE = 'https://darrajabikes.com';

test.describe('politique cible, verrou simule', () => {
  const TREK = { slug: 'trek', name: 'Trek' };
  const SPECIALIZED = { slug: 'specialized', name: 'Specialized' };
  const FIXTURE: SitemapData = {
    // Une marque sous le seuil des fiches n'a pas de page a indexer (`indexable` de la facette, decide par l'API).
    brands: [{ key: 'trek', indexable: true }, { key: 'specialized', indexable: true }, { key: 'tiny', indexable: false }],
    // `uncategorized` est un etat de la donnee, pas une categorie : pas de page.
    // `unicycle` : une cle que l'API ajouterait avant la table des slugs — pas
    // de page tant qu'on ne lui a pas choisi un slug, jamais un segment invente.
    // `fat` : une categorie de moins de 5 velos, que l'API declare non indexable.
    categories: [
      { key: 'road', indexable: true },
      { key: 'e_mtb', indexable: true },
      { key: 'uncategorized', indexable: false },
      { key: 'unicycle', indexable: true },
      { key: 'fat', indexable: false },
    ],
    builds: [
      { slug: 'madone-sl-6-gen-8', brand: TREK, indexable: true, model_path: '/en-sa/bikes/trek/madone-sl-6-gen-8', year: 2026, last_changed_at: '2026-10-14T11:44:12+00:00' },
      { slug: 'allez-elite', brand: SPECIALIZED, indexable: true, model_path: '/en-sa/bikes/specialized/allez-elite', year: null, last_changed_at: '2026-10-01T08:00:00+00:00' },
      // Nomme comme sa famille : l'adresse modele appartient a la famille, sa page est son adresse millesime.
      { slug: 'rockhopper', brand: SPECIALIZED, indexable: true, model_path: null, year: 2026, last_changed_at: '2026-09-30T10:00:00+00:00' },
      // Adresse qui porte encore l'identifiant du constructeur (api #25) : l'API la dit non indexable.
      { slug: 'fuel-mx-9-8-xt-gen-7-81563', brand: TREK, indexable: false, model_path: '/en-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563', year: 2027, last_changed_at: '2026-10-14T11:44:12+00:00' },
    ],
  };

  test('verrouille : aucune entree, quelles que soient les donnees', () => {
    expect(sitemapEntries(true, FIXTURE)).toEqual([]);
  });

  test('deverrouille : chaque page indexable une fois par locale, avec son groupe hreflang', () => {
    const entrees = sitemapEntries(false, FIXTURE);
    const urls = entrees.map((e) => e.url);

    // 3 pages fixes + 4 pages legales + 2 marques + 2 categories a page + 3 fiches indexables = 14 pages, en 2 locales.
    expect(urls).toHaveLength(28);
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
        `${SITE}/en-sa/bikes/trek/madone-sl-6-gen-8`,
        `${SITE}/ar-sa/bikes/specialized/allez-elite`,
        // L'adresse millesime d'un velo nomme comme sa famille : son canonical, jamais l'adresse de la famille.
        `${SITE}/en-sa/bikes/specialized/rockhopper-2026`,
        // Les pages legales (web #16), dans les deux locales.
        `${SITE}/ar-sa/privacy`,
        `${SITE}/en-sa/image-rights`,
        `${SITE}/ar-sa/contact`,
        `${SITE}/en-sa/terms`,
      ]),
    );
    expect(urls.filter((u) => u.includes('uncategorized') || u.includes('unicycle'))).toEqual([]);
    expect(urls.filter((u) => u.includes('e-mtb') || u.includes('e_mtb'))).toEqual([]);
    // Ce que l'API declare non indexable n'entre pas : marque et categorie sous le seuil, adresse en attente.
    expect(urls.filter((u) => u.includes('/bikes/tiny') || u.includes('fat'))).toEqual([]);
    expect(urls.filter((u) => u.includes('81563'))).toEqual([]);
    expect(urls.filter((u) => u.endsWith('/bikes/specialized/rockhopper'))).toEqual([]);

    // Le meme groupe a cinq liens que le <head>, sans creer d'URL /ar ou /en.
    const fiche = entrees.find((e) => e.url === `${SITE}/ar-sa/bikes/trek/madone-sl-6-gen-8`);
    expect(fiche?.alternates?.languages).toEqual({
      'ar-SA': `${SITE}/ar-sa/bikes/trek/madone-sl-6-gen-8`,
      ar: `${SITE}/ar-sa/bikes/trek/madone-sl-6-gen-8`,
      'en-SA': `${SITE}/en-sa/bikes/trek/madone-sl-6-gen-8`,
      en: `${SITE}/en-sa/bikes/trek/madone-sl-6-gen-8`,
      'x-default': `${SITE}/en-sa/bikes/trek/madone-sl-6-gen-8`,
    });

    // Reciprocite de chaque type de page du sitemap, verrou simule seulement.
    for (const path of [
      '', '/bikes', '/finder', '/privacy', '/image-rights', '/contact', '/terms', '/bikes/trek', '/bikes/specialized',
      '/road-bikes', '/electric-mountain-bikes',
      '/bikes/trek/madone-sl-6-gen-8', '/bikes/specialized/allez-elite', '/bikes/specialized/rockhopper-2026',
    ]) {
      for (const locale of ['ar-sa', 'en-sa']) {
        const entry = entrees.find((e) => e.url === `${SITE}/${locale}${path}`);
        expect(entry?.alternates?.languages).toEqual({
          'ar-SA': `${SITE}/ar-sa${path}`,
          ar: `${SITE}/ar-sa${path}`,
          'en-SA': `${SITE}/en-sa${path}`,
          en: `${SITE}/en-sa${path}`,
          'x-default': `${SITE}/en-sa${path}`,
        });
      }
    }

    // Rien d'invente : ni changefreq, ni priority, jamais de query.
    for (const entree of entrees) {
      expect(entree).not.toHaveProperty('changeFrequency');
      expect(entree).not.toHaveProperty('priority');
      expect(entree.url).not.toContain('?');
    }
  });

  test('deverrouille : lastmod = date de dernier changement servie par l API, sur les fiches seulement', () => {
    const entrees = sitemapEntries(false, FIXTURE);
    const date = (url: string) => entrees.find((e) => e.url === `${SITE}${url}`)?.lastModified;

    // La date telle que l'API la sert (`last_changed_at`), dans les deux locales.
    expect(date('/en-sa/bikes/trek/madone-sl-6-gen-8')).toBe('2026-10-14T11:44:12+00:00');
    expect(date('/ar-sa/bikes/trek/madone-sl-6-gen-8')).toBe('2026-10-14T11:44:12+00:00');
    expect(date('/ar-sa/bikes/specialized/rockhopper-2026')).toBe('2026-09-30T10:00:00+00:00');

    // Accueil, catalogue, finder, marques et categories : l'API n'a pas de date fiable pour elles, aucune n'est inventee.
    for (const url of ['/ar-sa', '/en-sa/bikes', '/en-sa/finder', '/ar-sa/privacy', '/en-sa/bikes/trek', '/ar-sa/road-bikes']) {
      expect(entrees.find((e) => e.url === `${SITE}${url}`), url).not.toHaveProperty('lastModified');
    }
  });

  test('robots verrouille : l ancien fichier, mot pour mot', () => {
    expect(robotsRules(true)).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  test('robots deverrouille : tout permis sauf le webhook, sitemap annonce', () => {
    // Decision du 16 octobre 2026 (plan de levee du noindex) : plus de `Disallow` sur `/{locale}/compare?` ni
    // `/*per_page=`. Google ne lit pas le `noindex` d'une adresse qu'on lui interdit de visiter, et chaque fiche lie
    // une dizaine de comparaisons : bloquees, elles pourraient etre indexees sans contenu. Elles restent `noindex`.
    expect(robotsRules(false)).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
      sitemap: `${SITE}/sitemap.xml`,
    });
  });
});
