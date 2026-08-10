import { defineConfig, devices } from '@playwright/test';

/**
 * Le parcours a besoin des deux serveurs : l'API Laravel sur 8000, le front sur 3000.
 * L'API doit etre lancee a part (php artisan serve) — Playwright ne demarre que le front.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:3000', locale: 'ar-SA' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  /*
   * Serveur de PRODUCTION, pas `next dev` : avec Next 16.3 et le layout racine sous
   * [locale], le serveur de developpement n'hydrate pas les Client Components. Le
   * selecteur de taille y reste inerte, et les tests d'interactivite echoueraient
   * sur un faux negatif. Voir CLAUDE.md.
   */
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
