/** @jsxImportSource react */
import type { CompareFigure } from '@/lib/api';

/**
 * Le schéma des cadres superposés, aligné sur le boîtier de pédalier.
 *
 * Aucune formule métier ici (règle 3) : points, segments, roues, sol et repères
 * arrivent calculés par Laravel. Le seul calcul admis est le rectangle englobant
 * qui donne le `viewBox`, et l'axe Y est retourné par une transformation SVG
 * déclarative — jamais coordonnée par coordonnée.
 *
 * Décision du 18 septembre 2026 : le dessin reste `dir="ltr"` même en arabe. Un
 * cadre miroir serait un autre vélo ; l'axe avant est toujours à droite.
 */

/** Marge visuelle constante autour du rectangle englobant, en millimètres. */
const MARGIN = 40;

/**
 * Une série par vélo : couleur ET motif, jamais la couleur seule. Les teintes
 * sont sémantiquement neutres — aucune n'exprime « meilleur » ou « moins bon ».
 */
const SERIES = [
  { stroke: 'text-[#0F766E] dark:text-[#5EEAD4]', dash: undefined },
  { stroke: 'text-[#B45309] dark:text-[#FCD34D]', dash: '7 4' },
  { stroke: 'text-[#6D28D9] dark:text-[#C4B5FD]', dash: '2 3' },
] as const;

/**
 * Les libellés traversent la frontière serveur → client : ce sont des chaînes à
 * trous, jamais des fonctions. Next refuse de sérialiser une fonction vers un
 * composant client, et ni le typecheck ni le build ne le disent — seule la page
 * rendue le révèle, en 500.
 */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

export type GeometryFigureLabels = {
  /** Nom accessible de la figure entière. */
  title: string;
  /** Description accessible : « Frames drawn: {bikes}. » */
  drawn: string;
  /** Vélo non dessinable : « {bike} is not drawn: {missing} not published. » */
  undrawable: string;
  /** Cote surlignée : « Highlighted measurement: {label}. » */
  highlighted: string;
  /** Aucun cadre dessinable : on n'affiche pas un SVG trompeur. */
  nothingToDraw: string;
  /** Sépare une énumération dans la langue de la page. */
  listSeparator: string;
};

type Bike = { name: string; size: string | null };

function boundingBox(figure: CompareFigure): [number, number, number, number] | null {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const bike of figure.bikes) {
    if (!bike.drawable || bike.points === null) continue;

    for (const [x, y] of Object.values(bike.points)) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      xs.push(x);
      ys.push(y);
    }

    if (bike.wheels !== null) {
      const { radius, ground_y: ground } = bike.wheels;
      for (const { center } of [bike.wheels.front, bike.wheels.rear]) {
        xs.push(center[0] - radius, center[0] + radius);
        ys.push(center[1] - radius, center[1] + radius);
      }
      if (Number.isFinite(ground)) ys.push(ground);
    }
  }

  if (xs.length === 0 || ys.length === 0) return null;

  const minX = Math.min(...xs) - MARGIN;
  const maxX = Math.max(...xs) + MARGIN;
  const minY = Math.min(...ys) - MARGIN;
  const maxY = Math.max(...ys) + MARGIN;

  // L'axe Y est retourné par la transformation du groupe : le viewBox est donc
  // exprimé dans ce repère, sans toucher une seule coordonnée de l'API.
  return [minX, -maxY, maxX - minX, maxY - minY];
}

