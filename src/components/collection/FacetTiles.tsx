import Link from 'next/link';
import type { Locale } from '@/lib/api';
import type { FacetBucket } from '@/lib/api-pages';
import { bikesCount } from '@/lib/vocabulary';

/** Un seau de facette et la page qu'il ouvre. */
export type Tile = FacetBucket & { href: string };

/**
 * Une grille de tuiles bâtie sur une FACETTE de l'API — les catégories d'une
 * marque, les marques d'une catégorie. Libellés et décomptes arrivent
 * traduits et comptés — seul le mot du compteur s'accorde ici ; chaque tuile
 * ouvre un catalogue filtré, un résultat réel. Même dessin que les tuiles de
 * catégories de l'accueil.
 */
export function FacetTiles({
  locale,
  title,
  tiles,
}: {
  locale: Locale;
  title: string;
  tiles: Tile[];
}) {
  if (tiles.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold sm:text-2xl ltr:tracking-tight">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.key} className="contents">
            <Link
              href={tile.href}
              className="flex flex-col gap-0.5 rounded-xl border border-border p-4 transition hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="text-sm font-semibold">{tile.label}</span>
              <span className="font-mono text-xs text-muted">{bikesCount(locale, tile.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
