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
