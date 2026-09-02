import { defineConfig, devices } from '@playwright/test';

/**
 * Le parcours a besoin des deux serveurs : l'API Laravel sur 8000, le front sur 3000.
 * L'API doit etre lancee a part (php artisan serve) — Playwright ne demarre que le front.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  // PLAYWRIGHT_BASE_URL permet de rejouer la suite contre un deploiement (ex. la prod).
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000', locale: 'ar-SA' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  /*
   * Les deux serveurs sont lances A PART, volontairement :
   *
   *   terminal 1   cd ../ajalabikes-api && php artisan serve --port=8000
   *   terminal 2   npm run build && npm start
   *   terminal 3   npx playwright test
   *
   * Pas de `webServer` ici pour deux raisons. D'abord le parcours a besoin de
   * l'API Laravel, que Playwright ne sait pas demarrer. Ensuite il faut le serveur
   * de PRODUCTION : avec Next 16.3 et le layout racine sous [locale], `next dev`
   * n'hydrate pas les Client Components et les tests d'interactivite echoueraient
   * sur un faux negatif. Voir CLAUDE.md.
   */
});
