/** @jsxImportSource react */
import type { Build } from '@/lib/api';

/**
 * Les associations et les avertissements sont décidés et localisés par l’API.
 *
 * La colonne des descriptions peut rétrécir (`minmax(0, 1fr)`) et un mot sans espace s'y coupe : sinon la fiche
 * s'élargissait jusqu'au mot le plus long — mesuré le 11 octobre 2026, un lien brut de 64 caractères portait la fiche
 * du Vado à 423 px, et `80mm(27.5")/100mm(29")` celle du Talon au-delà de 320 px.
 *
 * L'étiquette de taille sous un libellé ne compte pas dans la largeur de sa colonne (`contain-inline-size`) et s'y
 * coupe : relevé le 14 octobre 2026, Scott nomme les tailles des Gambler « L_HIGH_BB_SETTING_POSITION_DE_BOITIER_HAUTE »
 * et la colonne des libellés prenait toute la largeur — descriptions du Gambler 10 à 0 px à 320 px, 24 px à 390 px.
 */
export function ComponentList({ components }: { components: Build['components'] }) {
  return (
    <dl className="grid grid-cols-[minmax(140px,auto)_minmax(0,1fr)] text-sm">
      {components.map((component) => (
        <div key={component.id} className="contents">
          <dt className="border-b border-neutral-200 py-2 pe-3 opacity-70 dark:border-neutral-800">
            {component.label}
            {(component.size_label || component.size_note) && (
              <span className="mt-1 block text-xs contain-inline-size wrap-break-word">
                <bdi>{component.size_label ?? component.size_note}</bdi>
              </span>
            )}
          </dt>
          <dd className="border-b border-neutral-200 py-2 font-mono text-xs wrap-break-word dark:border-neutral-800">
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
