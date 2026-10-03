import { expect, test, type APIRequestContext } from '@playwright/test';
import { currentBuild } from './helpers/catalog-api';

/**
 * Contrat de cache du 2 septembre 2026 (`tasks/2026-09-02-cache-contrat.md`) :
 * rendre une fois, invalider au changement, servir depuis le cache.
 *
 * Deux choses se verifient ici, contre le serveur de PRODUCTION (`next start`,
 * seul mode ou le cache ISR existe) :
 *  - le recepteur du webhook `POST /api/revalidate` — secret, corps, reponses ;
 *  - l'effet reel sur une fiche : servie du cache, re-rendue apres le tag, puis
 *    de nouveau servie du cache. La preuve est l'en-tete `x-nextjs-cache` que
 *    Next pose sur toute route ISR (HIT · MISS · STALE · REVALIDATED).
 *
 * REVALIDATE_SECRET doit etre exporte explicitement pour le serveur teste.
 * La suite s'execute avec --workers=1 : le pseudo-tag all invalide aussi les
 * pages visitees par les autres specs et projets.
 */
const ROUTE = '/api/revalidate';

function requiredSecret(): string {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret?.trim()) {
    throw new Error(
      'REVALIDATE_SECRET est requis pour les tests de revalidation. ' +
      'Exporter le secret du serveur teste : export REVALIDATE_SECRET="<secret du serveur teste>" ' +
      '(PowerShell : $env:REVALIDATE_SECRET = "<secret du serveur teste>").',
    );
  }

  return secret;
}

/** Une marque distincte par projet, avec un slug canonique lu dans le catalogue courant. */
const fiche = async (request: APIRequestContext, project: string) => {
  const build = await currentBuild(request, 'en-sa', {
    brand: project === 'mobile' ? 'scott' : 'giant',
    sort: 'year_desc',
  });
  expect(build.model_path, 'La fiche de cache doit publier son adresse modele').not.toBeNull();

  return { path: build.model_path!, tag: `build:${build.brand.slug}:${build.slug}` };
};

const cacheStatus = async (request: APIRequestContext, path: string) => {
  const res = await request.get(path, { maxRedirects: 0 });
  expect(res.status(), path).toBe(200);
  expect(['HIT', 'MISS', 'STALE', 'REVALIDATED'], `${path} doit porter x-nextjs-cache`).toContain(
    res.headers()['x-nextjs-cache'],
  );

  return res.headers()['x-nextjs-cache'];
};

const revalidate = (request: APIRequestContext, body: unknown, secret: string | null = requiredSecret()) =>
  request.post(ROUTE, {
    headers: secret === null ? {} : { Authorization: `Bearer ${secret}` },
    data: body,
  });

/**
 * Une page purgee est re-rendue a la requete suivante, puis servie du cache.
 * On attend le HIT en interrogeant pour laisser le rendu ISR se terminer.
 */
const attendreHit = (request: APIRequestContext, path: string) =>
  expect
    .poll(() => cacheStatus(request, path), { message: `${path} devrait etre servie du cache` })
    .toBe('HIT');

test.describe('POST /api/revalidate', () => {
  test('sans secret : 401', async ({ request }) => {
    const res = await revalidate(request, { tags: ['catalog'] }, null);

    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  test('mauvais secret : 401', async ({ request }) => {
    const res = await revalidate(request, { tags: ['catalog'] }, 'pas-le-bon');

    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  test('corps sans tags : 422', async ({ request }) => {
    for (const corps of [{}, { tags: [] }, { tags: 'catalog' }, { tags: [42] }, 'pas du json']) {
      const res = await revalidate(request, corps);

      expect(res.status(), JSON.stringify(corps)).toBe(422);
      expect(await res.json()).toEqual({ error: 'tags required' });
    }
  });

  test('bon secret et tags : 200 avec les tags revalides', async ({ request }) => {
    const tags = ['catalog', 'bikefinder', 'compare'];
    const res = await revalidate(request, { tags, reason: 'test e2e' });

    expect(res.status()).toBe(200);
    const corps = await res.json();
    expect(corps.revalidated).toEqual(tags);
    expect(corps.reason).toBe('test e2e');
    // `at` est une date ISO-8601 : le journal des deux cotes se recoupe dessus.
    expect(new Date(corps.at).toISOString()).toBe(corps.at);
  });

  test('la route porte X-Robots-Tag comme toute reponse du site', async ({ request }) => {
    // L'en-tete vient de `headers()` dans next.config.ts : il doit couvrir les
    // routes API, pas seulement les pages.
    const refusee = await revalidate(request, {}, null);
    expect(refusee.headers()['x-robots-tag']).toBe('noindex, nofollow');

    const acceptee = await revalidate(request, { tags: ['compare'] });
    expect(acceptee.headers()['x-robots-tag']).toBe('noindex, nofollow');
  });
});

test.describe('une fiche est rendue une fois, puis servie du cache', () => {
  test('la seconde requete est un HIT', async ({ request }, testInfo) => {
    const { path } = await fiche(request, testInfo.project.name);
    // La premiere requete peut etre le tout premier rendu (MISS) ou non ; la
    // suivante vient du cache.
    await cacheStatus(request, path);

    await attendreHit(request, path);
  });

  test('le tag de la fiche la fait re-rendre, puis elle revient du cache', async ({ request }, testInfo) => {
    const { path, tag } = await fiche(request, testInfo.project.name);
    await attendreHit(request, path);

    const res = await revalidate(request, { tags: [tag], reason: 'test e2e : fiche' });
    expect(res.status()).toBe(200);

    // Expiration immediate : la requete qui suit re-rend la page, elle ne peut
    // pas venir du cache. Puis le cache reprend.
    expect(await cacheStatus(request, path)).not.toBe('HIT');
    await attendreHit(request, path);
  });

  test('le pseudo-tag all purge tout, fiche et accueil compris', async ({ request }, testInfo) => {
    const { path } = await fiche(request, testInfo.project.name);
    await attendreHit(request, path);
    await attendreHit(request, '/en-sa');

    const res = await revalidate(request, { tags: ['all'], reason: 'test e2e : purge totale' });
    expect(res.status()).toBe(200);

    // L'accueil D'ABORD, dans la foulee de la purge : sur un serveur partage,
    // une visite externe peut le remettre en cache pendant le rendu de la fiche.
    expect(await cacheStatus(request, '/en-sa')).not.toBe('HIT');
    expect((await res.json()).revalidated).toEqual(['all']);
    expect(await cacheStatus(request, path)).not.toBe('HIT');
    await attendreHit(request, path);
    await attendreHit(request, '/en-sa');
  });
});
