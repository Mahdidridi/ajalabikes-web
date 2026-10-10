// Captures du pilote de hotspots (web #49) pour la validation du fondateur.
//
// Les images montrent des photos de constructeur : elles ne vont JAMAIS dans le dépôt (public) ni
// dans une PR. HOTSPOT_CAPTURE_DIR est donc obligatoire et doit pointer hors du dépôt.
//
// usage : PLAYWRIGHT_BASE_URL=http://127.0.0.1:3149 HOTSPOT_CAPTURE_DIR=<dossier> \
//         node scripts/hotspot-pilot-captures.mjs [talon anthem …]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL;
const out = process.env.HOTSPOT_CAPTURE_DIR;
if (!base || !['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
  throw new Error('PLAYWRIGHT_BASE_URL doit viser le serveur d’aperçu local.');
}
if (!out) throw new Error('HOTSPOT_CAPTURE_DIR est obligatoire (dossier hors du dépôt).');
if (resolve(out).startsWith(resolve('.'))) throw new Error('HOTSPOT_CAPTURE_DIR ne doit pas être dans le dépôt.');
mkdirSync(out, { recursive: true });

const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['talon'];
const browser = await chromium.launch();

async function ready(page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.locator('[data-annotated] img').first().evaluate((img) => (img.complete ? null : new Promise((r) => img.addEventListener('load', r, { once: true }))));
  await page.waitForTimeout(300);
}

for (const key of keys) {
  for (const locale of ['ar-sa', 'en-sa']) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width < 600 ? 2 : 1 });
      await page.goto(`${base}/${locale}/preview/hotspots/${key}`);
      await ready(page);
      const figure = page.locator('figure').first();
      await figure.screenshot({ path: `${out}/${key}-${locale}-${width}.png` });
      if (width < 600) {
        await page.locator('[data-annotated] [data-dot]').first().click();
        await page.waitForTimeout(200);
        await figure.screenshot({ path: `${out}/${key}-${locale}-${width}-detail.png` });
      }
      console.log(`${key} ${locale} ${width} : ok`);
      await page.close();
    }
  }
}
await browser.close();
