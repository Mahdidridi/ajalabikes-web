/** @jsxImportSource react */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { FrameOverlay } from '../../src/components/FrameOverlay';
import { HotspotImage } from '../../src/components/HotspotImage';
import type { Build, BuildFigure, HotspotImage as HotspotImageData } from '../../src/lib/api';

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

// ---------- HotspotImage : rendu statique, sans hydratation (ni clic ni état) ----------

const ficheTrek = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/hotspots/trek-fx-sport-al-3.ar-sa.json'), 'utf8'),
) as { hotspot_image: HotspotImageData; sizes: Build['sizes'] };

const copy = {
  closeLabel: 'إغلاق',
  sizeLabel: 'المقاس',
  showDimensions: 'عرض المقاسات',
  hideDimensions: 'إخفاء المقاسات',
  listMode: 'النقاط',
  imageFailed: 'تعذر تحميل الصورة',
};

function hotspots(locale: 'ar-sa' | 'en-sa' = 'ar-sa'): string {
  return renderToStaticMarkup(
    <HotspotImage image={ficheTrek.hotspot_image} sizes={ficheTrek.sizes} locale={locale} copy={copy} />,
  );
}

test('le composant pose les points servis, en pourcentages du cadrage, sans en dériver aucun', async ({ page }) => {
  await page.setContent(`<main dir="rtl">${hotspots()}</main>`);

  const [vx, vy, vw, vh] = ficheTrek.hotspot_image.view_box;
  await expect(page.locator('[data-stage]')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('[data-stage] svg')).toHaveAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  await expect(page.locator('button.hotspot-label')).toHaveCount(5);
  await expect(page.locator('button.hotspot-label').first()).toHaveAttribute('data-n', '3');
  await expect(page.locator('line.hotspot-leader')).toHaveCount(5);
  await expect(page.locator('circle.hotspot-anchor')).toHaveCount(5);
  await expect(page.locator('.frame-segment')).toHaveCount(0);

  const premier = ficheTrek.hotspot_image.hotspots[0];
  const style = await page.locator('button.hotspot-label').first().getAttribute('style');
  expect(style).toContain(`left:${((premier.label_at[0] - vx) / vw) * 100}%`);
  expect(style).toContain(`top:${((premier.label_at[1] - vy) / vh) * 100}%`);
  expect(style).toContain(`font-size:calc(${ficheTrek.hotspot_image.font_fraction} * 100cqw)`);
});

for (const dir of ['ltr', 'rtl'] as const) {
  test(`page ${dir} : la photo reste LTR, la fourche reste à droite du pneu arrière`, async ({ page }) => {
    await page.setContent(`<main dir="${dir}">${hotspots(dir === 'rtl' ? 'ar-sa' : 'en-sa')}</main>`);

    await expect(page.locator('[data-stage] svg')).toHaveCSS('direction', 'ltr');
    const fourche = await page.locator('circle.hotspot-anchor[data-n="4"]').boundingBox();
    const pneu = await page.locator('circle.hotspot-anchor[data-n="7"]').boundingBox();
    expect(fourche!.x).toBeGreaterThan(pneu!.x);
    // le texte des étiquettes suit la page, lui
    await expect(page.locator('button.hotspot-label').first()).toHaveAttribute('dir', dir);
  });
}

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
