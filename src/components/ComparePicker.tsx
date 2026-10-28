'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/api';
import { compareHref, withBike, type CompareSelection } from '@/lib/compare-url';

/**
 * Ajouter un vélo à la comparaison : un champ, la liste filtrée, un clic.
 *
 * Les options arrivent DU SERVEUR avec leur nom et leur clé `marque/slug` ;
 * l'adresse de destination se compose AU CLIC (`compareHref`), jamais à
 * l'avance : des adresses toutes faites dans le code de la page sont des
 * adresses que Google explore (décision du 28 octobre 2026,
 * `src/lib/compare-url.ts`). Le filtrage est de l'interface pure, pas une
 * règle métier.
 */
export function ComparePicker({
  placeholder,
  empty,
  options,
  locale,
  selection,
}: {
  placeholder: string;
  empty: string;
  options: { label: string; value: string }[];
  locale: Locale;
  /** La sélection de l'adresse, que le vélo choisi complète. */
  selection: CompareSelection;
}) {
  const router = useRouter();
  const [texte, setTexte] = useState('');

  const filtre = texte.trim().toLowerCase();
  const resultats = filtre === ''
    ? []
    : options.filter((o) => o.label.toLowerCase().includes(filtre)).slice(0, 8);

  return (
    <div className="relative w-full">
      <input
        type="search"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted"
      />

      {filtre !== '' && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-background shadow-lg">
          {resultats.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{empty}</li>
          ) : (
            resultats.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    setTexte('');
                    router.push(compareHref(locale, withBike(selection, o.value)), { scroll: false });
                  }}
                  className="w-full px-3 py-2 text-start text-sm transition hover:bg-surface"
                >
                  {/* Le libelle est « marque + modele » en latin : isole. */}
                  <bdi>{o.label}</bdi>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
