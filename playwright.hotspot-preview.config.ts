import { defineConfig, devices } from '@playwright/test';

/**
 * Specs du pilote de hotspots (web #49), séparées de la suite E2E : aucun `globalSetup`,
 * aucune purge de cache. Le serveur Next de PRODUCTION est lancé à la main, sur la boucle
 * locale, avec `BIKE_HOTSPOT_PREVIEW=1` et `API_BASE_URL` (API publique en lecture seule).
 * Un serveur distant est refusé : l'aperçu n'existe que sur un poste de travail.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3149';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname)) {
  throw new Error('Les specs du pilote de hotspots exigent un serveur Next local.');
}

export default defineConfig({
  testDir: './tests/preview',
  timeout: 60_000,
  workers: 1,
  use: { baseURL },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
