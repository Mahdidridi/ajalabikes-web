import type { BuildSize, CompareFigure, GeometryRow } from '@/lib/api';

/**
 * Le tableau de géométrie de la fiche, toutes tailles confondues (web #66, décision du fondateur du 14 octobre 2026).
 *
 * RIEN N'EST CALCULÉ ICI (règle 3 : Laravel réfléchit, Next affiche) : ces fonctions changent la FORME de ce que l'API sert,
 * jamais une valeur. Le tableau est un pivot de `sizes[].geometry` ; le dessin d'une taille est remis dans la forme que
 * `GeometryFigure` attend, celle du comparateur.
 */

export type MatrixMode = 'value' | 'published';
export type MatrixCell = { formatted: string; doubtful: boolean } | null;
export type MatrixRow = { key: string; label: string; cells: MatrixCell[] };

/**
 * Une cellule, selon le mode. « Valeur » : la valeur normalisée ; une anomalie l'invalide (Specialized Enduro Comp 2025 :
 * un angle de direction publié en millimètres), on montre alors la valeur publiée, signalée douteuse — jamais une valeur
 * normalisée. « Telle que publiée » : la valeur du constructeur, avec son unité d'origine, toujours servie.
 */
function cell(row: GeometryRow, mode: MatrixMode): MatrixCell {
  const doubtful = row.anomaly !== null || row.value_formatted === null;
  if (mode === 'published' || doubtful) return { formatted: row.original_formatted, doubtful };

  return { formatted: row.value_formatted!, doubtful: false };
}

/**
 * Les lignes des cotes : les clés de la première taille dans l'ordre source, puis celles que seules d'autres tailles
 * portent (six éditions : Canyon `rim_height` sur une taille, Scott `maximum_seatpost_insertion` sur cinq sur six), dans
 * leur ordre d'apparition. Une cote absente d'une taille donne une cellule vide — jamais une valeur devinée.
 */
export function matrixRows(sizes: readonly BuildSize[], mode: MatrixMode): MatrixRow[] {
  const order: string[] = [];
  const labels = new Map<string, string>();
  for (const size of sizes) {
    for (const row of size.geometry) {
      if (!labels.has(row.key)) {
        order.push(row.key);
        labels.set(row.key, row.label);
      }
    }
  }

  return order.map((key) => ({
    key,
    label: labels.get(key)!,
    cells: sizes.map((size) => {
      const row = size.geometry.find((g) => g.key === key);

      return row === undefined ? null : cell(row, mode);
    }),
  }));
}

/**
 * Les lignes de tête — roue, taille du cycliste, entrejambe — seulement quand une taille au moins porte la valeur : Trek
 * et Canyon publient la taille du cycliste, Trek seul l'entrejambe. Déjà formatées par Laravel.
 */
export function headRows(
  sizes: readonly BuildSize[],
  labels: { wheels: string; height: string; inseam: string },
): MatrixRow[] {
  const rows: MatrixRow[] = [
    { key: 'wheel_size', label: labels.wheels, cells: sizes.map((s) => (s.wheel_size === null ? null : { formatted: s.wheel_size, doubtful: false })) },
    { key: 'rider_height', label: labels.height, cells: sizes.map((s) => (s.rider_height === null ? null : { formatted: s.rider_height, doubtful: false })) },
    { key: 'rider_inseam', label: labels.inseam, cells: sizes.map((s) => (s.rider_inseam === null ? null : { formatted: s.rider_inseam, doubtful: false })) },
  ];

  return rows.filter((row) => row.cells.some((c) => c !== null));
}

/**
 * Le dessin d'UNE taille (`sizes[].figure`, api #40) dans la forme du comparateur (`CompareFigure`) : un seul vélo, et les
 * repères indexés par clé deviennent la liste `{key, bikes: [repère]}`. Les deux formes portent les mêmes champs ; aucun
 * point n'est recalculé, le front ne fait que tracer.
 */
export function singleBikeFigure(figure: BuildSize['figure']): CompareFigure {
  const { marks, ...bike } = figure;

  return {
    unit: 'mm',
    bikes: [bike],
    marks: Object.entries(marks).map(([key, mark]) => ({ key, bikes: [mark] })),
  };
}
