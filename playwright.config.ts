import { defineConfig, devices } from '@playwright/test';

/**
 * Le Next de production est lance a part, avec la meme API_BASE_URL explicite
 * que Playwright. Voir CLAUDE.md pour les trois variables requises et la purge.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  workers: 1,
  globalSetup: './tests/e2e/global-setup.ts',
  // PLAYWRIGHT_BASE_URL permet de rejouer la suite contre un deploiement (ex. la prod).
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000', locale: 'ar-SA' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  /*
   * Les deux serveurs sont lances A PART, volontairement :
   *
   *   serveur     exporter API_BASE_URL et REVALIDATE_SECRET, build puis start
   *   tests       exporter ces memes variables et PLAYWRIGHT_BASE_URL, npm test
   *
   * Le setup invalide all avant les lectures ; workers=1 empeche les purges
   * concurrentes entre specs/projets. --workers>1 est refuse explicitement.
   *
   * Pas de `webServer` ici pour deux raisons. D'abord le parcours a besoin de
   * l'API Laravel, que Playwright ne sait pas demarrer. Ensuite il faut le serveur
   * de PRODUCTION : avec Next 16.3 et le layout racine sous [locale], `next dev`
   * n'hydrate pas les Client Components et les tests d'interactivite echoueraient
   * sur un faux negatif. Voir CLAUDE.md.
   */
});
