'use client';

import { useRouter } from 'next/navigation';

/**
 * Le choix d'une taille pour UNE colonne de la comparaison.
 *
 * Aucune logique ici : chaque option porte l'URL complète, construite par le
 * serveur. Le composant ne fait que naviguer — l'état vit dans l'URL.
 */
export function SizeSelect({
  label,
  current,
  options,
}: {
  label: string;
  current: string | null;
  options: { label: string; href: string }[];
}) {
  const router = useRouter();

  return (
    <select
      aria-label={label}
      value={current ?? ''}
      onChange={(e) => {
        const choix = options.find((o) => o.label === e.target.value);
        if (choix) router.push(choix.href, { scroll: false });
      }}
      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
    >
      <option value="" disabled>
        {label}
      </option>
      {options.map((o) => (
        <option key={o.label} value={o.label}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
