'use client';

import Image from 'next/image';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { Locale } from '@/lib/api';
import type { PilotBike, PilotCopy, PilotPoint } from '@/lib/hotspot-pilot';
import { sizeCatalogue, type Media } from '@/lib/images';
import styles from './AnnotatedPhoto.module.css';
import { latinRuns } from './bidi';
import { leaderPath, type Pt } from './leader';

/** Ce que la route d'aperçu transmet à la composition : le vélo pilote, sa langue, ses textes, ses polices. */
export interface AnnotatedConfig {
  bike: PilotBike;
  locale: Locale;
  copy: PilotCopy;
  fontClassName: string;
}

/*
 * Scène : 100 unités de large ; la photo occupe x ∈ [PHOTO_LEFT, PHOTO_LEFT + PHOTO_WIDTH] avec une
 * marge MARGIN_Y en haut et en bas. Les photos du catalogue touchent presque les bords : les notes
 * vivent dans ces marges, jamais sur le vélo. Géométrie de MISE EN PAGE, pas une règle métier.
 */
const PHOTO_LEFT = 24;
const PHOTO_WIDTH = 52;
const MARGIN_Y = 10;

/** La ligne principale ne se coupe qu'au « · » : « 80 / 100 mm » ou « 11 سرعة » restent d'un seul tenant. */
const SEPARATOR = ' · ';

/**
 * Portée tactile de chaque point : la distance à son voisin le plus proche, en % de la largeur de la photo (le CSS en fait
 * des px). La cible est un disque de diamètre min(44 px, portée) : deux cibles ne se recouvrent jamais, un toucher va
 * toujours au point le plus proche, et les ancres ne bougent pas (relecture du 10 octobre 2026 — à 390 px, des cibles
 * carrées de 44 px se recouvraient et le point suivant dans le DOM prenait le toucher). Géométrie de MISE EN PAGE.
 */
function reaches(points: PilotPoint[], ratio: number): number[] {
  return points.map((p) =>
    points.reduce((nearest, q) => (q === p ? nearest : Math.min(nearest, Math.hypot(p.dot.x - q.dot.x, (p.dot.y - q.dot.y) * ratio))), 100),
  );
}

/** En arabe, chaque nom latin passe par <bdi> : sans lui, un signe final (« E500+ ») s'affiche du mauvais côté. */
function isolateLatin(text: string): ReactNode[] {
  return latinRuns(text).map((run, i) => (run.latin ? <bdi key={i}>{run.text}</bdi> : run.text));
}

/**
 * Photo annotée du pilote de hotspots éditoriaux (web #49, étape 1 — décisions du fondateur du
 * 10 octobre 2026). La VRAIE photo n'est ni recadrée, ni redessinée, ni retournée en arabe (scène
 * `dir="ltr"`) ; autour d'elle, des notes à l'esprit dessiné à la main : ligne principale manuscrite
 * soulignée de `--hotspot-accent`, nom de la pièce dessous, trait de rappel vers le point.
 *
 * Sous 900 px de conteneur : points seuls sur la photo, une seule explication sous elle (fermeture,
 * Échap, retour du focus au point). Fond clair et encre fixes dans les deux thèmes. Image en erreur :
 * aucun point, une alerte.
 */
