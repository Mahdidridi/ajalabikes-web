'use client';

import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/api';
import { compareHref, withSize, type CompareSelection } from '@/lib/compare-url';

/**
 * Le choix d'une taille pour UNE colonne de la comparaison.
 *
 * Aucune logique ici : le composant reçoit les tailles publiées et la
 * sélection affichée, compose l'adresse au moment du choix (`compareHref`,
 * décision du 28 octobre 2026 : aucune adresse toute faite dans le code de la
 * page) et navigue — l'état vit dans l'URL.
 */
export function SizeSelect({
  label,
  current,
  sizes,
  locale,
  selection,
  column,
}: {
  label: string;
  current: string | null;
  sizes: string[];
  locale: Locale;
  selection: CompareSelection;
  /** La colonne de ce vélo dans la sélection. */
  column: number;
}) {
  const router = useRouter();

  return (
    <select
      aria-label={label}
      value={current ?? ''}
      onChange={(e) => {
        const choix = e.target.value;
        if (sizes.includes(choix)) router.push(compareHref(locale, withSize(selection, column, choix)), { scroll: false });
      }}
      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
    >
      <option value="" disabled>
        {label}
      </option>
      {sizes.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
