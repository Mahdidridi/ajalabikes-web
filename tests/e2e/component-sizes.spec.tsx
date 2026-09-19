/** @jsxImportSource react */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { ComponentList } from '../../src/components/ComponentList';
import { ComparisonSection } from '../../src/components/ComparisonSection';
import type { Build, CompareSection } from '../../src/lib/api';

// Fixtures de contrat : aucune dépendance aux imports ou au catalogue vivant.
const components: Build['components'] = [
  { id: 101, key: 'stem', label: 'Stem', description: '70.0', description_formatted: '70.0 mm', unit_original: 'mm', size_label: 'S', size_note: null, unit_note: null },
  { id: 102, key: 'stem', label: 'Stem', description: '70.0', description_formatted: '70.0 mm', unit_original: 'mm', size_label: 'L', size_note: null, unit_note: null },
  { id: 103, key: 'handlebar', label: 'Handlebar', description: '44', description_formatted: '44', unit_original: null, size_label: null, size_note: 'Size not specified', unit_note: 'Unit not recorded' },
];

for (const dir of ['ltr', 'rtl'] as const) {
  test(`fiche ${dir} : chaque composant garde sa taille et ses avertissements`, async ({ page }) => {
    await page.setContent(renderToStaticMarkup(<main dir={dir}><ComponentList components={components} /></main>));
    const entries = page.locator('dl > div');
    await expect(entries).toHaveCount(3);
    await expect(entries.nth(0).locator('dt')).toHaveText('StemS');
    await expect(entries.nth(0).locator('dd')).toHaveText('70.0 mm');
    await expect(entries.nth(1).locator('dt')).toHaveText('StemL');
    await expect(entries.nth(1).locator('dd')).toHaveText('70.0 mm');
    await expect(entries.nth(2).locator('dt')).toContainText('Size not specified');
    await expect(entries.nth(2).locator('dd')).toContainText('Unit not recorded');
    await expect(entries.nth(0).locator('dt bdi')).toHaveCSS('unicode-bidi', 'isolate');
    await expect(entries.nth(0).locator('dd bdi')).toHaveCSS('direction', 'ltr');
  });
}

// Le contrat enrichi du 18 septembre rend value/unit/delta/anomaly requis sur
// chaque cellule : une cellule de composant les porte à null, sans mesure.
const cell = (formatted: string): NonNullable<CompareSection['rows'][number]['cells'][number]> => ({
  formatted, original: null, value: null, unit: null,
  delta: null, delta_formatted: null, anomaly: null,
});

const section: CompareSection = {
  key: 'components', label: 'Components', requires_sizes: true,
  hint: 'Choose a size for size-dependent components',
  // Seule la section géométrie porte une figure (contrat #40) : ici, rien à dessiner.
  figure: null,
  rows: [
    { key: 'fork', label: 'Fork', kind: 'text', labels_original: ['Fork', 'Fork'], status: 'same', cells: [cell('Fox 36'), cell('Fox 36')] },
    { key: 'stem', label: 'Stem', kind: 'text', labels_original: [null, 'Stem'], status: 'partial', cells: [null, cell('90 mm')] },
  ],
};

test('comparaison : avertissement de taille et composants connus restent visibles ensemble', async ({ page }) => {
  await page.setContent(renderToStaticMarkup(<table dir="rtl"><ComparisonSection section={section} columnCount={4} canAdd dash="—" /></table>));
  await expect(page.getByText(section.hint!)).toBeVisible();
  await expect(page.getByRole('row', { name: 'Fork Fox 36 Fox 36' })).toBeVisible();
  const stem = page.getByRole('row', { name: 'Stem — 90 mm' });
  await expect(stem).toBeVisible();
  await expect(stem.locator('td')).toHaveCount(3);
  await expect(stem.locator('bdi')).toHaveCSS('direction', 'ltr');
});

test('géométrie : aucune mesure fabriquée quand les tailles manquent', async ({ page }) => {
  const geometry: CompareSection = { ...section, key: 'geometry', label: 'Geometry', rows: [] };
  await page.setContent(renderToStaticMarkup(<table><ComparisonSection section={geometry} columnCount={3} canAdd={false} dash="—" /></table>));
  await expect(page.getByRole('heading', { name: 'Geometry' })).toBeVisible();
  await expect(page.getByText(section.hint!)).toBeVisible();
  await expect(page.locator('th[scope="row"]')).toHaveCount(0);
});
