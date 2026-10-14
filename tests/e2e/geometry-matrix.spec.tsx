/** @jsxImportSource react */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { GeometryMatrix, type GeometryMatrixLabels } from '../../src/components/GeometryMatrix';
import type { BuildSize, GeometryGlossary, GeometryRow } from '../../src/lib/api';
import { headRows, matrixRows, singleBikeFigure } from '../../src/lib/geometry-matrix';

/**
 * Le tableau de géométrie de la fiche (web #66), rendu seul : ni API, ni serveur. Fixtures typées depuis le contrat
 * généré ; les libellés attendus sont écrits ici en toutes lettres. Les pages réelles sont dans `geometry-matrix.spec.ts`.
 */
const labels: GeometryMatrixLabels = {
  title: 'Geometry',
  drawn: 'Frames drawn: {bikes}.',
  undrawable: '{bike} is not drawn: {missing} not published.',
  highlighted: 'Highlighted measurement: {label}.',
  nothingToDraw: 'No frame can be drawn.',
  listSeparator: ', ',
  dash: '—',
  explain: 'Explain {label}',
  highlight: 'Highlight {label} on the drawing',
  doubtful: 'Published value looks wrong',
  effect: 'Effect:',
  caveat: 'Caveat:',
  sourceLabels: 'Manufacturer labels:',
  related: 'Related measurements:',
  measure: 'Measure',
  value: 'Value',
  source: 'As published',
  wheels: 'Wheels',
  height: 'Rider height',
  inseam: 'Inseam',
};

const wheels = {
  radius: 340,
  method: 'illustrative_nominal_outer_diameter' as const,
  assumption: 'Nominal outer diameter',
  source_circumference_mm: 2136,
  rounding_mm: 5,
  measurement: false as const,
  ground_y: -400,
  front: { center: [700, -60] as [number, number] },
  rear: { center: [-438, -60] as [number, number] },
};

const reachMark = {
  value: 435,
  unit: 'mm' as const,
  method: 'bb_to_head_top',
  approximate: false,
  assumption: null,
  segments: [[[0, 606], [435, 606]]] as [[number, number], [number, number]][],
  polylines: [] as [number, number][][],
};

function drawable(reach: number): BuildSize['figure'] {
  return {
    unit: 'mm',
    drawable: true,
    missing: [],
    sta_used: 'seat_tube_angle_effective',
    front_axle_method: 'wheelbase',
    points: { bb: [0, 0], rear_axle: [-438, -60], front_axle: [700, -60], head_top: [reach, 606], head_bottom: [reach + 35, 510], seat_top: [-115, 410] },
    wheels,
    segments: { seat_tube: ['bb', 'seat_top'], top_tube: ['seat_top', 'head_top'], head_tube: ['head_top', 'head_bottom'], down_tube: ['head_bottom', 'bb'], chainstay: ['bb', 'rear_axle'] },
    marks: { reach: { ...reachMark, value: reach, segments: [[[0, 606], [reach, 606]]] } },
  };
}

const undrawable: BuildSize['figure'] = {
  unit: 'mm', drawable: false, missing: ['stack'], sta_used: null, front_axle_method: null, points: null, wheels: null, segments: null, marks: {},
};

function row(key: string, label: string, mm: number, over: Partial<GeometryRow> = {}): GeometryRow {
  return {
    key, label, value_formatted: `${mm} mm`, value_raw: mm, unit: 'mm', anomaly: null,
    original_formatted: `${mm} mm`, original_value: String(mm), original_unit: 'mm', ...over,
  };
}

function size(label: string, geometry: GeometryRow[], over: Partial<BuildSize> = {}): BuildSize {
  return { label, label_alt: null, wheel_size: '29"', rider_height: null, rider_inseam: null, figure: drawable(435), geometry, ...over };
}

// M : un angle de direction publié en millimètres (anomalie) ; L : une cote de plus, et la taille du cycliste.
const M = size('M', [
  row('stack', 'Stack', 606),
  row('reach', 'Reach', 435),
  row('head_tube_angle', 'Head tube angle', 0, {
    value_formatted: null, value_raw: null, unit: null, anomaly: 'unit_mismatch', original_formatted: '64.3 mm', original_value: '64.3', original_unit: 'mm',
  }),
]);
const L = size('L', [
  row('stack', 'Stack', 625),
  row('reach', 'Reach', 455),
  row('head_tube_angle', 'Head tube angle', 67, { value_formatted: '67°', unit: 'deg', original_formatted: '67.0°', original_value: '67.0', original_unit: 'deg' }),
  row('seat_post_insertion_depth', 'Seat post insertion depth', 250),
], { figure: drawable(455), rider_height: '177–188 cm' });

const glossary: GeometryGlossary = {
  items: [{ key: 'reach', label: 'Reach', definition: 'Horizontal distance from the bottom bracket to the head tube top.', effect: 'A longer reach stretches the rider.', caveat: null, related: ['stack'] }],
};

test('les lignes suivent l’ordre source de la première taille, puis les cotes propres aux autres tailles', () => {
  const rows = matrixRows([M, L], 'value');

  expect(rows.map((r) => r.key)).toEqual(['stack', 'reach', 'head_tube_angle', 'seat_post_insertion_depth']);
  expect(rows[3].cells).toEqual([null, { formatted: '250 mm', doubtful: false }]);
  expect(rows[0].cells).toEqual([{ formatted: '606 mm', doubtful: false }, { formatted: '625 mm', doubtful: false }]);
});

