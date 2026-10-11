import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { PILOT_BIKES } from '../../src/lib/hotspot-pilot';

/**
 * L'aperçu du pilote (web #49) n'existe que si `BIKE_HOTSPOT_PREVIEW=1`, et n'atteint jamais
 * la fiche publique.
 */

async function freePort(): Promise<number> {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('Port local introuvable');
  await new Promise<void>((done, reject) => reservation.close((error) => (error ? reject(error) : done())));
  return address.port;
}

test('drapeau absent : les cinq aperçus rendent 404, avant toute requête à l’API', async ({ request }) => {
  const port = await freePort();
  // API injoignable : si la route l'interrogeait avant de lire le drapeau, la réponse ne serait pas un 404 propre.
  const env: NodeJS.ProcessEnv = { ...process.env, API_BASE_URL: 'http://127.0.0.1:1/api', NEXT_TELEMETRY_DISABLED: '1' };
  delete env.BIKE_HOTSPOT_PREVIEW;
  const child = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  let output = '';
  child.stdout.on('data', (data) => { output += String(data); });
  child.stderr.on('data', (data) => { output += String(data); });
  const base = `http://127.0.0.1:${port}`;
  try {
    await expect.poll(async () => {
      if (child.exitCode !== null) throw new Error(output);
      try { return (await request.get(`${base}/robots.txt`, { timeout: 1000 })).status(); }
      catch { return 0; }
    }, { timeout: 30_000 }).toBe(200);
    for (const bike of PILOT_BIKES) {
      for (const locale of ['en-sa', 'ar-sa']) {
        const response = await request.get(`${base}/${locale}/preview/hotspots/${bike.key}`);
        expect(response.status(), `${locale}/${bike.key}`).toBe(404);
        expect(await response.text()).not.toContain('data-annotated');
      }
    }
  } finally {
    if (child.exitCode === null) child.kill();
    await exited;
  }
});

test('drapeau présent : aperçu en 200 et noindex ; clé ou locale inconnue en 404', async ({ request }) => {
  for (const locale of ['en-sa', 'ar-sa']) {
    const response = await request.get(`/${locale}/preview/hotspots/talon`);
    expect(response.status(), locale).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(html).toContain('Talon 1');
  }
  expect((await request.get('/en-sa/preview/hotspots/verve-plus')).status()).toBe(404);
  expect((await request.get('/fr-fr/preview/hotspots/talon')).status()).toBe(404);
});

test('la fiche publique ne porte jamais d’annotation, drapeau présent', async ({ request }) => {
  for (const bike of PILOT_BIKES) {
    const response = await request.get(`/en-sa/bikes/${bike.brand}/${bike.slug}`);
    expect(response.status(), bike.key).toBe(200);
    const html = await response.text();
    expect(html, bike.key).not.toContain('data-annotated');
    // Relecture du 10 octobre : la charge RSC portait `"annotated":"$undefined"` (guillemets échappés dans le HTML),
    // invisible au témoin HTML, qui retire les <script>.
    expect(html, `${bike.key} : clé annotated dans la charge RSC`).not.toMatch(/\\?"annotated\\?"\s*:/);
  }
});

/** Le code et les styles du pilote, tels qu'ils apparaissent dans les fichiers construits. */
const PILOT_CODE = /data-annotated|AnnotatedPhoto|hotspot-accent/;

/** Le contenu des fichiers JS et CSS que la page `path` fait charger. */
async function servedAssets(request: APIRequestContext, path: string): Promise<Map<string, string>> {
  const html = await (await request.get(path)).text();
  const assets = new Map<string, string>();
  for (const asset of new Set(html.match(/\/_next\/static\/[^"'\s\\]+\.(?:js|css)/g) ?? [])) {
    assets.set(asset, await (await request.get(asset)).text());
  }
  return assets;
}

// Relecture du 10 octobre : la galerie publique importait le composant d'aperçu, et chaque fiche chargeait son code et
// sa feuille de style (10 Ko de CSS bloquant) sans jamais le rendre.
test('la fiche publique ne charge ni le code ni les styles du pilote ; l’aperçu, si', async ({ request }) => {
  const preview = await servedAssets(request, '/ar-sa/preview/hotspots/talon');
  expect([...preview.values()].some((body) => PILOT_CODE.test(body)), 'détection : l’aperçu charge le pilote').toBe(true);
  for (const bike of PILOT_BIKES) {
    for (const [asset, body] of await servedAssets(request, `/ar-sa/bikes/${bike.brand}/${bike.slug}`)) {
      expect(PILOT_CODE.test(body), `${bike.key} : ${asset}`).toBe(false);
    }
  }
});
