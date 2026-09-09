import { expect, test } from '@playwright/test';
import { getCatalog, getCompare } from '../../src/lib/api';

// La frontière externe seule est simulée ; sérialisation et traitement HTTP sont réels.
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

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