export function GeometryFigure({ figure, bikes, activeMark, activeLabel, labels }: {
  figure: CompareFigure;
  bikes: Bike[];
  activeMark?: string | null;
  activeLabel?: string | null;
  labels: GeometryFigureLabels;
}) {
  const box = boundingBox(figure);
  const nommer = (i: number) => [bikes[i]?.name, bikes[i]?.size].filter(Boolean).join(' · ');

  const dessines = figure.bikes
    .map((bike, i) => (bike.drawable && bike.points !== null ? nommer(i) : null))
    .filter((nom): nom is string => nom !== null);

  const absents = figure.bikes
    .map((bike, i) => (bike.drawable && bike.points !== null
      ? null
      : { nom: nommer(i), missing: bike.missing }))
    .filter((absent): absent is { nom: string; missing: string[] } => absent !== null);

  const marque = activeMark ? figure.marks.find((m) => m.key === activeMark) ?? null : null;

  const description = [
    dessines.length > 0
      ? fill(labels.drawn, { bikes: dessines.join(labels.listSeparator) })
      : labels.nothingToDraw,
    ...absents.map((a) => fill(labels.undrawable, {
      bike: a.nom,
      missing: a.missing.join(labels.listSeparator),
    })),
    marque !== null && activeLabel ? fill(labels.highlighted, { label: activeLabel }) : null,
  ].filter(Boolean).join(' ');

  if (box === null) {
    return (
      <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
        {description}
      </p>
    );
  }

  const [x, y, largeur, hauteur] = box;

  return (
    // `dir` n'est pas une propriété SVG : c'est le conteneur qui fixe le sens,
    // et le dessin l'hérite. Un cadre miroir serait un autre vélo.
    <figure className="m-0" dir="ltr">
      <svg
        role="img"
        aria-label={labels.title}
        aria-describedby="geometry-figure-desc"
        viewBox={`${x} ${y} ${largeur} ${hauteur}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ aspectRatio: `${largeur} / ${hauteur}` }}
      >
        <desc id="geometry-figure-desc">{description}</desc>
        {/* Y vers le haut côté données, vers le bas côté SVG : une seule bascule. */}
        <g transform="scale(1 -1)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {figure.bikes.map((bike, i) => {
            if (!bike.drawable || bike.points === null) return null;
            const serie = SERIES[i % SERIES.length];
            const points = bike.points;
            const roues = bike.wheels;

            return (
              // Une cote active estompe les cadres : le contraste vient du
              // retrait, jamais d'une couleur ajoutée qui vaudrait jugement.
              <g
                key={i}
                className={serie.stroke}
                stroke="currentColor"
                strokeDasharray={serie.dash}
                opacity={marque !== null ? 0.3 : 1}
              >
                {roues !== null && (
                  <>
                    <line
                      x1={x}
                      y1={roues.ground_y}
                      x2={x + largeur}
                      y2={roues.ground_y}
                      strokeWidth={2}
                      strokeDasharray="4 6"
                      opacity={0.45}
                    />
                    {[roues.front, roues.rear].map((roue, j) => (
                      <circle
                        key={j}
                        cx={roue.center[0]}
                        cy={roue.center[1]}
                        r={roues.radius}
                        strokeWidth={3}
                        opacity={0.5}
                      />
                    ))}
                  </>
                )}
                {bike.segments !== null && Object.entries(bike.segments).map(([nom, [depuis, vers]]) => {
                  const a = points[depuis];
                  const b = points[vers];
                  if (a === undefined || b === undefined) return null;

                  return <line key={nom} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={6} />;
                })}
                {/* Le boîtier est l'origine commune : c'est lui qui rend la
                    superposition lisible, pas une grille décorative. */}
                <circle cx={0} cy={0} r={7} strokeWidth={3} />
              </g>
            );
          })}
          {marque !== null && marque.bikes.map((repere, i) => {
            if (repere === null) return null;
            const serie = SERIES[i % SERIES.length];

            return (
              <g
                key={`mark-${i}`}
                className={serie.stroke}
                stroke="currentColor"
                strokeWidth={10}
                // Le motif suit la série jusque sur le repère : deux cotes
                // presque égales se superposent, et sans lui la seconde
                // masquerait la première.
                strokeDasharray={serie.dash}
              >
                {repere.segments.map(([a, b], j) => (
                  <line key={j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
                ))}
                {repere.polylines.map((ligne, j) => (
                  <polyline key={j} points={ligne.map(([px, py]) => `${px},${py}`).join(' ')} />
                ))}
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {figure.bikes.map((bike, i) => {
          if (!bike.drawable || bike.points === null) return null;
          const serie = SERIES[i % SERIES.length];

          return (
            <span key={i} className="inline-flex items-center gap-2">
              <svg aria-hidden="true" width="22" height="8" viewBox="0 0 22 8" className={serie.stroke}>
                <line
                  x1="1"
                  y1="4"
                  x2="21"
                  y2="4"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={serie.dash}
                />
              </svg>
              <bdi className="font-mono">{nommer(i)}</bdi>
            </span>
          );
        })}
      </figcaption>
    </figure>
  );
}
