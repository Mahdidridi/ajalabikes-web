'use client';

import { useCallback, useEffect, useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  fill, GeometryFigure, SeriesMark, type GeometryFigureLabels,
} from '@/components/GeometryFigure';
import type { CompareRow, CompareSection, GeometryGlossary } from '@/lib/api';

/**
 * La planche de géométrie du comparateur : cadres superposés, puis la matrice
 * des cotes, l'explication ouverte en place sous la ligne qui la demande.
 *
 * Tout ce qui est mesure vient de l'API — valeur, écart signé, ratio, anomalie,
 * texte du glossaire. Ce composant ne calcule rien (règle 3) ; il choisit quoi
 * montrer et où.
 *
 * Décision du 18 septembre 2026 : l'explication s'ouvre SOUS la ligne, sans
 * changer l'URL ni ouvrir de couche par-dessus la page, et le glossaire est
 * rendu dans le HTML initial — ouvrir une définition ne déclenche aucune requête.
 *
 * Décision du 18 septembre 2026, seconde passe : **la planche se manipule là où
 * on la lit.** La taille se choisit dans l'en-tête du bloc, sous les yeux du
 * dessin, et non plus seulement dans la carte en haut de page ; survoler ou
 * focaliser une cote la trace sur le schéma et affiche sa valeur vélo par vélo
 * sous la figure ; un clic la maintient. Le changement de taille reste une
 * navigation d'URL — l'état du comparateur vit dans l'URL (règle 4) — mais sans
 * rechargement ni saut de page, et le bloc reste lisible pendant le calcul.
 */

export type GeometryBlockLabels = GeometryFigureLabels & {
  /** Bouton d'explication : « Explain {label} ». */
  explain: string;
  /** Bouton de surlignage : « Highlight {label} on the drawing ». */
  highlight: string;
  /** Sélecteur de taille de l'en-tête : « Size for {label} ». */
  size: string;
  /** Cellule sans valeur : la marque ne l'a pas publiée. */
  notPublished: string;
  /** Valeur publiée mais incohérente : montrée brute, jamais comparée. */
  doubtful: string;
  /** Intitulés du panneau d'explication. */
  effect: string;
  caveat: string;
  sourceLabels: string;
  related: string;
};

type Bike = {
  name: string;
  size: string | null;
  /** Chaque option porte son URL complète, construite par le serveur. */
  sizeOptions: { label: string; href: string }[];
};

