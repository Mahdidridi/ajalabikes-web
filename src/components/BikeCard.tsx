import Image from 'next/image';
import Link from 'next/link';
import type { BuildCard } from '@/lib/api';
import { sizeCatalogue } from '@/lib/images';

/**
 * Une carte de catalogue : photo, marque, modèle, prix.
 *
 * LE RAPPORT D'IMAGE EST FIXE, et c'est une décision de DONNÉE, pas de design.
 * Les deux marques ne publient pas au même format — Specialized en 16:9, Trek
 * en 4:3, PNG d'un côté, JPEG de l'autre. Sans cadre imposé, la grille aurait
 * des cartes de hauteurs inégales et le mélange se verrait immédiatement.
 *
 * LA ZONE IMAGE EST BLANCHE EN DUR, même en thème sombre : les deux marques
 * publient des détourages sur fond blanc (JPEG chez Trek — le blanc est DANS
 * le fichier). Sur un fond sombre, chaque Trek afficherait son rectangle
 * blanc ; la fenêtre blanche assumée est le seul rendu propre dans les deux
 * thèmes. `object-contain` : rogner couperait des roues.
 */
export function BikeCard({ bike, locale }: { bike: BuildCard; locale: string }) {
  const image = bike.image;

  return (
    <Link
      href={`/${locale}/bikes/${bike.brand.slug}/${bike.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:border-muted dark:hover:shadow-none"
    >
      <div className="relative aspect-4/3 w-full bg-white">
        {image ? (
          <Image
            src={sizeCatalogue(image)}
            alt={image.alt}
            // Dimensions de l'API : la place est réservée avant le chargement.
            width={image.sizes.card.w}
            height={image.sizes.card.h}
            className="absolute inset-0 h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-col gap-0.5 bg-background px-4 pb-4 pt-3">
        {/* Noms latins isoles : en RTL, un signe final passerait a gauche
            (« +Borrego »). Voir la fiche et `CLAUDE.md` § Vocabulaire arabe. */}
        <p className="text-xs text-muted">
          <bdi>{bike.brand.name}</bdi>
        </p>
        <h2 className="text-[15px] font-semibold leading-snug text-balance">
          <bdi>{bike.model_name}</bdi>
        </h2>

        <p className="text-xs text-muted">{bike.year_label}</p>

        {/* Formaté par Laravel. Aucun montant n'est mis en forme ici. */}
        <p className="mt-1 text-sm font-medium tabular-nums">
          {bike.msrp_formatted ?? <span className="font-normal italic text-muted">{bike.msrp_label}</span>}
        </p>
      </div>
    </Link>
  );
}
