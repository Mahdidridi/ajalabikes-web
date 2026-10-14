/** @jsxImportSource react */
'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { fill, GeometryFigure, type GeometryFigureLabels } from '@/components/GeometryFigure';
import { GeometryGlossaryPanel } from '@/components/GeometryGlossaryPanel';
import type { BuildSize, GeometryGlossary } from '@/lib/api';
import { headRows, matrixRows, singleBikeFigure, type MatrixMode } from '@/lib/geometry-matrix';

export type GeometryMatrixLabels = GeometryFigureLabels & {
  dash: string;
  explain: string;
  highlight: string;
  doubtful: string;
  effect: string;
  caveat: string;
  sourceLabels: string;
  related: string;
  /** En-tête de la colonne des cotes. */
  measure: string;
  /** Les deux positions de la bascule : la valeur normalisée, la valeur telle que publiée. */
  value: string;
  source: string;
  /** Lignes de tête. */
  wheels: string;
  height: string;
  inseam: string;
};

/**
 * La géométrie de la fiche — décision du fondateur du 14 octobre 2026 (web #66, qui remplace web #29).
 *
 * À gauche, le dessin du cadre de la taille choisie ; à droite, le tableau de TOUTES les tailles, la colonne de la taille
 * choisie surlignée. Le dessin est à gauche en arabe comme en anglais (un cadre n'est jamais retourné en miroir : `dir="ltr"`
 * reste posé sur le dessin seul, dans `GeometryFigure`), et il passe au-dessus du tableau quand la ligne se replie — sur
 * téléphone, ou sur une fiche non annotée à 896 px. Le repère positionnel A, B, C du tableau d'avant a disparu : il ne
 * renvoyait à aucun dessin ; c'est le SURLIGNAGE qui relie une ligne à sa cote (survol, focus, clic qui la maintient, Échap
 * qui efface — les gestes du comparateur). Un bouton « ? » par cote connue du glossaire ouvre l'explication sous la ligne.
 * Une bascule montre la valeur normalisée ou la valeur telle que publiée ; une valeur douteuse (anomalie) n'est jamais
 * normalisée. Une taille non dessinable garde son tableau, avec le message du comparateur et aucun SVG.
 *
 * Toutes les tailles arrivent dans la réponse initiale : changer de taille ne déclenche aucun appel réseau. RIEN N'EST
 * CALCULÉ ICI : le dessin, les repères, les valeurs, les libellés et les explications viennent de l'API (`geometry-matrix.ts`
 * ne fait que changer de forme). Le seul JavaScript est l'état de l'interface : taille, bascule, cote active, explication
 * ouverte.
 *
 * Un bouton de taille ne dépasse jamais la largeur de sa rangée et son nom s'y coupe (règle du 11 octobre 2026 : Scott nomme
 * des tailles « L_HIGH_BB_SETTING_POSITION_DE_BOITIER_HAUTE »).
 */
