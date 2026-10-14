'use client';

import { useState } from 'react';
import type { BuildSize } from '@/lib/api';
import { GeometryTable } from './GeometryTable';

/**
 * Seul Client Component de la page.
 *
 * Toutes les tailles arrivent dans la reponse initiale : changer de taille ne
 * declenche aucun appel reseau.
 *
 * Un bouton ne depasse jamais la largeur de sa rangee et son nom s'y coupe
 * (regle du 11 octobre 2026 : aucune page ne defile en largeur). Releve le
 * 14 octobre 2026 : Scott nomme les tailles des Gambler 10, 20 et RC
 * « L_HIGH_BB_SETTING_POSITION_DE_BOITIER_HAUTE » (44 a 48 caracteres sans
 * espace) et la fiche du Gambler 10 mesurait 428 px a 390 px.
 */
export function SizePicker({
  sizes,
  labels,
}: {
  sizes: readonly BuildSize[];
  labels: {
    height: string;
    inseam: string;
    wheels: string;
    measure: string;
    value: string;
    source: string;
  };
}) {
  const [index, setIndex] = useState(0);
  const size = sizes[index];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {sizes.map((s, i) => (
          <button
            key={s.label}
            type="button"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className="max-w-full border border-neutral-300 px-4 py-2 text-sm leading-tight transition-colors aria-pressed:border-emerald-700 aria-pressed:bg-emerald-700 aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-neutral-700 dark:aria-pressed:border-emerald-500 dark:aria-pressed:bg-emerald-600"
          >
            <span className="block font-mono font-semibold wrap-break-word">{s.label}</span>
            {s.label_alt && <span className="block font-mono text-xs wrap-break-word">{s.label_alt}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        {size.rider_height && (
          <p>
            {labels.height} <span className="font-mono tabular-nums">{size.rider_height}</span>
          </p>
        )}
        {size.rider_inseam && (
          <p>
            {labels.inseam} <span className="font-mono tabular-nums">{size.rider_inseam}</span>
          </p>
        )}
        {size.wheel_size && (
          <p>
            {labels.wheels} <span className="font-mono">{size.wheel_size}</span>
          </p>
        )}
      </div>

      <GeometryTable
        rows={size.geometry}
        measureLabel={labels.measure}
        valueLabel={labels.value}
        sourceLabel={labels.source}
      />
    </section>
  );
}
