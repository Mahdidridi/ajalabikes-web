/** @jsxImportSource react */
import type { CompareSection } from '@/lib/api';

export function ComparisonSection({ section, columnCount, canAdd, dash }: {
  section: CompareSection;
  columnCount: number;
  canAdd: boolean;
  dash: string;
}) {
  return (
    <tbody>
      <tr>
        <th scope="rowgroup" colSpan={columnCount} className="pb-2 pt-6 text-start">
          <h2 className="text-lg font-bold">{section.label}</h2>
        </th>
      </tr>
      {section.requires_sizes && section.hint && (
        <tr>
          <td colSpan={columnCount}>
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
              {section.hint}
            </p>
          </td>
        </tr>
      )}
      {/* Une taille manquante ne masque pas les composants indépendants de la taille.
          L’API garde les lignes de géométrie vides tant que les tailles manquent. */}
      {section.rows.map((row) => (
        <tr key={row.key} className="border-t border-border">
          <th scope="row" className="py-2 pe-3 text-start align-top text-xs font-medium text-muted">
            {row.label}
          </th>
          {row.cells.map((cell, i) => (
            <td key={i} className={`whitespace-pre-line px-2 py-2 align-top tabular-nums ${row.status === 'differs' ? 'font-medium' : ''}`}>
              {cell === null ? <span className="text-muted">{dash}</span> : (
                <>
                  <bdi>{cell.formatted}</bdi>
                  {cell.original !== null && cell.original !== cell.formatted && (
                    <span className="ms-2 text-xs text-muted" dir="ltr">{cell.original}</span>
                  )}
                </>
              )}
            </td>
          ))}
          {canAdd && <td />}
        </tr>
      ))}
    </tbody>
  );
}
