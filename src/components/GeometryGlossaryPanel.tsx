/** @jsxImportSource react */
import type { GeometryGlossaryItem } from '@/lib/api';

export type GlossaryPanelLabels = { effect: string; caveat: string; sourceLabels: string; related: string };
export type RelatedMeasure = { key: string; label: string; open: () => void };

/**
 * L'explication d'une cote, ouverte sous sa ligne — décision du 18 septembre 2026 sur le comparateur, reprise sur la fiche
 * le 14 octobre 2026 (web #66). Définition, effet, réserve, libellés du constructeur, cotes liées : les textes du glossaire
 * servi par l'API (api #41), jamais réécrits ni réinterprétés. Une cote liée absente du tableau n'est pas proposée — jamais
 * un lien mort. Le composant est pur : la ligne qui l'héberge décide d'ouvrir, de fermer et de surligner.
 */
export function GeometryGlossaryPanel({
  entry,
  labels,
  sourceLabels = [],
  related,
}: {
  entry: GeometryGlossaryItem;
  labels: GlossaryPanelLabels;
  /** Les libellés du constructeur, un par vélo (le comparateur) ; la fiche n'en a pas. */
  sourceLabels?: readonly (string | null)[];
  related: readonly RelatedMeasure[];
}) {
  return (
    <>
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
      {sourceLabels.some((label) => label !== null) && (
        <p className="mt-2 text-xs text-muted">
          <span className="font-semibold">{labels.sourceLabels} </span>
          {sourceLabels.map((label, i) => (label === null ? null : (
            <bdi key={i} className="me-2 font-mono">{label}</bdi>
          )))}
        </p>
      )}
      {related.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          <span className="font-semibold">{labels.related} </span>
          {related.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.open}
              className="me-2 underline underline-offset-2 transition hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </p>
      )}
    </>
  );
}
