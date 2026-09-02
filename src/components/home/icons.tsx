import type { SVGProps } from 'react';

/**
 * Les pictogrammes de l'accueil, en SVG inline.
 *
 * Les blocs Tailwind Plus importent `@heroicons/react`, qui n'est pas une
 * dépendance du projet — et quatre tracés ne justifient pas d'en ajouter une.
 * Même facture que les icônes de `ThemeToggle` : trait, `currentColor`,
 * `aria-hidden`. Elles sont décoratives, le libellé est toujours à côté.
 */
const TRAIT = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/**
 * La flèche « vers la suite ». En arabe, la suite est à GAUCHE : le miroir
 * est fait ici, une fois, par la variante `rtl:` — jamais par le texte.
 */
export function ArrowIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...TRAIT} {...props} className={`rtl:-scale-x-100 ${className}`}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/** Découvrir : la loupe. */
export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...TRAIT} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** Comparer : deux colonnes côte à côte. */
export function CompareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...TRAIT} {...props}>
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="16" rx="1.5" />
    </svg>
  );
}

/** Choisir : la boussole du bikefinder. */
export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...TRAIT} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}
