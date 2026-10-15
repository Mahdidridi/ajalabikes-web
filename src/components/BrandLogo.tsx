/**
 * Le logo de Darraja Bikes — décision du fondateur du 15 octobre 2026 : le mot « درّاجة » dessiné à la main (trait
 * d'encre, shadda sur une touche de crayon jaune), en deux encres : NOIRE pour le thème clair, BLANCHE pour le
 * sombre (le shadda reste noir sur son jaune). Deux formes : `wordmark`, le mot seul (en-tête), et `lockup`, le mot
 * et « DARRAJA BIKES » dessous (pied de page).
 *
 * Les deux encres sont dans le DOM et le CSS n'affiche que la bonne (`logo-on-light` / `logo-on-dark`,
 * `globals.css`), en suivant les deux portes du thème comme les couleurs : rien ne clignote, rien ne s'hydrate.
 * `<img>` et non `next/image` : le loader du site est global et réservé aux médias de l'API (règle 3 du CLAUDE.md).
 *
 * Fichiers : `public/brand/{forme}-{encre}-{largeur}-v1.webp`, servis immuables (`next.config.ts`) — un nouveau
 * logo prend un nouveau nom (`-v2`), jamais l'ancien écrasé.
 */
type Ink = 'black' | 'white';
type Shape = { widths: readonly number[]; files: Record<Ink, { width: number; height: number }> };

/**
 * Largeurs produites et dimensions du plus grand fichier de chaque encre — elles réservent la place de l'image. Toutes
 * les largeurs d'une encre ont exactement les mêmes proportions (toile complétée à la production). Le mot seul a la même
 * boîte dans les deux encres : rien ne bouge à la bascule de thème. Le logo complet garde les proportions de chaque
 * dessin (la signature n'y est pas à la même distance).
 */
const SHAPES = {
  wordmark: { widths: [120, 240], files: { black: { width: 240, height: 100 }, white: { width: 240, height: 100 } } },
  lockup: { widths: [400, 600], files: { black: { width: 600, height: 285 }, white: { width: 600, height: 306 } } },
} as const satisfies Record<string, Shape>;

const INKS: readonly { ink: Ink; className: string }[] = [
  { ink: 'black', className: 'logo-on-light' },
  { ink: 'white', className: 'logo-on-dark' },
];

function file(shape: keyof typeof SHAPES, ink: Ink, width: number): string {
  return `/brand/${shape}-${ink}-${width}-v1.webp`;
}

export function BrandLogo({
  shape,
  alt,
  lang,
  sizes,
  className,
  loading = 'eager',
}: {
  shape: keyof typeof SHAPES;
  alt: string;
  /** Langue du texte alternatif, quand elle diffère de celle de la page. */
  lang?: string;
  /** Largeur affichée (attribut `sizes`) : le navigateur choisit le fichier selon elle et la densité de l'écran. */
  sizes: string;
  /** Taille affichée : une hauteur OU une largeur, l'autre en `auto`. */
  className: string;
  /**
   * `lazy` hors du premier écran : l'encre masquée n'est alors jamais téléchargée. En haut de page, `eager` : les
   * deux petits fichiers partent tout de suite, et la bascule de thème n'attend rien.
   */
  loading?: 'eager' | 'lazy';
}) {
  const { widths, files } = SHAPES[shape];
  const largest = widths[widths.length - 1];

  return INKS.map(({ ink, className: theme }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={ink}
      src={file(shape, ink, largest)}
      srcSet={widths.map((w) => `${file(shape, ink, w)} ${w}w`).join(', ')}
      sizes={sizes}
      width={files[ink].width}
      height={files[ink].height}
      alt={alt}
      lang={lang}
      loading={loading}
      decoding="async"
      className={`${theme} ${className}`}
    />
  ));
}
