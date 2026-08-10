import type { GeometryRow } from '@/lib/api';

/**
 * La table de geometrie. Elle affiche, elle ne calcule rien.
 *
 * `value_formatted` arrive deja mis en forme par Laravel — chiffres arabo-indiens
 * compris. La colonne de droite conserve la valeur telle que la marque l'a publiee,
 * ce qui rend la conversion verifiable a l'oeil.
 */
export function GeometryTable({
  rows,
  measureLabel,
  valueLabel,
  sourceLabel,
}: {
  rows: readonly GeometryRow[];
  measureLabel: string;
  valueLabel: string;
  sourceLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 dark:border-neutral-700">
            <th className="p-2 text-start text-xs font-semibold uppercase tracking-wider opacity-60">
              {measureLabel}
            </th>
            <th className="p-2 text-start text-xs font-semibold uppercase tracking-wider opacity-60">
              {valueLabel}
            </th>
            <th className="p-2 text-start text-xs font-semibold uppercase tracking-wider opacity-60">
              {sourceLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className="border-b border-neutral-200 dark:border-neutral-800">
              <td className="p-2">
                {/* Lettre de repere, comme sur la table publiee par Trek. */}
                <span className="me-2 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                  {String.fromCharCode(65 + index)}
                </span>
                {row.label}
              </td>
              <td className="p-2 font-mono font-semibold tabular-nums">{row.value_formatted}</td>
              <td className="p-2 font-mono text-xs opacity-60">
                {row.original_value}
                {row.original_unit ? ` ${row.original_unit}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
