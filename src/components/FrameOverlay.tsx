/** @jsxImportSource react */
import type { BuildFigure, HotspotCalibration } from '@/lib/api';

/**
 * Les tubes et une cote de la figure de cadre, posés sur la photo.
 *
 * Aucune formule (règle 3) : les points sont en mm, origine au pédalier ; la
 * transformation servie par l'API (`origin_px`, `px_per_mm`) les amène en pixels
 * de la photo, et l'axe Y est retourné par le `scale(s -s)` déclaratif. Le trait
 * garde son épaisseur à l'écran (`non-scaling-stroke`) quelle que soit l'échelle.
 *
 * Décision du 23 septembre 2026 (fondateur) : le tracé d'une autre taille que
 * celle photographiée est une forme mise à l'échelle sur l'empattement de la
 * photo, déclarée approximative — la mention est portée par le composant parent.
 */
export function FrameOverlay({
  figure,
  calibration,
  activeMark,
}: {
  figure: BuildFigure;
  calibration: Pick<HotspotCalibration, 'origin_px' | 'px_per_mm'>;
  activeMark: string | null;
}) {
  if (!figure.drawable || figure.points === null || figure.segments === null) return null;

  const points = figure.points;
  const [ox, oy] = calibration.origin_px;
  const s = calibration.px_per_mm;
  const mark = activeMark !== null ? figure.marks[activeMark] : undefined;

  return (
    <g
      transform={`translate(${ox} ${oy}) scale(${s} ${-s})`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#0F766E] dark:text-[#5EEAD4]"
    >
      {Object.entries(figure.segments).map(([nom, [depuis, vers]]) => {
        const a = points[depuis];
        const b = points[vers];
        // Une extrémité absente ferait partir la ligne du boîtier : on ne trace pas.
        if (!a || !b) return null;

        return (
          <line
            key={nom}
            className="frame-segment"
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {mark && (
        <g className="text-[#B45309] dark:text-[#FCD34D]" stroke="currentColor" strokeWidth={4}>
          {mark.segments.map(([a, b], j) => (
            <line
              key={j}
              className="frame-mark"
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {mark.polylines.map((ligne, j) => (
            <polyline
              key={j}
              className="frame-mark"
              points={ligne.map(([px, py]) => `${px},${py}`).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}
    </g>
  );
}