test('une anomalie montre la valeur publiée, signalée douteuse — jamais une valeur normalisée', () => {
  const angle = matrixRows([M, L], 'value')[2];

  expect(angle.cells).toEqual([{ formatted: '64.3 mm', doubtful: true }, { formatted: '67°', doubtful: false }]);
});

test('le mode « telle que publiée » montre la valeur du constructeur partout, l’anomalie restant signalée', () => {
  const rows = matrixRows([M, L], 'published');

  expect(rows[2].cells).toEqual([{ formatted: '64.3 mm', doubtful: true }, { formatted: '67.0°', doubtful: false }]);
  expect(rows[0].cells[0]).toEqual({ formatted: '606 mm', doubtful: false });
});

test('les lignes de tête n’existent que si une taille au moins porte la valeur', () => {
  const rows = headRows([M, L], { wheels: 'Wheels', height: 'Rider height', inseam: 'Inseam' });

  expect(rows.map((r) => r.key)).toEqual(['wheel_size', 'rider_height']);
  expect(rows[1].cells).toEqual([null, { formatted: '177–188 cm', doubtful: false }]);
});

test('le dessin d’une taille prend la forme du comparateur : un vélo, les repères en liste', () => {
  const figure = singleBikeFigure(M.figure);

  expect(figure.bikes).toHaveLength(1);
  expect(figure.bikes[0]).not.toHaveProperty('marks');
  expect(figure.bikes[0].wheels).toEqual(wheels);
  expect(figure.marks).toEqual([{ key: 'reach', bikes: [M.figure.marks.reach] }]);
});

const render = (sizes: BuildSize[], g: GeometryGlossary | null = glossary, dir: 'ltr' | 'rtl' = 'ltr') =>
  renderToStaticMarkup(<main dir={dir}><section id="geometry"><GeometryMatrix sizes={sizes} bikeName="Giant Talon 1" glossary={g} labels={labels} /></section></main>);

test('toutes les tailles en colonnes, la première choisie, un tiret pour une cote absente, la valeur douteuse signalée', async ({ page }) => {
  await page.setContent(render([M, L]));

  await expect(page.locator('#geometry thead th')).toHaveCount(3);
  await expect(page.locator('#geometry th[data-selected]')).toHaveText('M');
  await expect(page.locator('#geometry button[aria-pressed="true"] span').first()).toHaveText('M');
  await expect(page.locator('#geometry tr[data-row="seat_post_insertion_depth"] td').first()).toHaveText('—');
  const angle = page.locator('#geometry tr[data-row="head_tube_angle"] td[data-selected]');
  await expect(angle).toContainText('64.3 mm');
  await expect(angle).toContainText('Published value looks wrong');
  await expect(page.locator('#geometry tr[data-row="stack"] td[data-selected]')).toHaveText('606 mm');
  // Le dessin de la taille choisie, avec sa légende.
  await expect(page.locator('#geometry svg[role=img]')).toHaveCount(1);
  await expect(page.locator('#geometry figcaption bdi')).toHaveText('Giant Talon 1 · M');
});

test('« ? » seulement pour une cote du glossaire ; aucun surlignage sur une ligne de tête', async ({ page }) => {
  await page.setContent(render([M, L]));

  await expect(page.locator('#geometry tr[data-row="reach"] button[aria-expanded]')).toHaveCount(1);
  await expect(page.locator('#geometry tr[data-row="stack"] button[aria-expanded]')).toHaveCount(0);
  await expect(page.locator('#geometry tr[data-row="wheel_size"] button')).toHaveCount(0);
  await expect(page.locator('#geometry tr[data-row="reach"] th button[aria-pressed]')).toHaveAttribute('aria-label', 'Highlight Reach on the drawing');
});

test('sans glossaire, aucun bouton « ? » ; la bascule et les tailles restent', async ({ page }) => {
  await page.setContent(render([M, L], null));

  await expect(page.locator('#geometry button[aria-expanded]')).toHaveCount(0);
  await expect(page.locator('#geometry button', { hasText: 'As published' })).toHaveCount(1);
});

test('une taille non dessinable garde son tableau, avec le message et sans SVG', async ({ page }) => {
  await page.setContent(render([size('S', M.geometry, { figure: undrawable })]));

  await expect(page.locator('#geometry svg')).toHaveCount(0);
  await expect(page.locator('#geometry p')).toContainText('No frame can be drawn.');
  await expect(page.locator('#geometry thead th')).toHaveCount(2);
  await expect(page.locator('#geometry tr[data-row="reach"] th button[aria-pressed]')).toHaveCount(0);
});

test('en arabe, le dessin précède le tableau dans le flux et les valeurs restent isolées dans <bdi>', () => {
  const html = render([M, L], glossary, 'rtl');

  expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('<table'));
  expect(html).toMatch(/<bdi>606 mm<\/bdi>/);
  // Le guillemet du pouce est échappé par React dans le HTML statique.
  expect(html).toMatch(/<bdi>29&quot;<\/bdi>/);
});
