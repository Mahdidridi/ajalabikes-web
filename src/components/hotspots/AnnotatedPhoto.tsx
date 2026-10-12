'use client';

import Image from 'next/image';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { HotspotImage, HotspotPoint, Locale } from '@/lib/api';
import { sizeCatalogue, type Media } from '@/lib/images';
import styles from './AnnotatedPhoto.module.css';
import { latinRuns } from './bidi';
import { leaderPath, type Pt } from './leader';
import { MARGIN_Y, PHOTO_LEFT, PHOTO_WIDTH } from './scene';

/** Textes d'interface de la composition, déjà traduits (règle des composants client : ils ne composent rien). */
export interface AnnotatedCopy {
  toggle: string;
  close: string;
  unavailable: string;
  hint: string;
}

/** Libellés d'un point, composés côté serveur dans l'ordre des points : nom accessible du bouton, annonce de la sélection. */
export interface AnnotatedLabel {
  dot: string;
  announce: string;
}

/** Ce que le serveur transmet à la composition (`annotation.tsx`) : tout est prêt à afficher. */
export interface AnnotatedProps {
  /** Nom de la composition, posé sur `data-annotated` : l'adresse du vélo, ou la clé du pilote sur l'aperçu. */
  name: string;
  image: Media;
  hotspots: HotspotImage;
  locale: Locale;
  copy: AnnotatedCopy;
  labels: AnnotatedLabel[];
  /** Les variables des polices manuscrites, et la police latine seule (`handLatinFace`, voir `.handArabic`). */
  fonts: { className: string; latinFace: string };
}

/** La ligne principale ne se coupe qu'au « · » : « 80 / 100 mm » ou « 11 سرعة » restent d'un seul tenant. */
const SEPARATOR = ' · ';

/**
 * Portée tactile de chaque point : la distance à son voisin le plus proche, en % de la largeur de la photo (le CSS en fait
 * des px). La cible est un disque de diamètre min(44 px, portée) : deux cibles ne se recouvrent jamais, un toucher va
 * toujours au point le plus proche, et les ancres ne bougent pas (relecture du 10 octobre 2026 — à 390 px, des cibles
 * carrées de 44 px se recouvraient et le point suivant dans le DOM prenait le toucher). Géométrie de MISE EN PAGE.
 */
function reaches(points: HotspotPoint[], ratio: number): number[] {
  return points.map((p) =>
    points.reduce((nearest, q) => (q === p ? nearest : Math.min(nearest, Math.hypot(p.dot.x - q.dot.x, (p.dot.y - q.dot.y) * ratio))), 100),
  );
}

/**
 * En arabe, chaque nom latin passe par <bdi> : sans lui, un signe final (« E500+ ») s'affiche du mauvais côté. Dans une
 * ligne manuscrite, le texte arabe passe aussi par une <span> (`arabicClass`) à la police manuscrite arabe : voir
 * `.handArabic` dans le module CSS.
 */
function isolateLatin(text: string, arabicClass?: string): ReactNode[] {
  return latinRuns(text).map((run, i) => {
    if (run.latin) return <bdi key={i}>{run.text}</bdi>;
    return arabicClass ? (
      <span key={i} className={arabicClass}>
        {run.text}
      </span>
    ) : (
      run.text
    );
  });
}

/**
 * Photo de tête annotée — notes dessinées à la main (pilote web #49, généralisé par web #52 : décisions du fondateur du
 * 10 au 12 octobre 2026). La VRAIE photo n'est ni recadrée, ni redessinée, ni retournée en arabe (scène `dir="ltr"`) ;
 * autour d'elle, des notes à l'esprit dessiné à la main : ligne principale manuscrite soulignée de `--hotspot-accent`, nom
 * de la pièce dessous, trait de rappel vers le point. Positions, numéros et textes viennent de l'API (`hotspot_image`) :
 * ce composant n'en calcule aucun. Sans nom de pièce servi (`main` nul), la ligne manuscrite porte le nom de la partie.
 *
 * Sous 900 px de conteneur : points seuls sur la photo, une seule explication sous elle (fermeture, Échap, retour du focus
 * au point). Fond clair et encre fixes dans les deux thèmes. Image en erreur : aucun point, une alerte.
 */
