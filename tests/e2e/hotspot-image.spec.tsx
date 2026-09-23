/** @jsxImportSource react */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { FrameOverlay } from '../../src/components/FrameOverlay';
import type { BuildFigure } from '../../src/lib/api';

// Fixtures de contrat : la figure M du Trek FX Sport AL 3 telle que Laravel la
// calcule, et le calage servi par l'API. Le composant n'en dérive rien.
// (`__dirname`, pas `import.meta.url` : Playwright transpile ce fichier en CommonJS.)
const figureTrek = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/hotspots/trek-fx-sport-al-3.figure.json'), 'utf8'),
) as { M: BuildFigure };

const calage = { origin_px: [1347.7, 1523.3] as [number, number], px_per_mm: 1.688 };

function overlay(activeMark: string | null, figure: BuildFigure = figureTrek.M): string {
  return renderToStaticMarkup(
    <svg viewBox="0 0 3000 2250">
      <FrameOverlay figure={figure} calibration={calage} activeMark={activeMark} />
    </svg>,
  );
}

test('le calque pose les sept tubes sous la transformation servie, sans la recalculer', async ({ page }) => {
  await page.setContent(overlay(null));

  const groupe = page.locator('svg > g');
  await expect(groupe).toHaveAttribute('transform', 'translate(1347.7 1523.3) scale(1.688 -1.688)');
  await expect(page.locator('line.frame-segment')).toHaveCount(7);
  await expect(page.locator('.frame-mark')).toHaveCount(0);
  // le trait garde son épaisseur à l'écran : non-scaling-stroke sur chaque tube
  await expect(page.locator('line.frame-segment').first()).toHaveAttribute('vector-effect', 'non-scaling-stroke');
});

test('une cote active ajoute ses repères, fournis par Laravel', async ({ page }) => {
  await page.setContent(overlay('stack'));

  expect(await page.locator('.frame-mark').count()).toBeGreaterThan(0);
});

test('une figure non dessinable ne rend rien', async ({ page }) => {
  const vide: BuildFigure = {
    ...figureTrek.M,
    drawable: false,
    points: null,
    segments: null,
    wheels: null,
    marks: {},
  };
  await page.setContent(overlay(null, vide));

  await expect(page.locator('svg > g')).toHaveCount(0);
});
