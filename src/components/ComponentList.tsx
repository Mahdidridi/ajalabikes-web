/** @jsxImportSource react */
import type { Build } from '@/lib/api';

/** Les associations et les avertissements sont décidés et localisés par l’API. */
export function ComponentList({ components }: { components: Build['components'] }) {
  return (
    <dl className="grid grid-cols-[minmax(140px,auto)_1fr] text-sm">
      {components.map((component) => (
        <div key={component.id} className="contents">
          <dt className="border-b border-neutral-200 py-2 pe-3 opacity-70 dark:border-neutral-800">
            {component.label}
            {(component.size_label || component.size_note) && (
              <span className="mt-1 block text-xs">
                <bdi>{component.size_label ?? component.size_note}</bdi>
              </span>
            )}
          </dt>
          <dd className="border-b border-neutral-200 py-2 font-mono text-xs dark:border-neutral-800">
            <bdi>{component.description_formatted}</bdi>
            {component.unit_note && (
              <p className="mt-1 font-sans text-amber-800 dark:text-amber-500">
                {component.unit_note}
              </p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
