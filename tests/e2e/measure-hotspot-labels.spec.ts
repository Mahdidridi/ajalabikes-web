import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * MESURE des libellés de l'image à hotspots dans les vraies polices du site,
 * dans les deux langues — pas un test : un outil, sauté sans `MEASURE_HOTSPOT_LABELS=1`.
 *
 * Décision du 23 septembre 2026 : la place d'une étiquette ne s'estime pas, elle
 * se mesure (leçon du 20 septembre : un libellé arabe estimé à la moitié de sa
 * largeur réelle débordait). Le résultat, en em du texte « n libellé », est écrit
 * dans `../ajalabikes-api/lang/hotspots_widths.json` ; Laravel y ajoute ses
 * marges et recalcule les placements (`ajala:hotspots:place --apply`).
 *
 * Usage : MEASURE_HOTSPOT_LABELS=1 npx playwright test tests/e2e/measure-hotspot-labels.spec.ts --project=desktop
 * (front `npm start` contre l'API locale, page de l'Aethos : 7 points servis).
 */
const PAGE = '/lab/hotspots/specialized/aethos-2-expert-shimano-ultegra-di2';
const TARGET = join(__dirname, '../../../ajalabikes-api/lang/hotspots_widths.json');

test.skip(process.env.MEASURE_HOTSPOT_LABELS !== '1', 'outil de mesure, lancé à la demande');

test('mesure les sept libellés dans les deux langues et écrit hotspots_widths.json', async ({ page }) => {
  const labels: Record<string, { en?: number; ar?: number }> = {};
  let font = '';

  for (const [locale, lang] of [['ar-sa', 'ar'], ['en-sa', 'en']] as const) {
    await page.goto(`/${locale}${PAGE}`);
    await page.evaluate(() => document.fonts.ready);
    const mesures = await page.$$eval('button.hotspot-label', (buttons) =>
      buttons.map((button) => {
        const text = button.querySelector('.hotspot-label-text') as HTMLElement;
        const fontSize = parseFloat(getComputedStyle(text).fontSize);
        return {
          n: Number(button.dataset.n),
          em: text.getBoundingClientRect().width / fontSize,
          font: getComputedStyle(text).fontFamily,
        };
      }),
    );
    expect(mesures).toHaveLength(7);
    font = mesures[0].font;
    const ids = ['cockpit', 'saddle', 'frame', 'fork', 'brakes', 'drive', 'tires'];
    for (const m of mesures) {
      const id = ids[m.n - 1];
      labels[id] = { ...labels[id], [lang]: Math.round(m.em * 100) / 100 };
    }
  }

  const json = {
    measured_at: new Date().toISOString(),
    font,
    method: 'Playwright, texte « n libellé » rendu dans les polices du site, largeur / font-size',
    labels,
  };
  writeFileSync(TARGET, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(json, null, 2));
});
