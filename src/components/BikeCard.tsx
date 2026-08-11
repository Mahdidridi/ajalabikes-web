import Image from 'next/image';
import Link from 'next/link';
import type { BuildCard } from '@/lib/api';
import { sizeCatalogue } from '@/lib/images';

/**
 * Une carte de catalogue : photo, marque, modele, prix.
 *
 * LE RAPPORT D'IMAGE EST FIXE, et c'est une decision de DONNEE, pas de design.
 * Les deux marques ne publient pas au meme format — Specialized en 16:9, Trek
 * en 4:3, PNG d'un cote, JPEG de l'autre. Sans cadre impose, la grille aurait
 * des cartes de hauteurs inegales et le melange se verrait immediatement.
 *
 * `object-contain` sur fond neutre : rogner couperait des roues.
 */
export function BikeCard({ bike, locale }: { bike: BuildCard; locale: string }) {
  const image = bike.image;

  return (
    <Link
      href={`/${locale}/bikes/${bike.brand.slug}/${bike.slug}`}
      className="group flex flex-col gap-3 border border-border bg-background p-3 transition hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-surface">
        {image ? (
          <Image
            src={sizeCatalogue(image)}
            alt={image.alt}
            // Dimensions de l'API : la place est reservee avant le chargement.
            width={image.sizes.card.w}
            height={image.sizes.card.h}
            className="absolute inset-0 h-full w-full object-contain p-2 transition group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          {bike.brand.name}
        </p>
        <h2 className="text-sm font-bold leading-tight text-balance">{bike.model_name}</h2>

        <p className="font-mono text-[11px] text-muted">{bike.year_label}</p>

        {/* Formate par Laravel. Aucun montant n'est mis en forme ici. */}
        <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
          {bike.msrp_formatted ?? <span className="font-normal italic text-muted">{bike.msrp_label}</span>}
        </p>
      </div>
    </Link>
  );
}
