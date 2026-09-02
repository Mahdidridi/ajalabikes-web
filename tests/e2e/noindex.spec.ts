import { expect, test } from '@playwright/test';

/**
 * Decision du 28 aout 2026 : aucune indexation tant que les URL ne sont pas
 * figees. Le front sert robots.txt en Disallow: / et pose X-Robots-Tag sur
 * chaque reponse, en plus du <meta name="robots"> du layout.
 */
test('robots.txt interdit tout', async ({ request }) => {
  const res = await request.get('/robots.txt');

  expect(res.status()).toBe(200);
  // Genere par `src/app/robots.ts` : Next ecrit `User-Agent`, la casse d'un
  // champ est libre (RFC 9309) — le contenu de l'ancien fichier statique.
  const corps = (await res.text()).replace(/\r\n/g, '\n').toLowerCase();
  expect(corps).toContain('user-agent: *\ndisallow: /');
});

test('chaque page porte X-Robots-Tag noindex', async ({ request }) => {
  for (const path of ['/ar-sa', '/en-sa/bikes', '/ar-sa/finder', '/en-sa/nulle-part']) {
    const res = await request.get(path);

    expect(res.headers()['x-robots-tag'], path).toBe('noindex, nofollow');
  }
});