export function AnnotatedPhoto({ image, config }: { image: Media; config: AnnotatedConfig }) {
  const { bike, locale, copy, fontClassName } = config;
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState(true);
  const [failed, setFailed] = useState(false);
  const dots = useRef(new Map<string, HTMLButtonElement>());
  const detailId = useId();

  const detail = image.sizes.detail;
  const reach = reaches(bike.points, detail.h / detail.w);
  const photoHeight = (PHOTO_WIDTH * detail.h) / detail.w;
  const sceneHeight = 2 * MARGIN_Y + photoHeight;
  const arabic = locale.startsWith('ar');
  const dir = arabic ? 'rtl' : 'ltr';
  const lang = arabic ? 'ar' : 'en';
  const text = (value: string) => (arabic ? isolateLatin(value) : value);
  const mainLine = (value: string) =>
    value.split(SEPARATOR).map((segment, i) => (
      <span key={i}>
        {i > 0 && SEPARATOR}
        <span className={styles.segment} data-segment>
          {text(segment)}
        </span>
      </span>
    ));

  const onScene = (p: PilotPoint): Pt => ({
    x: PHOTO_LEFT + (PHOTO_WIDTH * p.dot.x) / 100,
    y: MARGIN_Y + (photoHeight * p.dot.y) / 100,
  });
  const anchor = (p: PilotPoint): Pt => ({ x: p.label.x, y: (sceneHeight * p.label.y) / 100 });

  const current = bike.points.find((p) => p.id === selected) ?? null;
  const close = () => {
    if (!selected) return;
    const id = selected;
    setSelected(null);
    dots.current.get(id)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && selected) {
      event.preventDefault();
      close();
    }
  };

  const geometry = {
    '--scene-ratio': `100 / ${sceneHeight}`,
    '--photo-left': `${PHOTO_LEFT}%`,
    '--photo-top': `${(MARGIN_Y / sceneHeight) * 100}%`,
    '--photo-width': `${PHOTO_WIDTH}%`,
    '--photo-share': PHOTO_WIDTH / 100,
  } as CSSProperties;

  return (
    <div data-annotated={bike.key} className={`${styles.scene} ${fontClassName}`} dir="ltr" onKeyDown={onKeyDown}>
      <div className={styles.toolbar} dir={dir} lang={lang}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={shown}
            onChange={(event) => {
              setShown(event.target.checked);
              setSelected(null);
              // Les points quittent le DOM : un point qui avait le focus le perdrait sur <body> (Safari ne donne pas le
              // focus à une case cochée au clic). Il reste sur la case (relecture du 10 octobre 2026).
              if (!event.target.checked) event.target.focus();
            }}
          />
          {copy.toggle}
        </label>
      </div>

      <div className={styles.stage} style={geometry}>
        <div className={styles.photo}>
          <Image
            src={sizeCatalogue(image)}
            alt={image.alt}
            width={detail.w}
            height={detail.h}
            className={styles.img}
            priority
            onError={() => setFailed(true)}
          />
          {!failed &&
            shown &&
            bike.points.map((p, i) => (
              <button
                key={p.id}
                ref={(el) => {
                  if (el) dots.current.set(p.id, el);
                  else dots.current.delete(p.id);
                }}
                type="button"
                data-dot
                className={styles.dot}
                style={{ '--x': p.dot.x, '--y': p.dot.y, '--reach': reach[i] } as CSSProperties}
                aria-pressed={p.id === selected}
                aria-controls={detailId}
                aria-label={`${copy.point} ${i + 1} : ${p.part[locale]} — ${p.main[locale]}`}
                onClick={() => setSelected(p.id === selected ? null : p.id)}
              >
                <span aria-hidden="true">{i + 1}</span>
              </button>
            ))}
        </div>

        {failed ? (
          <p role="alert" className={styles.alert} dir={dir} lang={lang}>
            {copy.unavailable}
          </p>
        ) : (
          shown && (
            <>
              <svg className={styles.leaders} viewBox={`0 0 100 ${sceneHeight}`} aria-hidden="true">
                {bike.points.map((p) => (
                  <path
                    key={p.id}
                    data-leader
                    d={leaderPath(anchor(p), onScene(p))}
                    className={p.id === selected ? styles.leaderActive : styles.leader}
                  />
                ))}
              </svg>
              {bike.points.map((p) => (
                <div
                  key={p.id}
                  data-note
                  data-active={p.id === selected ? '' : undefined}
                  className={`${styles.note} ${styles[p.label.align]}`}
                  style={{ left: `${p.label.x}%`, top: `${p.label.y}%` }}
                  // Conteneur en ltr : l'alignement contre le trait est PHYSIQUE (une note à gauche du vélo
                  // s'aligne à droite), quel que soit le sens de lecture ; seuls les textes portent la langue.
                  dir="ltr"
                >
                  <span data-main className={styles.main} dir={dir} lang={lang}>
                    {mainLine(p.main[locale])}
                  </span>
                  <span className={styles.part} dir={dir} lang={lang}>
                    {text(p.part[locale])}
                  </span>
                </div>
              ))}
            </>
          )
        )}
      </div>

      {/*
        Toutes les explications occupent la même cellule et seule la choisie est visible : la zone prend la hauteur de la
        plus longue à CETTE largeur, et choisir un point ne déplace jamais la page (relecture du 10 octobre 2026 — une
        hauteur réservée en px ne tenait ni à 320 px ni en anglais). Les autres sont `inert` : ni lues, ni atteignables.
      */}
      <div id={detailId} className={styles.detailArea} dir={dir} lang={lang}>
        {!failed && (
          <>
            <p className={`${styles.hint} ${shown && !current ? '' : styles.reserve}`} inert={!shown || current !== null}>
              {copy.hint}
            </p>
            {bike.points.map((p) => (
              <div
                key={p.id}
                data-detail={p === current ? '' : undefined}
                className={`${styles.detail} ${p === current ? '' : styles.reserve}`}
                inert={p !== current}
              >
                <p className={styles.detailMain}>{mainLine(p.main[locale])}</p>
                <p className={styles.part}>{text(p.part[locale])}</p>
                <p className={styles.detailNote}>{text(p.note[locale])}</p>
                <button type="button" className={styles.close} aria-label={copy.close} onClick={close}>
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <p role="status" aria-live="polite" className={styles.srOnly} lang={lang}>
        {current ? `${current.part[locale]} — ${current.main[locale]}` : ''}
      </p>
    </div>
  );
}
