'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { Facets } from '@/lib/api';

type Labels = {
  brand: string;
  category: string;
  wheelSize: string;
  sort: string;
  reset: string;
  sortOptions: { value: string; label: string }[];
};

/**
 * La barre de filtres, EN HAUT et a l'horizontale.
 *
 * Pas de colonne laterale : elle mange la largeur sur mobile, et sur un
 * catalogue, filtrer EST le produit.
 *
 * L'etat vit dans l'URL et nulle part ailleurs. C'est ce qui rend un resultat
 * filtre partageable, et ce qui evite d'avoir deux sources de verite — l'URL
 * et un etat local — qui finissent toujours par diverger.
 *
 * Les seaux affiches viennent des FACETTES de l'API, avec leurs decomptes :
 * coder une liste de marques en dur ici deriverait au premier ajout.
 */
export function CatalogFilters({ facets, labels }: { facets: Facets; labels: Labels }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [enCours, demarrer] = useTransition();

  function appliquer(cle: string, valeur: string) {
    const suivant = new URLSearchParams(params.toString());

    if (valeur === '') suivant.delete(cle);
    else suivant.set(cle, valeur);

    // Le curseur appartient a la page precedente : le garder renverrait la
    // deuxieme page d'un filtre qu'on vient de changer.
    suivant.delete('cursor');

    demarrer(() => router.push(`${chemin}?${suivant}`, { scroll: false }));
  }

  const actifs = ['brand', 'category', 'wheel_size', 'sort'].some((c) => params.get(c));

  return (
    <div
      className={`flex flex-wrap items-end gap-3 border-y border-border py-3 transition-opacity ${
        enCours ? 'opacity-60' : ''
      }`}
    >
      <Choix
        id="brand"
        label={labels.brand}
        valeur={params.get('brand') ?? ''}
        options={facets.brands.map((b) => ({ value: b.key, label: `${b.label} (${b.count})` }))}
        onChange={(v) => appliquer('brand', v)}
      />

      <Choix
        id="category"
        label={labels.category}
        valeur={params.get('category') ?? ''}
        options={facets.categories.map((c) => ({ value: c.key, label: `${c.label} (${c.count})` }))}
        onChange={(v) => appliquer('category', v)}
      />

      <Choix
        id="wheel_size"
        label={labels.wheelSize}
        valeur={params.get('wheel_size') ?? ''}
        options={facets.wheel_sizes.map((r) => ({ value: r.key, label: `${r.label} (${r.count})` }))}
        onChange={(v) => appliquer('wheel_size', v)}
      />

      <Choix
        id="sort"
        label={labels.sort}
        valeur={params.get('sort') ?? ''}
        options={labels.sortOptions}
        onChange={(v) => appliquer('sort', v)}
      />

      {actifs && (
        <button
          type="button"
          onClick={() => demarrer(() => router.push(chemin, { scroll: false }))}
          className="border border-border px-3 py-1.5 font-mono text-xs hover:border-foreground"
        >
          {labels.reset}
        </button>
      )}
    </div>
  );
}

function Choix({
  id,
  label,
  valeur,
  options,
  onChange,
}: {
  id: string;
  label: string;
  valeur: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  // Un seau vide n'est pas propose : offrir un filtre qui ne renvoie rien est
  // une impasse, et l'API a deja calcule les decomptes.
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        {label}
      </label>
      <select
        id={id}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-36 border border-border bg-background px-2 py-1.5 text-sm"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
