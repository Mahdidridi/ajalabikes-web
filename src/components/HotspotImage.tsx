'use client';
/** @jsxImportSource react */
import { useEffect, useId, useRef, useState } from 'react';
import { FrameOverlay } from '@/components/FrameOverlay';
import { direction, type Build, type HotspotImage as HotspotImageData, type Locale } from '@/lib/api';

/**
 * L'image à hotspots : la photo de tête, ses points numérotés, leurs étiquettes,
 * un gros plan au clic, les cotes de géométrie en option.
 *
 * Décision du 23 septembre 2026 (fondateur, cadrage « image à hotspots ») : une
 * seule image par vélo, jamais retournée en RTL ; une seule version pour l'arabe
 * et l'anglais ; image fixe, aucun mouvement ; gros plan = recadrage servi du
 * zoom autour de l'ancre ; LE FRONT NE CALCULE RIEN, il pose ce que l'API sert.
 *
 * Ce que ce composant a le droit de faire, et rien d'autre (§5.6 du cadrage) :
 * convertir des pixels de l'original en pourcentages du `view_box` (origine
 * retranchée — piège du 20 septembre), appliquer la transformation servie,
 * fixer la police à `font_fraction` de la largeur du conteneur, afficher le
 * rectangle `closeup` servi. Le passage en mode liste est une décision de
 * présentation : quand la police tomberait sous 12 px, les étiquettes quittent
 * la photo pour une liste.
 */
export type HotspotCopy = {
  closeLabel: string;
  sizeLabel: string;
  showDimensions: string;
  hideDimensions: string;
  listMode: string;
  imageFailed: string;
};

const MIN_FONT_PX = 12;