export function GeometryBlock({ section, bikes, glossary, labels }: {
  section: CompareSection;
  bikes: Bike[];
  glossary: GeometryGlossary | null;
  labels: GeometryBlockLabels;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  // Deux états distincts : survoler donne un aperçu, cliquer le maintient —
  // sinon la cote disparaîtrait dès que la souris quitte la ligne.
  const [maintenue, setMaintenue] = useState<string | null>(null);
  const [survolee, setSurvolee] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const active = survolee ?? maintenue;

  // Échap efface la cote active : l'utilisateur reprend la lecture du tableau.
  const surEchap = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    setMaintenue(null);
    setSurvolee(null);
    setOuverte(null);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', surEchap);

    return () => document.removeEventListener('keydown', surEchap);
  }, [surEchap]);

  const entries = new Map((glossary?.items ?? []).map((item) => [item.key, item]));
  const measureLabels = Object.fromEntries(section.rows.map((row) => [row.key, row.label]));
  const libelle = (key: string) => measureLabels[key] ?? key;
  // Le titre garde un identifiant STABLE : la section est unique sur la page et
  // sert d'ancre (`#geometry-heading`). Les panneaux, eux, se répètent : leur
  // identifiant est généré, pour ne jamais se dupliquer.
  const panneauId = useId();

  const ligneActive: CompareRow | null = active
    ? section.rows.find((row) => row.key === active) ?? null
    : null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="geometry-heading">
      <h2 id="geometry-heading" className="text-lg font-bold">{section.label}</h2>

      {section.requires_sizes && section.hint && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
          {section.hint}
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {section.figure !== null && (
        <div
          className={`sticky top-0 z-20 rounded-xl border border-border bg-surface p-3 transition-opacity sm:p-4 lg:w-[42%] lg:shrink-0 ${
            enCours ? 'opacity-60' : ''
          }`}
          aria-busy={enCours}
        >
          <GeometryFigure
            figure={section.figure}
            bikes={bikes}
            activeMark={active}
            activeLabel={active ? libelle(active) : null}
            labels={labels}
            measureLabels={measureLabels}
          />

          {/* La cote lue sous le dessin, vélo par vélo : c'est ce qui relie le
              trait surligné au nombre, sans quitter la figure des yeux. */}
          {ligneActive !== null && (
            <dl
              className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs"
              aria-live="polite"
            >
              <dt className="font-semibold">{ligneActive.label}</dt>
              {bikes.map((bike, i) => {
                const cellule = ligneActive.cells[i] ?? null;

                return (
                  <dd key={i} className="ms-0 flex items-center gap-2">
                    <SeriesMark index={i} />
                    <bdi className="font-mono text-muted">
                      {[bike.name, bike.size].filter(Boolean).join(' · ')}
                    </bdi>
                    {cellule === null ? (
                      <span className="italic text-muted">{labels.notPublished}</span>
                    ) : (
                      <>
                        <bdi className="font-mono font-medium">{cellule.formatted}</bdi>
                        {cellule.delta_formatted !== null && cellule.anomaly === null && (
                          <bdi className="font-mono text-muted">{cellule.delta_formatted}</bdi>
                        )}
                      </>
                    )}
                  </dd>
                );
              })}
            </dl>
          )}
        </div>
      )}

      <div className="overflow-x-auto lg:min-w-0 lg:flex-1">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-28 sm:w-48" />
            {bikes.map((_, i) => <col key={i} className="w-32 sm:w-auto" />)}
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky start-0 z-10 bg-background pb-2 text-start text-xs font-normal text-muted"
              >
                {section.label}
              </th>
              {bikes.map((bike, i) => (
                <th key={i} scope="col" className="px-2 pb-2 text-start align-bottom font-normal">
                  <span className="flex items-center gap-2 text-xs">
                    <SeriesMark index={i} />
                    <bdi className="font-medium">{bike.name}</bdi>
                  </span>
                  {/* La taille se choisit ICI, sous les yeux du dessin. La
                      navigation garde l'URL partageable et ne fait pas sauter
                      la page ; le bloc s'estompe le temps du calcul. */}
                  {bike.sizeOptions.length > 0 && (
                    <select
                      aria-label={fill(labels.size, { label: bike.name })}
                      value={bike.size ?? ''}
                      disabled={enCours}
                      onChange={(event) => {
                        const choix = bike.sizeOptions.find((o) => o.label === event.target.value);
                        if (choix) demarrer(() => router.push(choix.href, { scroll: false }));
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    >
                      <option value="" disabled>{labels.size}</option>
                      {bike.sizeOptions.map((o) => (
                        <option key={o.label} value={o.label}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => {
              const entry = entries.get(row.key);
              const estActive = active === row.key;

              return [
                <tr
                  key={row.key}
                  className={`border-t border-border ${estActive ? 'bg-surface' : ''}`}
                  onMouseEnter={() => setSurvolee(row.key)}
                  onMouseLeave={() => setSurvolee(null)}
                >
                  {/* La colonne des libellés reste lisible à 400 px pendant que
                      les valeurs défilent : c'est elle qui donne le contexte. */}
                  <th
                    scope="row"
                    className={`sticky start-0 z-10 py-2 pe-2 text-start align-top text-xs font-medium ${
                      estActive ? 'bg-surface' : 'bg-background'
                    }`}
                  >
                    <span className="flex items-start gap-1">
                      <button
                        type="button"
                        aria-pressed={maintenue === row.key}
                        aria-label={fill(labels.highlight, { label: row.label })}
                        onFocus={() => setSurvolee(row.key)}
                        onBlur={() => setSurvolee(null)}
                        onClick={() => setMaintenue(maintenue === row.key ? null : row.key)}
                        className={`text-start underline-offset-2 transition hover:underline ${
                          estActive ? 'font-semibold text-foreground' : 'text-muted'
                        }`}
                      >
                        {row.label}
                      </button>
                      {entry !== undefined && (
                        <button
                          type="button"
                          aria-expanded={ouverte === row.key}
                          aria-controls={`${panneauId}-${row.key}`}
                          aria-label={fill(labels.explain, { label: row.label })}
                          onClick={() => {
                            setOuverte(ouverte === row.key ? null : row.key);
                            setMaintenue(row.key);
                          }}
                          className="rounded-full border border-border px-1.5 text-[0.65rem] leading-4 text-muted transition hover:border-foreground hover:text-foreground"
                        >
                          ?
                        </button>
                      )}
                    </span>
                  </th>

                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-2 py-2 align-top tabular-nums">
                      {cell === null ? (
                        <span className="text-xs italic text-muted">{labels.notPublished}</span>
                      ) : (
                        <>
                          <bdi className="font-mono">{cell.formatted}</bdi>
                          {/* Le bloc suit la direction de la PAGE — sinon un
                              contenu purement latin (« 60.9 cm ») se résout en
                              LTR et s'aligne hors de sa colonne en arabe — et
                              `<bdi>` isole le contenu à l'intérieur, pour que le
                              signe ne saute pas de côté. L'écart n'est ni un gain
                              ni une perte : pas de couleur, pas de flèche. */}
                          {cell.delta_formatted !== null && cell.anomaly === null && (
                            <span className="mt-0.5 block font-mono text-xs text-muted">
                              <bdi>{cell.delta_formatted}</bdi>
                            </span>
                          )}
                          {cell.anomaly !== null && (
                            <span className="mt-0.5 block text-xs italic text-muted">
                              {labels.doubtful}
                            </span>
                          )}
                          {cell.original !== null && (
                            <span className="mt-0.5 block text-xs text-muted">
                              <bdi>{cell.original}</bdi>
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  ))}
                </tr>,

                ouverte === row.key && entry !== undefined ? (
                  <tr key={`${row.key}-explication`} className="border-t border-border/60">
                    <td
                      id={`${panneauId}-${row.key}`}
                      colSpan={bikes.length + 1}
                      className="bg-surface px-3 py-3 text-sm"
                    >
                      <p>{entry.definition}</p>
                      <p className="mt-2">
                        <span className="font-semibold">{labels.effect} </span>
                        {entry.effect}
                      </p>
                      {entry.caveat !== null && (
                        <p className="mt-2 text-muted">
                          <span className="font-semibold">{labels.caveat} </span>
                          {entry.caveat}
                        </p>
                      )}
                      {row.labels_original.some((label) => label !== null) && (
                        <p className="mt-2 text-xs text-muted">
                          <span className="font-semibold">{labels.sourceLabels} </span>
                          {row.labels_original
                            .map((label, i) => (label === null ? null : (
                              <bdi key={i} className="me-2 font-mono">{label}</bdi>
                            )))}
                        </p>
                      )}
                      {/* Une cote liée que le filtre « différences seules » a
                          retirée du tableau n'a pas de ligne à ouvrir : elle ne
                          devient pas un lien mort. */}
                      {entry.related.filter((key) => key in measureLabels).length > 0 && (
                        <p className="mt-2 text-xs text-muted">
                          <span className="font-semibold">{labels.related} </span>
                          {entry.related
                            .filter((key) => key in measureLabels)
                            .map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => { setOuverte(key); setMaintenue(key); }}
                                className="me-2 underline underline-offset-2 transition hover:text-foreground"
                              >
                                {libelle(key)}
                              </button>
                            ))}
                        </p>
                      )}
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  );
}
