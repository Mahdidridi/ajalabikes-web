'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Ajouter un vélo à la comparaison : un champ, la liste filtrée, un clic.
 *
 * Les 98 options arrivent DU SERVEUR avec leur URL de destination déjà
 * construite — le composant filtre du texte et navigue, rien d'autre.
 * Le filtrage est de l'interface pure, pas une règle métier.
 */
export function ComparePicker({
  placeholder,
  empty,
  options,
}: {
  placeholder: string;
  empty: string;
  options: { label: string; href: string }[];
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
              <li key={o.href}>
                <button
                  type="button"
                  onClick={() => {
                    setTexte('');
                    router.push(o.href, { scroll: false });
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
