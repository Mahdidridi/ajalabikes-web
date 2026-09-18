/** @jsxImportSource react */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { GeometryFigure, type GeometryFigureLabels } from '../../src/components/GeometryFigure';
import type { CompareFigure } from '../../src/lib/api';

// Fixture de contrat : aucune dépendance au catalogue vivant ni à l'API locale.
// Les coordonnées sont celles que Laravel calcule — le composant n'en dérive
// aucune, il ne fait que les tracer.
const roues = {
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

const figure: CompareFigure = {
  unit: 'mm',
  bikes: [
    {
      drawable: true,
      missing: [],
      sta_used: 'seat_tube_angle_effective',
      front_axle_method: 'wheelbase',
      points: {
        bb: [0, 0],
        rear_axle: [-438, -60],
        front_axle: [700, -60],
        head_top: [435, 606],
        head_bottom: [470, 510],
        seat_top: [-115, 410],
      },
      wheels: roues,
      segments: {
        seat_tube: ['bb', 'seat_top'],
        top_tube: ['seat_top', 'head_top'],
        head_tube: ['head_top', 'head_bottom'],
        down_tube: ['head_bottom', 'bb'],
        chainstay: ['bb', 'rear_axle'],
      },
    },
    {
      drawable: false,
      missing: ['stack', 'wheel_size'],
      sta_used: null,
      front_axle_method: null,
      points: null,
      wheels: null,
      segments: null,
    },
  ],
  marks: [
    {
      key: 'reach',
      bikes: [
        {
          value: 435,
          unit: 'mm',
          method: 'bb_to_head_top',
          approximate: false,
          assumption: null,
          segments: [[[0, 606], [435, 606]]],
          polylines: [],
        },
        null,
      ],
    },
  ],
};

const labels: GeometryFigureLabels = {
  title: 'Overlaid frames',
  drawn: 'Frames drawn: {bikes}.',
  undrawable: '{bike} is not drawn: {missing} not published.',
  highlighted: 'Highlighted measurement: {label}.',
  nothingToDraw: 'No frame can be drawn.',
  listSeparator: ', ',
};

const bikes = [
  { name: 'Giant Talon 2', size: 'M' },
  { name: 'Trek Marlin 5', size: 'L' },
];

function render(active?: string) {
  return renderToStaticMarkup(
    <GeometryFigure
      figure={figure}
      bikes={bikes}
      activeMark={active ?? null}
      activeLabel={active ? 'Reach' : null}
      labels={labels}
    />,
  );
}

test('seul le vélo dessinable est tracé, et le manquant est nommé avec ses cotes absentes', async ({ page }) => {
  await page.setContent(render());

  // Un seul cadre : cinq segments plus le repère de boîtier, et deux roues.
  await expect(page.locator('svg[role=img] > g > g')).toHaveCount(1);
  await expect(page.locator('svg[role=img] line[stroke-width="6"]')).toHaveCount(5);
  await expect(page.locator('svg[role=img] circle[r="340"]')).toHaveCount(2);

  const description = page.locator('#geometry-figure-desc');
  await expect(description).toContainText('Frames drawn: Giant Talon 2 · M.');
  await expect(description).toContainText('Trek Marlin 5 · L is not drawn: stack, wheel_size not published.');
});

test('la légende ne liste que les vélos réellement dessinés', async ({ page }) => {
  await page.setContent(render());

  const legende = page.locator('figcaption bdi');
  await expect(legende).toHaveCount(1);
  await expect(legende).toHaveText('Giant Talon 2 · M');
});

test('le viewBox englobe roues et sol, avec la marge constante', async ({ page }) => {
  await page.setContent(render());

  // x : de -438-340-40 à 700+340+40 ; y retourné : de -(606+40) à 400+40.
  await expect(page.locator('svg[role=img]')).toHaveAttribute('viewBox', '-818 -646 1898 1086');
});

test('une cote active surligne le repère fourni par l API, sans le recalculer', async ({ page }) => {
  await page.setContent(render('reach'));

  const repere = page.locator('svg[role=img] g[stroke-width="10"] line');
  await expect(repere).toHaveCount(1);
  await expect(repere).toHaveAttribute('x1', '0');
  await expect(repere).toHaveAttribute('x2', '435');
  await expect(page.locator('#geometry-figure-desc')).toContainText('Highlighted measurement: Reach.');
});

for (const dir of ['ltr', 'rtl'] as const) {
  test(`page ${dir} : le dessin reste LTR et l axe avant reste à droite`, async ({ page }) => {
    await page.setContent(`<main dir="${dir}">${render()}</main>`);

    await expect(page.locator('figure')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('figure')).toHaveCSS('direction', 'ltr');

    // Le miroir RTL est invisible à un test textuel : on mesure.
    const avant = await page.locator('svg[role=img] circle[r="340"]').first().boundingBox();
    const arriere = await page.locator('svg[role=img] circle[r="340"]').last().boundingBox();
    expect(avant!.x).toBeGreaterThan(arriere!.x);
  });
}

test('sans aucun cadre dessinable, aucun SVG trompeur n est rendu', async ({ page }) => {
  const vide: CompareFigure = { ...figure, bikes: [figure.bikes[1]], marks: [] };
  await page.setContent(renderToStaticMarkup(
    <GeometryFigure figure={vide} bikes={[bikes[1]]} labels={labels} />,
  ));

  await expect(page.locator('svg')).toHaveCount(0);
  await expect(page.locator('p')).toContainText('No frame can be drawn.');
});