export function HotspotImage({
  image,
  sizes,
  locale,
  copy,
}: {
  image: HotspotImageData;
  sizes: Build['sizes'];
  locale: Locale;
  copy: HotspotCopy;
}) {
  const [vx, vy, vw, vh] = image.view_box;
  const dir = direction(locale);
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [showDims, setShowDims] = useState(false);
  const [size, setSize] = useState(image.reference_size);
  const [mode, setMode] = useState<'stage' | 'list'>('stage');
  const [imageFailed, setImageFailed] = useState(false);

  // Pourcentages du cadrage servi. L'origine du cadrage est retranchée : tant
  // qu'elle valait 0, l'oubli était invisible ; avec une marge à gauche il
  // décalait toutes les étiquettes (20 septembre 2026).
  const px = (x: number) => ((x - vx) / vw) * 100;
  const py = (y: number) => ((y - vy) / vh) * 100;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setMode(width * image.font_fraction < MIN_FONT_PX ? 'list' : 'stage');
    });
    observer.observe(stage);

    return () => observer.disconnect();
  }, [image.font_fraction]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  const calibration = image.calibration.by_size.find((c) => c.size === size) ?? null;
  const figure = sizes.find((s) => s.label === size)?.figure ?? null;
  const current = open === null ? null : (image.hotspots.find((h) => h.n === open) ?? null);
  const showLabelsOnStage = mode === 'stage' && !imageFailed;
  const anchorRadius = 0.011 * vw;
  const digitSize = 0.014 * vw;

  const button = (h: HotspotImageData['hotspots'][number], onStage: boolean) => (
    <button
      key={h.id}
      type="button"
      className={
        onStage
          ? 'hotspot-label absolute flex items-center justify-center rounded-full border border-neutral-900 bg-white/95 px-[0.6em] leading-none text-neutral-900 shadow-sm hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-100 dark:bg-neutral-900/95 dark:text-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-neutral-900'
          : 'hotspot-label flex items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-start hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800'
      }
      style={
        onStage
          ? {
              left: `${px(h.label_at[0])}%`,
              top: `${py(h.label_at[1])}%`,
              width: `${(h.label_box[0] / vw) * 100}%`,
              height: `${(h.label_box[1] / vh) * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `calc(${image.font_fraction} * 100cqw)`,
            }
          : undefined
      }
      dir={dir}
      data-n={h.n}
      data-active={active === h.n ? 'true' : undefined}
      aria-haspopup="dialog"
      aria-label={`${h.n}. ${h.title}`}
      onClick={() => setOpen(h.n)}
      onMouseEnter={() => setActive(h.n)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(h.n)}
      onBlur={() => setActive(null)}
    >
      <span className="hotspot-label-text whitespace-nowrap">
        {String(h.n)} {h.label}
      </span>
    </button>
  );

  return (
    <figure className="m-0 flex flex-col gap-3">
      {/* La scène est LTR : le vélo ne se retourne jamais. Les boutons portent
          la direction de la page, le texte suit la langue. */}
      <div
        ref={stageRef}
        dir="ltr"
        data-stage
        data-mode={mode}
        className="relative w-full overflow-hidden bg-[#f5f5f2] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
        style={{ aspectRatio: `${vw} / ${vh}`, containerType: 'inline-size' }}
      >
        <div
          className="absolute"
          style={{
            left: `${px(0)}%`,
            top: `${py(0)}%`,
            width: `${(image.image.w / vw) * 100}%`,
            height: `${(image.image.h / vh) * 100}%`,
          }}
        >
          {/* Une balise <img> : le SVG <image> n'a pas de srcset, et la place est
              déjà réservée par le rapport du cadrage. Les deux URL viennent de l'API. */}
          <img
            src={image.image.sizes.detail.url}
            srcSet={`${image.image.sizes.detail.url} ${image.image.sizes.detail.w}w, ${image.image.sizes.detail_2x.url} ${image.image.sizes.detail_2x.w}w`}
            sizes="(min-width: 1024px) 60vw, 100vw"
            alt=""
            width={image.image.w}
            height={image.image.h}
            className="block h-full w-full"
            decoding="async"
            fetchPriority="high"
            onError={() => setImageFailed(true)}
          />
        </div>

        {imageFailed ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm" dir={dir}>
            {copy.imageFailed}
          </p>
        ) : (
          <svg
            viewBox={`${vx} ${vy} ${vw} ${vh}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
          >
            {showDims && figure !== null && calibration !== null && (
              <FrameOverlay figure={figure} calibration={calibration} activeMark={null} />
            )}
            {showLabelsOnStage &&
              image.hotspots.map((h) => (
                <line
                  key={`leader-${h.id}`}
                  className="hotspot-leader"
                  data-n={h.n}
                  x1={h.at[0]}
                  y1={h.at[1]}
                  x2={h.leader_to[0]}
                  y2={h.leader_to[1]}
                  stroke="currentColor"
                  strokeWidth={active === h.n ? 3 : 1.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            {image.hotspots.map((h) => (
              <g key={`anchor-${h.id}`}>
                <circle
                  className="hotspot-anchor"
                  data-n={h.n}
                  cx={h.at[0]}
                  cy={h.at[1]}
                  r={active === h.n ? anchorRadius * 1.25 : anchorRadius}
                  fill="currentColor"
                  stroke="#ffffff"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={h.at[0]}
                  y={h.at[1]}
                  fill="#ffffff"
                  fontSize={digitSize}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {String(h.n)}
                </text>
              </g>
            ))}
          </svg>
        )}

        {showLabelsOnStage && image.hotspots.map((h) => button(h, true))}
      </div>

      {mode === 'list' && !imageFailed && (
        <ol className="hotspot-list flex flex-col gap-2" aria-label={copy.listMode}>
          {image.hotspots.map((h) => (
            <li key={h.id}>{button(h, false)}</li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          aria-pressed={showDims}
          onClick={() => setShowDims((v) => !v)}
        >
          {showDims ? copy.hideDimensions : copy.showDimensions}
        </button>
        {showDims && (
          <label className="flex items-center gap-2">
            <span>{copy.sizeLabel}</span>
            <select
              className="rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
              value={size}
              onChange={(event) => setSize(event.target.value)}
            >
              {image.calibration.by_size.map((c) => (
                <option key={c.size} value={c.size}>
                  {c.size}
                </option>
              ))}
            </select>
          </label>
        )}
        {showDims && <span className="text-muted">{image.approximation_note}</span>}
      </div>

      {image.attribution !== null && (
        <figcaption className="text-xs text-muted">
          © <bdi>{image.attribution}</bdi>
        </figcaption>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(92vw,40rem)] rounded-lg p-0 shadow-xl backdrop:bg-black/50"
        dir={dir}
        onClose={() => setOpen(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(null);
        }}
      >
        {current !== null && (
          <div className="flex flex-col gap-4 p-5">
            <h2 id={titleId} className="text-lg font-semibold">
              {String(current.n)}. {current.title}
            </h2>
            {/* Le gros plan : le rectangle `closeup` servi par l'API, découpé dans la
                conversion `zoom`. Aucun recadrage décidé ici. */}
            <div className="relative w-full overflow-hidden rounded bg-[#f5f5f2]" style={{ aspectRatio: '1 / 1' }}>
              <img
                src={image.image.zoom.url}
                alt=""
                className="absolute max-w-none"
                style={{
                  width: `${(image.image.w / current.closeup[2]) * 100}%`,
                  left: `${(-current.closeup[0] / current.closeup[2]) * 100}%`,
                  top: `${(-current.closeup[1] / current.closeup[3]) * 100}%`,
                }}
              />
            </div>
            <p className="text-sm">{current.description}</p>
            {current.components.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {current.components.map((c) => (
                  <li key={c.id} className="flex flex-wrap gap-x-2">
                    <span className="text-muted">{c.label}</span>
                    <bdi>{c.description_formatted}</bdi>
                    {c.size_label !== null && <span className="text-muted">({c.size_label})</span>}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="self-end rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={() => setOpen(null)}
            >
              {copy.closeLabel}
            </button>
          </div>
        )}
      </dialog>
    </figure>
  );
}
