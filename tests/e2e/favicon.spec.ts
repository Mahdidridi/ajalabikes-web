import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/*
 * Le favicon de Darraja Bikes — décision du fondateur du 28 octobre 2026 : un vélo de route classique, silhouette noire,
 * posé sur une pastille jaune #FACB3B (le jaune du crayon du logo) aux coins arrondis. Dessiné par le fondateur avec
 * ChatGPT, de zéro, à partir d'une description en mots, sans image de départ (déclaré par lui le 28 octobre 2026).
 *
 * Trois fichiers à la racine de `src/app`, que Next déclare lui-même dans chaque page :
 * - `favicon.ico` : 16, 32 et 48 pixels, au trait renforcé pour rester net dans un onglet ;
 * - `icon.png` : 192 × 192, un multiple de 48 comme Google le demande pour l'icône des résultats de recherche ;
 * - `apple-icon.png` : 180 × 180, carré plein SANS transparence — l'iPhone noircit la transparence et arrondit lui-même.
 *
 * Le triangle de `create-next-app`, servi jusque-là et repris par Google dans ses résultats, ne doit plus revenir.
 */
const TRIANGLE_CREATE_NEXT_APP_SHA1 = '9ecfcc8f0ead0bf3d2d7c39e084b88f41cc89a2e';

/** Le fichier tel qu'il est dans le dépôt, à la racine de `src/app`. */
const repoFile = (testDir: string, name: string) => readFileSync(join(testDir, '..', '..', 'src', 'app', name));

/** Largeur, hauteur et type de couleur d'un PNG, lus dans son en-tête IHDR (type 2 = RVB sans transparence). */
function png(body: Buffer) {
  expect(body.subarray(1, 4).toString('latin1'), 'signature PNG').toBe('PNG');
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20), colorType: body[25] };
}

/** Les côtés des images d'un .ico, lus dans son répertoire (0 veut dire 256). */
function icoSizes(body: Buffer) {
  expect(body.readUInt16LE(2), 'type 1 = icône').toBe(1);
  const count = body.readUInt16LE(4);
  return Array.from({ length: count }, (_, i) => body[6 + i * 16] || 256).sort((a, b) => a - b);
}

test('favicon.ico : le fichier du dépôt, en 16, 32 et 48 pixels, et plus le triangle de create-next-app', async ({ request }, info) => {
  const response = await request.get('/favicon.ico');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\/(x-icon|vnd\.microsoft\.icon)$/);
  const body = await response.body();
  expect(body.equals(repoFile(info.project.testDir, 'favicon.ico')), 'octets identiques au fichier du dépôt').toBe(true);
  expect(icoSizes(body)).toEqual([16, 32, 48]);
  expect(createHash('sha1').update(body).digest('hex')).not.toBe(TRIANGLE_CREATE_NEXT_APP_SHA1);
});

for (const path of ['/ar-sa', '/en-sa', '/en-sa/bikes', '/ar-sa/bikes/giant/talon-1']) {
  test(`${path} déclare le favicon, l'icône de 192 pixels et celle du téléphone`, async ({ page, request }, info) => {
    await page.goto(path);
    // Tout le document : Next peut écrire les métadonnées d'une page dynamique hors du <head> pour un navigateur.
    const links = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((els) =>
      els.map((el) => ({
        rel: el.getAttribute('rel'),
        href: el.getAttribute('href') ?? '',
        type: el.getAttribute('type'),
        sizes: el.getAttribute('sizes'),
      })),
    );

    expect(links.filter((l) => l.rel === 'icon' && l.href.startsWith('/favicon.ico')), 'favicon.ico, une fois').toHaveLength(1);
    const icon = links.filter((l) => l.rel === 'icon' && l.href.startsWith('/icon.png'));
    const apple = links.filter((l) => l.rel === 'apple-touch-icon');
    expect(icon).toEqual([expect.objectContaining({ type: 'image/png', sizes: '192x192' })]);
    expect(apple).toEqual([expect.objectContaining({ type: 'image/png', sizes: '180x180' })]);
    expect(apple[0].href).toMatch(/^\/apple-icon\.png/);

    for (const [link, name, side] of [[icon[0], 'icon.png', 192], [apple[0], 'apple-icon.png', 180]] as const) {
      const response = await request.get(link.href);
      expect(response.status(), link.href).toBe(200);
      expect(response.headers()['content-type'], link.href).toBe('image/png');
      const body = await response.body();
      expect(body.equals(repoFile(info.project.testDir, name)), `${name} : octets identiques au fichier du dépôt`).toBe(true);
      const { width, height, colorType } = png(body);
      expect({ width, height }, link.href).toEqual({ width: side, height: side });
      if (name === 'apple-icon.png') expect(colorType, 'icône du téléphone sans transparence (RVB)').toBe(2);
    }
  });
}
