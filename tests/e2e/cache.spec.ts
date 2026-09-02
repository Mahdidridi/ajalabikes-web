import { expect, test, type APIRequestContext } from '@playwright/test';

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
 * Le secret est celui du `.env.local` du serveur teste ; sans variable
 * d'environnement, c'est la valeur locale documentee dans CLAUDE.md.
 */
const SECRET = process.env.REVALIDATE_SECRET ?? 'secret-local-de-test';
const ROUTE = '/api/revalidate';

/**
 * Une fiche PAR PROJET Playwright, qu'aucun autre spec ne visite. Les projets
 * desktop et mobile tournent en parallele : une invalidation lancee par l'un
 * ferait apparaitre un MISS inattendu chez l'autre s'ils partageaient la meme
 * fiche. Les autres specs ne lisent que le Fuel MX, l'Allez Elite et un Farley.
 */
const FICHES = {
  desktop: { path: '/en-sa/bikes/giant/anthem-advanced-sl-0', tag: 'build:giant:anthem-advanced-sl-0' },
  mobile: { path: '/en-sa/bikes/scott/scott-addict-10-bike', tag: 'build:scott:scott-addict-10-bike' },
} as const;

/** La fiche du contrat, lue par d'autres specs — jamais invalidee ici. */
const FUEL = '/en-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563';

const fiche = (project: string) => FICHES[project as keyof typeof FICHES] ?? FICHES.desktop;

const cacheStatus = async (request: APIRequestContext, path: string) => {
  const res = await request.get(path);
  expect(res.status(), path).toBe(200);

  return res.headers()['x-nextjs-cache'];
};

const revalidate = (request: APIRequestContext, body: unknown, secret: string | null = SECRET) =>
  request.post(ROUTE, {
    headers: secret === null ? {} : { Authorization: `Bearer ${secret}` },
    data: body,
  });

/**
 * Une page purgee est re-rendue a la requete suivante, puis servie du cache.
 * On attend le HIT en interrogeant, pour rester insensible aux purges que
 * l'autre projet Playwright peut lancer entre-temps (pseudo-tag `all`).
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
  test('la seconde requete est un HIT', async ({ request }) => {
    // La premiere requete peut etre le tout premier rendu (MISS) ou non ; la
    // suivante vient du cache.
    await cacheStatus(request, FUEL);

    await attendreHit(request, FUEL);
  });

  test('le tag de la fiche la fait re-rendre, puis elle revient du cache', async ({ request }, testInfo) => {
    const { path, tag } = fiche(testInfo.project.name);
    await attendreHit(request, path);

    const res = await revalidate(request, { tags: [tag], reason: 'test e2e : fiche' });
    expect(res.status()).toBe(200);

    // Expiration immediate : la requete qui suit re-rend la page, elle ne peut
    // pas venir du cache. Puis le cache reprend.
    expect(await cacheStatus(request, path)).not.toBe('HIT');
    await attendreHit(request, path);
  });

  test('le pseudo-tag all purge tout, fiche et accueil compris', async ({ request }, testInfo) => {
    const { path } = fiche(testInfo.project.name);
    await attendreHit(request, path);
    await attendreHit(request, '/en-sa');

    const res = await revalidate(request, { tags: ['all'], reason: 'test e2e : purge totale' });
    expect(res.status()).toBe(200);
    expect((await res.json()).revalidated).toEqual(['all']);

    expect(await cacheStatus(request, path)).not.toBe('HIT');
    expect(await cacheStatus(request, '/en-sa')).not.toBe('HIT');
    await attendreHit(request, path);
    await attendreHit(request, '/en-sa');
  });
});
