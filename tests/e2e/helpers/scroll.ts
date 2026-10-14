import type { Page } from '@playwright/test';

/**
 * Attend la fin d'un défilement DOUX (`scroll-behavior: smooth` sur la fiche depuis web #65) : la position doit rester
 * stable pendant 400 ms avant de mesurer quoi que ce soit. Sans cette attente, un test d'ancre peut lire une barre ou un
 * titre en plein mouvement — relevé le 14 octobre 2026 sur une suite ralentie (24 min) : « titre à 314 px, barre jusqu'à
 * 337 px », la barre n'était pas encore collée.
 */
export async function settled(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => {
    let last = -1;
    let stable = 0;
    const tick = () => {
      const y = window.scrollY;
      stable = y === last ? stable + 1 : 0;
      last = y;
      if (stable >= 8) done();
      else setTimeout(tick, 50);
    };
    tick();
  }));
  await page.waitForTimeout(200);
}
