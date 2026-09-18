'use client';

import { useCallback, useEffect, useState } from 'react';
import { fill, GeometryFigure, type GeometryFigureLabels } from '@/components/GeometryFigure';
import type { CompareSection, GeometryGlossary } from '@/lib/api';

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
 */

export type GeometryBlockLabels = GeometryFigureLabels & {
  /** Bouton d'explication : « Explain {label} ». */
  explain: string;
  /** Bouton de surlignage : « Highlight {label} on the drawing ». */
  highlight: string;
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

type Bike = { name: string; size: string | null };

export function GeometryBlock({ section, bikes, glossary, labels }: {
  section: CompareSection;
  bikes: Bike[];
  glossary: GeometryGlossary | null;
  labels: GeometryBlockLabels;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  // Échap efface la cote active : l'utilisateur reprend la lecture du tableau.
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    setActive(null);
    setOpen(null);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  const entries = new Map((glossary?.items ?? []).map((item) => [item.key, item]));
  const libelle = (key: string) => section.rows.find((row) => row.key === key)?.label ?? key;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="geometry-heading">
      <h2 id="geometry-heading" className="text-lg font-bold">{section.label}</h2>

      {section.requires_sizes && section.hint && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
          {section.hint}
        </p>
      )}

      {section.figure !== null && (
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
          <GeometryFigure
            figure={section.figure}
            bikes={bikes}
            activeMark={active}
            activeLabel={active ? libelle(active) : null}
            labels={labels}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-28 sm:w-48" />
            {bikes.map((_, i) => <col key={i} className="w-32 sm:w-auto" />)}
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th scope="col">{section.label}</th>
              {bikes.map((bike, i) => (
                <th key={i} scope="col">{[bike.name, bike.size].filter(Boolean).join(' · ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => {
              const entry = entries.get(row.key);
              const estActive = active === row.key;

              return [
                <tr key={row.key} className="border-t border-border">
                  {/* La colonne des libellés reste lisible à 400 px pendant que
                      les valeurs défilent : c'est elle qui donne le contexte. */}
                  <th
                    scope="row"
                    className="sticky start-0 z-10 bg-background py-2 pe-2 text-start align-top text-xs font-medium"
                  >
                    <span className="flex items-start gap-1">
                      <button
                        type="button"
                        aria-pressed={estActive}
                        aria-label={fill(labels.highlight, { label: row.label })}
                        onClick={() => setActive(estActive ? null : row.key)}
                        className={`text-start underline-offset-2 transition hover:underline ${
                          estActive ? 'font-semibold text-foreground' : 'text-muted'
                        }`}
                      >
                        {row.label}
                      </button>
                      {entry !== undefined && (
                        <button
                          type="button"
                          aria-expanded={open === row.key}
                          aria-label={fill(labels.explain, { label: row.label })}
                          onClick={() => {
                            setOpen(open === row.key ? null : row.key);
                            setActive(row.key);
                          }}
                          className="rounded-full border border-border px-1.5 text-[0.65rem] leading-4 text-muted transition hover:border-foreground hover:text-foreground"
                        >
                          ?
                        </button>
                      )}
                    </span>
                  </th>

                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-2 py-2 align-top tabular-nums ${estActive ? 'bg-surface' : ''}`}
                    >
                      {cell === null ? (
                        <span className="text-xs italic text-muted">{labels.notPublished}</span>
                      ) : (
                        <>
                          <bdi className="font-mono">{cell.formatted}</bdi>
                          {/* L'écart n'est ni un gain ni une perte : pas de
                              couleur, pas de flèche, pas de qualificatif. */}
                          {/* Le bloc suit la direction de la PAGE — sinon un
                              contenu purement latin (« 60.9 cm ») se résout en
                              LTR et s'aligne hors de sa colonne en arabe — et
                              `<bdi>` isole le contenu à l'intérieur, pour que le
                              signe ne saute pas de côté (18 septembre 2026). */}
                          {cell.delta_formatted !== null && (
                            <span className="mt-0.5 block font-mono text-xs text-muted">
                              <bdi>{cell.delta_formatted}</bdi>
                            </span>
                          )}
                          {cell.anomaly !== null && (
                            <span className="mt-0.5 block text-xs italic text-muted">
                              {labels.doubtful}
                            </span>
                          )}
                          {cell.original !== null && cell.original !== cell.formatted && (
                            <span className="mt-0.5 block text-xs text-muted">
                              <bdi>{cell.original}</bdi>
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  ))}
                </tr>,

                open === row.key && entry !== undefined ? (
                  <tr key={`${row.key}-explication`} className="border-t border-border/60">
                    <td colSpan={bikes.length + 1} className="bg-surface px-3 py-3 text-sm">
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
                      {entry.related.length > 0 && (
                        <p className="mt-2 text-xs text-muted">
                          <span className="font-semibold">{labels.related} </span>
                          {entry.related.map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => { setOpen(key); setActive(key); }}
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
    </section>
  );
}
