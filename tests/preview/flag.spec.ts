import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { PILOT_BIKES } from '../../src/lib/hotspot-pilot';

/**
 * L'aperçu du pilote (web #49) n'existe que si `BIKE_HOTSPOT_PREVIEW=1`. Depuis web #52 (12 octobre
 * 2026), la fiche publique porte les notes que l'API sert, par le même composant : ce qu'elle charge
 * et affiche se vérifie dans `tests/e2e/annotated-photo.spec.ts`, plus ici.
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