export function AnnotatedPhoto({ name, image, hotspots, locale, copy, labels, fonts }: AnnotatedProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState(true);
  const [failed, setFailed] = useState(false);
  const dots = useRef(new Map<string, HTMLButtonElement>());
  const detailId = useId();

  const { points } = hotspots;
  const detail = image.sizes.detail;
  // Le rapport de la photo SERVIE avec la scène : c'est sur lui que l'API a placé les notes.
  const ratio = hotspots.image.h / hotspots.image.w;
  const reach = reaches(points, ratio);
  const photoHeight = PHOTO_WIDTH * ratio;
  const sceneHeight = 2 * MARGIN_Y + photoHeight;
  const arabic = locale.startsWith('ar');
  const dir = arabic ? 'rtl' : 'ltr';
  const lang = arabic ? 'ar' : 'en';
  const text = (value: string) => (arabic ? isolateLatin(value) : value);
  const hand = (value: string) => (arabic ? isolateLatin(value, styles.handArabic) : value);
  const mainLine = (value: string) =>
    value.split(SEPARATOR).map((segment, i) => (
      <span key={i}>
        {i > 0 && SEPARATOR}
        <span className={styles.segment} data-segment>
          {hand(segment)}
        </span>
      </span>
    ));
  // Sans nom de pièce, la ligne manuscrite porte le nom de la partie, et rien dessous.
  const handwritten = (p: HotspotPoint) => p.main ?? p.part;
  const subtitle = (p: HotspotPoint) => (p.main === null ? null : p.part);

  const onScene = (p: HotspotPoint): Pt => ({
    x: PHOTO_LEFT + (PHOTO_WIDTH * p.dot.x) / 100,
    y: MARGIN_Y + (photoHeight * p.dot.y) / 100,
  });
  const anchor = (p: HotspotPoint): Pt => ({ x: p.label.x, y: (sceneHeight * p.label.y) / 100 });

  const currentIndex = points.findIndex((p) => p.id === selected);
  const current = currentIndex < 0 ? null : points[currentIndex];
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
    <div
      data-annotated={name}
      className={`${styles.scene} ${fonts.className}`}
      style={{ '--font-hand-latin-face': fonts.latinFace } as CSSProperties}
      dir="ltr"
      onKeyDown={onKeyDown}
    >
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
            points.map((p, i) => (
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
                aria-label={labels[i].dot}
                onClick={() => setSelected(p.id === selected ? null : p.id)}
              >
                <span aria-hidden="true">{p.n}</span>
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
                {points.map((p) => (
                  <path
                    key={p.id}
                    data-leader
                    d={leaderPath(anchor(p), onScene(p))}
                    className={p.id === selected ? styles.leaderActive : styles.leader}
                  />
                ))}
              </svg>
              {points.map((p) => {
                const part = subtitle(p);
                return (
                  <div
                    key={p.id}
                    data-note
                    data-active={p.id === selected ? '' : undefined}
                    className={`${styles.note} ${styles[p.label.side]}`}
                    style={{ left: `${p.label.x}%`, top: `${p.label.y}%` }}
                    // Conteneur en ltr : l'alignement contre le trait est PHYSIQUE (une note à gauche du vélo
                    // s'aligne à droite), quel que soit le sens de lecture ; seuls les textes portent la langue.
                    dir="ltr"
                  >
                    <span data-main className={styles.main} dir={dir} lang={lang}>
                      {mainLine(handwritten(p))}
                    </span>
                    {part !== null && (
                      <span className={styles.part} dir={dir} lang={lang}>
                        {text(part)}
                      </span>
                    )}
                  </div>
                );
              })}
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
            {points.map((p) => {
              const part = subtitle(p);
              return (
                <div
                  key={p.id}
                  data-detail={p === current ? '' : undefined}
                  className={`${styles.detail} ${p === current ? '' : styles.reserve}`}
                  inert={p !== current}
                >
                  <p className={styles.detailMain}>{mainLine(handwritten(p))}</p>
                  {part !== null && <p className={styles.part}>{text(part)}</p>}
                  <p className={styles.detailNote}>{text(p.note)}</p>
                  <button type="button" className={styles.close} aria-label={copy.close} onClick={close}>
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      <p role="status" aria-live="polite" className={styles.srOnly} lang={lang}>
        {current ? labels[currentIndex].announce : ''}
      </p>
    </div>
  );
}
