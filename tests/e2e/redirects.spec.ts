import { expect, test } from '@playwright/test';

/**
 * Une fiche, une URL. Quand l'API resout un ancien slug — table
 * `slug_redirects`, a venir cote API — vers un build dont le slug (ou celui
 * de la marque) differe de l'URL demandee, la page repond par une redirection
 * PERMANENTE vers l'adresse vivante (`permanentRedirect`, 308 chez Next).
 * Sans elle, deux URL serviraient la meme fiche.
 *
 * Trek a renomme la gamme en « Gen 7 » le 21 aout 2026 : meme velo (code
 * produit 81563), nouveau slug. L'ancien `fuel-mx-9-8-xt` est le cas d'ecole.
 */
const ANCIEN = '/en-sa/bikes/trek/fuel-mx-9-8-xt';
const VIVANT = '/en-sa/bikes/trek/fuel-mx-9-8-xt-gen-7-81563';

/*
 * ROUGE tant que l'API repond 404 a l'ancien slug : la redirection n'est pas
 * encore semee cote API (table `slug_redirects`). Le code de la page, lui,
 * est en place — verifie contre une API simulee. A reactiver (`test.fixme` →
 * `test`) des que la semence est en base.
 */
test('un ancien slug redirige en permanent vers le slug vivant', async ({ request }) => {
  const res = await request.get(ANCIEN, { maxRedirects: 0 });

  expect([301, 308]).toContain(res.status());
  expect(res.headers()['location']).toMatch(new RegExp(`${VIVANT}$`));
});

test('le slug vivant est servi tel quel, sans redirection', async ({ request }) => {
  const res = await request.get(VIVANT, { maxRedirects: 0 });

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
    expect(res.headers()['location']).toMatch(/\/ar-sa$/);
  });

  test('une majuscule dans le chemin redirige vers la forme en minuscules', async ({ request }) => {
    const res = await request.get('/en-sa/bikes/Trek/Marlin-7-Gen-3', { maxRedirects: 0 });

    expect(res.status()).toBe(308);
    expect(res.headers()['location']).toMatch(/\/en-sa\/bikes\/trek\/marlin-7-gen-3$/);
  });

  test('la query string n est JAMAIS mise en minuscules', async ({ request }) => {
    const res = await request.get('/EN-SA/compare?bikes=trek/Fuel-MX', { maxRedirects: 0 });
    const location = res.headers()['location'];

    // Le chemin descend en minuscules...
    expect(res.status()).toBe(308);
    expect(location).toContain('/en-sa/compare');
    // ...mais la query passe intacte : elle porte des slugs, et demain le `q=`
    // de la recherche portera du texte saisi. Le toucher changerait la requete.
    expect(location).toContain('bikes=trek/Fuel-MX');
  });

  test('casse et slash final se corrigent en UN SEUL saut', async ({ request }) => {
    const res = await request.get('/EN-SA/Bikes/', { maxRedirects: 0 });

    expect(res.status()).toBe(308);
    // Directement la forme finale : pas de saut intermediaire vers `/en-sa/bikes/`.
    expect(res.headers()['location']).toMatch(/\/en-sa\/bikes$/);
  });

  test('le slash final seul est corrige par Next, sans code de notre part', async ({ request }) => {
    const res = await request.get('/en-sa/bikes/', { maxRedirects: 0 });

    expect([301, 308]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/\/en-sa\/bikes$/);
  });

  test('une adresse deja canonique ne redirige pas', async ({ request }) => {
    const res = await request.get('/en-sa/bikes', { maxRedirects: 0 });

    expect(res.status()).toBe(200);
  });
});