export function GeometryMatrix({
  sizes,
  bikeName,
  glossary,
  labels,
}: {
  sizes: readonly BuildSize[];
  bikeName: string;
  glossary: GeometryGlossary | null;
  labels: GeometryMatrixLabels;
}) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<MatrixMode>('value');
  // Deux états distincts : survoler donne un aperçu, cliquer le maintient (comme sur le comparateur).
  const [maintenue, setMaintenue] = useState<string | null>(null);
  const [survolee, setSurvolee] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const active = survolee ?? maintenue;
  const panneauId = useId();

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

  if (sizes.length === 0) return null;

  const choisie = Math.min(index, sizes.length - 1);
  const size = sizes[choisie];
  const figure = singleBikeFigure(size.figure);
  const tete = headRows(sizes, { wheels: labels.wheels, height: labels.height, inseam: labels.inseam });
  const cotes = matrixRows(sizes, mode);
  const lignes = [...tete, ...cotes];
  const entries = new Map((glossary?.items ?? []).map((item) => [item.key, item]));
  // Seule une cote que le dessin de la taille choisie sait repérer se surligne.
  const reperables = new Set(Object.keys(size.figure.marks));
  const measureLabels = Object.fromEntries(lignes.map((row) => [row.key, row.label]));
  const libelle = (key: string) => measureLabels[key] ?? key;
  const colonnes = sizes.length + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {sizes.map((s, i) => (
          <button
            key={s.label}
            type="button"
            aria-pressed={i === choisie}
            onClick={() => setIndex(i)}
            className="max-w-full border border-neutral-300 px-4 py-2 text-sm leading-tight transition-colors aria-pressed:border-emerald-700 aria-pressed:bg-emerald-700 aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-neutral-700 dark:aria-pressed:border-emerald-500 dark:aria-pressed:bg-emerald-600"
          >
            <span className="block font-mono font-semibold wrap-break-word">{s.label}</span>
            {s.label_alt && <span className="block font-mono text-xs wrap-break-word">{s.label_alt}</span>}
          </button>
        ))}
      </div>

      {/* Le dessin d'abord dans le flux : à gauche sur une ligne (`rtl:flex-row-reverse` le garde à gauche en arabe),
          au-dessus quand la ligne se replie. */}
      <div className="flex flex-wrap items-start gap-6 rtl:flex-row-reverse">
        <div className="w-full rounded-xl border border-border bg-surface p-3 sm:p-4 lg:w-[40%] lg:shrink-0">
          <GeometryFigure
            figure={figure}
            bikes={[{ name: bikeName, size: size.label }]}
            activeMark={active}
            activeLabel={active ? libelle(active) : null}
            labels={labels}
            measureLabels={measureLabels}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {/* La colonne des cotes reste visible pendant que les tailles défilent : c'est elle qui donne le sens. */}
                  <th scope="col" className="sticky start-0 z-10 min-w-32 bg-background p-2 text-start text-xs font-normal text-muted">
                    {labels.measure}
                  </th>
                  {/* Une valeur tient sur une ligne : le tableau défile dans sa boîte, la page ne s'élargit pas. */}
                  {sizes.map((s, i) => (
                    <th
                      key={s.label}
                      scope="col"
                      {...(i === choisie && { 'data-selected': '' })}
                      className={`p-2 text-center font-mono text-xs font-semibold whitespace-nowrap ${i === choisie ? 'bg-surface' : 'text-muted'}`}
                    >
                      <bdi>{s.label}</bdi>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((row) => {
                  const entry = entries.get(row.key);
                  const reperable = reperables.has(row.key);
                  const estActive = active === row.key;

                  return [
                    <tr
                      key={row.key}
                      data-row={row.key}
                      className={`border-t border-border ${estActive ? 'bg-surface' : ''}`}
                      {...(reperable && {
                        onMouseEnter: () => setSurvolee(row.key),
                        onMouseLeave: () => setSurvolee(null),
                      })}
                    >
                      <th
                        scope="row"
                        className={`sticky start-0 z-10 min-w-32 p-2 pe-3 text-start align-top text-xs font-medium ${
                          estActive ? 'bg-surface' : 'bg-background'
                        }`}
                      >
                        <span className="flex items-start gap-1">
                          {reperable ? (
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
                          ) : (
                            <span className="text-muted">{row.label}</span>
                          )}
                          {entry !== undefined && (
                            <button
                              type="button"
                              aria-expanded={ouverte === row.key}
                              aria-controls={`${panneauId}-${row.key}`}
                              aria-label={fill(labels.explain, { label: row.label })}
                              onClick={() => {
                                setOuverte(ouverte === row.key ? null : row.key);
                                if (reperable) setMaintenue(row.key);
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
                          {...(i === choisie && { 'data-selected': '' })}
                          className={`p-2 text-center align-top font-mono tabular-nums whitespace-nowrap ${i === choisie ? 'bg-surface font-semibold' : ''}`}
                        >
                          {cell === null ? (
                            <span className="text-muted">{labels.dash}</span>
                          ) : (
                            <>
                              <bdi>{cell.formatted}</bdi>
                              {cell.doubtful && (
                                <span className="mt-0.5 block font-sans text-xs italic text-muted">{labels.doubtful}</span>
                              )}
                            </>
                          )}
                        </td>
                      ))}
                    </tr>,

                    ouverte === row.key && entry !== undefined ? (
                      <tr key={`${row.key}-explication`} className="border-t border-border/60">
                        <td id={`${panneauId}-${row.key}`} colSpan={colonnes} className="bg-surface px-3 py-3 text-start text-sm">
                          <GeometryGlossaryPanel
                            entry={entry}
                            labels={labels}
                            related={entry.related
                              .filter((key) => key in measureLabels)
                              .map((key) => ({
                                key,
                                label: libelle(key),
                                open: () => {
                                  setOuverte(key);
                                  if (reperables.has(key)) setMaintenue(key);
                                },
                              }))}
                          />
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            {/* La bascule : la valeur normalisée par Laravel, ou la valeur telle que la marque l'a publiée. */}
            <div className="inline-flex overflow-hidden rounded-full border border-border text-xs">
              <button
                type="button"
                aria-pressed={mode === 'value'}
                onClick={() => setMode('value')}
                className="px-3 py-1 text-muted transition aria-pressed:bg-foreground aria-pressed:text-background"
              >
                {labels.value}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'published'}
                onClick={() => setMode('published')}
                className="px-3 py-1 text-muted transition aria-pressed:bg-foreground aria-pressed:text-background"
              >
                {labels.source}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
