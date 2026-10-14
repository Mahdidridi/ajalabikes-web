import { expect, test } from '@playwright/test';
import { getCatalog, getCompare, getSimilarBuilds } from '../../src/lib/api';

// La frontière externe seule est simulée ; sérialisation et traitement HTTP sont réels.
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
});

/** Les appels à `console.error` pendant le test : le journal serveur, que l'on lit au lieu de l'afficher. */
function captureConsoleErrors(): unknown[][] {
  const calls: unknown[][] = [];
  console.error = (...args: unknown[]) => { calls.push(args); };
  return calls;
}

test('le suivi marketing ne change pas la requête catalogue ni sa clé de cache', async () => {
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return Response.json({ data: [], meta: {}, facets: {} });
  };
  const filters = { brand: 'canyon', sort: 'price_asc', per_page: '48', cursor: 'abc==' };
  await getCatalog('ar-sa', filters);
  await getCatalog('ar-sa', {
    ...filters, utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'été',
    utm_term: 'road', utm_content: 'hero', utm_id: '42',
    gclid: 'google', fbclid: 'meta', msclkid: 'bing', gbraid: 'g', wbraid: 'w',
  });
  expect(urls).toHaveLength(2);
  expect(new URL(urls[0]).search).toBe('?brand=canyon&sort=price_asc&per_page=48&cursor=abc%3D%3D');
  expect(urls[1]).toBe(urls[0]);
});

test('un paramètre métier inconnu reste soumis à la validation API', async () => {
  let sent = '';
  globalThis.fetch = async (input) => {
    sent = String(input);
    return Response.json({ data: [] });
  };
  await getCatalog('en-sa', { brnad: 'trek', utm_unknown: 'not-supported' });
  expect(new URL(sent).search).toBe('?brnad=trek&utm_unknown=not-supported');
});

for (const endpoint of ['catalog', 'compare'] as const) {
  test(`${endpoint} : le 422 est une erreur de sélection identifiable`, async () => {
    globalThis.fetch = async () => Response.json({ message: 'private upstream detail' }, { status: 422 });
    const request = endpoint === 'catalog'
      ? getCatalog('en-sa', { sort: 'invalid' })
      : getCompare('ar-sa', 'scott/addict-10,scott/addict-20', 'invalid,M_54');
    await expect(request).rejects.toMatchObject({ name: 'ApiValidationError' });
  });

  test(`${endpoint} : une panne 503 ne devient pas une erreur de sélection`, async () => {
    globalThis.fetch = async () => new Response(null, { status: 503 });
    const request = endpoint === 'catalog'
      ? getCatalog('en-sa', {}) : getCompare('ar-sa', 'a/b,c/d');
    await expect(request).rejects.toMatchObject({ name: 'Error', message: expect.stringContaining('503') });
  });
}

test('la comparaison conserve la distinction 404', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  await expect(getCompare('en-sa', 'a/b,c/d')).resolves.toBeNull();
});

// Vélos proches (web #35). Le bloc est secondaire : la fiche ne tombe jamais à cause de lui. C'est l'inverse de
// `getBuild`, qui lève — ici toute panne devient « rien à afficher » et une ligne au journal du serveur.
const SIMILAR = {
  data: {
    method: { version: '1-draft.2', title: 'Similar bicycles', criteria: ['Same category'] },
    msrp_disclaimer: 'US MSRP, not local prices.',
    total: 0,
    items: [],
  },
};

test('vélos proches : la requête vise la bonne adresse, porte le tag de la fiche et rend les données', async () => {
  let url = '';
  let tags: string[] | undefined;
  globalThis.fetch = async (input, init) => {
    url = String(input);
    tags = (init as { next?: { tags?: string[] } } | undefined)?.next?.tags;
    return Response.json(SIMILAR);
  };
  await expect(getSimilarBuilds('ar-sa', 'trek', 'madone-sl-6-gen-8')).resolves.toEqual(SIMILAR.data);
  expect(new URL(url).pathname).toMatch(/\/v1\/ar-sa\/builds\/trek\/madone-sl-6-gen-8\/similar$/);
  expect(tags).toEqual(['build:trek:madone-sl-6-gen-8']);
});

test('vélos proches : un vélo inconnu (404) ne donne rien et n’écrit rien au journal', async () => {
  const journal = captureConsoleErrors();
  globalThis.fetch = async () => new Response(null, { status: 404 });
  await expect(getSimilarBuilds('en-sa', 'trek', 'inconnu')).resolves.toBeNull();
  expect(journal).toHaveLength(0);
});

const PANNES: Array<[string, () => Promise<Response>]> = [
  ['une panne 503', async () => new Response(null, { status: 503 })],
  ['un refus 422', async () => Response.json({ message: 'detail interne' }, { status: 422 })],
  ['une panne réseau', async () => { throw new TypeError('fetch failed'); }],
  ['une réponse qui n’est pas du JSON', async () => new Response('<html>erreur</html>', { status: 200 })],
];

for (const [panne, reponse] of PANNES) {
  test(`vélos proches : ${panne} ne fait pas tomber la fiche — rien à afficher et une ligne au journal`, async () => {
    const journal = captureConsoleErrors();
    globalThis.fetch = reponse;
    await expect(getSimilarBuilds('en-sa', 'trek', 'madone-sl-6-gen-8')).resolves.toBeNull();
    expect(journal).toHaveLength(1);
    expect(String(journal[0][0])).toContain('trek/madone-sl-6-gen-8');
  });
}
