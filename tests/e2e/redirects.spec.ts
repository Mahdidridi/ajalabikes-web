import { expect, test, type APIResponse } from '@playwright/test';
import { currentBuild, readBuild } from './helpers/catalog-api';

/**
 * Une fiche, une URL. Quand l'API resout un ancien slug — table
 * `slug_redirects` — vers un build dont le slug (ou celui
 * de la marque) differe de l'URL demandee, la page repond par une redirection
 * PERMANENTE vers l'adresse vivante (`permanentRedirect`, 308 chez Next).
 * Sans elle, deux URL serviraient la meme fiche.
 *
 * Trek a renomme la gamme en « Gen 7 » le 21 aout 2026 : meme velo (code
 * produit 81563), nouveau slug. L'ancien `fuel-mx-9-8-xt` est le cas d'ecole.
 */
const ANCIEN = '/en-sa/bikes/trek/fuel-mx-9-8-xt';

/*
 * Paire verifiee par GET public le 3 octobre 2026 : l'API resout cet ancien
 * slug en 200 et publie model_path ; le web y redirige en 308. Le brief #37
 * dit 301, mais permanentRedirect et la production utilisent bien 308.
 */
const destination = async (request: Parameters<typeof readBuild>[0]) => {
  const build = await readBuild(request, 'en-sa', 'trek', 'fuel-mx-9-8-xt');
  expect(build.brand.name).toBe('Trek');
  expect(build.model_name).toBe('Fuel MX 9.8 XT Gen 7');
  expect(build.model_path, 'L ancienne fiche doit publier son adresse modele').not.toBeNull();
  expect(build.model_path).not.toBe(ANCIEN);

  return build.model_path!;
};

const redirectLocation = (response: APIResponse) => {
  const locations = response.headersArray().filter((header) => header.name.toLowerCase() === 'location');
  expect(locations, 'La redirection doit porter exactement une ligne Location').toHaveLength(1);
  const location = new URL(locations[0].value, response.url());
  expect(location.origin).toBe(new URL(response.url()).origin);

  return location;
};

test('un ancien slug redirige en permanent vers le slug vivant', async ({ request }) => {
  const vivant = await destination(request);
  const res = await request.get(ANCIEN, { maxRedirects: 0 });

  expect(res.status()).toBe(308);
  expect(redirectLocation(res).href).toBe(new URL(vivant, res.url()).href);
});

test('le slug vivant est servi tel quel, sans redirection', async ({ request }) => {
  const res = await request.get(await destination(request), { maxRedirects: 0 });

  expect(res.status()).toBe(200);
});

/**
 * Une seule forme canonique par adresse (decision du 5 septembre 2026).
 * Google traite les URL comme sensibles a la casse : chaque variante toleree
 * est un doublon qui dilue le classement.
 *
 * Le `www` -> apex est une regle nginx, pas du code : il ne se teste pas ici.
 */
test.describe('forme canonique', () => {
  test('la racine redirige en PERMANENT vers la locale arabe', async ({ request }) => {
    const res = await request.get('/', { maxRedirects: 0 });

    // 308 et non 307 : les URL sont figees depuis le 5 septembre.
    expect(res.status()).toBe(308);
    expect(redirectLocation(res).href).toBe(new URL('/ar-sa', res.url()).href);
  });

  test('une majuscule dans le chemin redirige vers la forme en minuscules', async ({ request }) => {
    const build = await currentBuild(request, 'en-sa');
    const path = build.model_path!;
    const res = await request.get(path.toUpperCase(), { maxRedirects: 0 });

    expect(res.status()).toBe(308);
    expect(redirectLocation(res).href).toBe(new URL(path, res.url()).href);
  });

  test('la query string n est JAMAIS mise en minuscules', async ({ request }) => {
    const res = await request.get('/EN-SA/compare?bikes=trek/Fuel-MX', { maxRedirects: 0 });
    const location = redirectLocation(res);

    // Le chemin descend en minuscules...
    expect(res.status()).toBe(308);
    expect(location.pathname).toBe('/en-sa/compare');
    // ...mais la query passe intacte : elle porte des slugs, et demain le `q=`
    // de la recherche portera du texte saisi. Le toucher changerait la requete.
    // Comparee DECODEE : l'adaptateur de Next re-serialise la query de toute
    // Location de proxy par URLSearchParams (« / » ressort en « %2F ») — la
    // valeur et sa casse sont ce qui compte, pas l'encodage (voir proxy.ts).
    expect(location.searchParams.get('bikes')).toBe('trek/Fuel-MX');
  });

  test('un chemin deja canonique avec une query n est pas redirige', async ({ request }) => {
    const build = await currentBuild(request, 'en-sa');
    const query = new URLSearchParams({ bikes: `${build.brand.slug}/${build.slug}` });
    const res = await request.get(`/en-sa/compare?${query}`, {
      maxRedirects: 0,
    });

    expect(res.status()).toBe(200);
  });

  test('casse et slash final se corrigent en UN SEUL saut', async ({ request }) => {
    const res = await request.get('/EN-SA/Bikes/', { maxRedirects: 0 });

    expect(res.status()).toBe(308);
    // Directement la forme finale : pas de saut intermediaire vers `/en-sa/bikes/`.
    expect(redirectLocation(res).href).toBe(new URL('/en-sa/bikes', res.url()).href);
  });

  test('le slash final seul est corrige par le proxy', async ({ request }) => {
    const res = await request.get('/en-sa/bikes/', { maxRedirects: 0 });

    expect(res.status()).toBe(308);
    expect(redirectLocation(res).href).toBe(new URL('/en-sa/bikes', res.url()).href);
  });

  test('une adresse deja canonique ne redirige pas', async ({ request }) => {
    const res = await request.get('/en-sa/bikes', { maxRedirects: 0 });

    expect(res.status()).toBe(200);
  });
});
