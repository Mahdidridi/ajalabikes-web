/** @jsxImportSource react */
import Link from 'next/link';
import { BikeCard } from '@/components/BikeCard';
import type { Locale, SimilarBuild, SimilarBuilds } from '@/lib/api';

/**
 * Libellés d'interface seulement. Le titre de la méthode, ses critères, l'avertissement MSRP et les raisons arrivent
 * déjà rédigés par Laravel dans la langue de la page. Arabe validé par le fondateur à la mise en ligne, le 14 octobre 2026 (web #35).
 */
const COPY = {
  'ar-sa': {
    title: 'دراجات مشابهة',
    how: 'كيف نختار',
    showAll: 'عرض الكل ({n})',
    compare: 'قارن',
  },
  'en-sa': {
    title: 'Similar bikes',
    how: 'How we choose',
    showAll: 'Show all ({n})',
    compare: 'Compare',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/** Quatre cartes d'abord (périmètre V1 de la note du 10 septembre 2026), les suivantes à déplier. */
const VISIBLE = 4;
/** Trois raisons au plus sous une carte, dans l'ordre servi. */
const MAX_REASONS = 3;

/**
 * La seule règle d'affichage : le bloc ET son ancre dans la barre de la fiche n'existent que si l'API sert au moins
 * un vélo proche. Un cadre nu exclu du catalogue, par exemple, répond `total: 0` : ni titre, ni ancre.
 */
export function hasSimilar(data: SimilarBuilds | null | undefined): data is SimilarBuilds {
  return !!data && data.total > 0 && data.items.length > 0;
}

/** Le titre du bloc, repris par la barre d'ancres de la fiche : un seul libellé pour les deux. */
export function similarTitle(locale: Locale): string {
  return COPY[locale].title;
}

/**
 * Les vélos proches de la fiche (web #35, méthode servie par l'API — `1-draft.2` au 14 octobre 2026).
 *
 * SERVER COMPONENT, ZÉRO JAVASCRIPT : les deux replis sont des `<details>` natifs, le bloc fonctionne avant
 * l'hydratation. RIEN N'EST CALCULÉ ICI : ni l'ordre (le classement de l'API, jamais retrié), ni les raisons (leurs
 * isolats FSI/PDI sont déjà dans le texte), ni l'adresse de comparaison (`compare_path`, déjà préfixée par la locale).
 *
 * LA GRILLE SUIT LA LARGEUR DU BLOC, pas celle de l'écran (requêtes de conteneur) : la fiche fait 896 px, ou 1264 px
 * quand sa photo porte des notes (web #52). Quatre cartes donnent 1, 2 ou 4 colonnes — jamais 3 + 1.
 */
export function SimilarBikes({ data, locale }: { data: SimilarBuilds; locale: Locale }) {
  if (!hasSimilar(data)) return null;

  const t = COPY[locale];
  const shown = data.items.slice(0, VISIBLE);
  const rest = data.items.slice(VISIBLE);

  return (
    <section id="similar" className="flex flex-col gap-4 scroll-mt-16">
      {/* Le style de titre commun aux blocs de la fiche (web #65, `SECTION_TITLE` de `BuildDetails`). */}
      <h2 className="text-2xl font-bold tracking-tight">{t.title}</h2>

      <p className="text-sm">{data.method.title}</p>
      <details className="text-sm">
        <summary className="w-fit cursor-pointer text-muted transition hover:text-foreground">{t.how}</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-muted">
          {data.method.criteria.map((criterion, i) => (
            <li key={i}>{criterion}</li>
          ))}
        </ul>
      </details>
      {/* Une fois pour tout le bloc : le MSRP US n'est pas un prix local. */}
      <p className="text-xs text-amber-800 dark:text-amber-500">{data.msrp_disclaimer}</p>

      <div className="@container flex flex-col gap-6">
        <BikeList bikes={shown} locale={locale} />
        {rest.length > 0 && (
          <details>
            {/* Le total de l'API, pas le reste à déplier ; « عرض الكل (N) » évite d'accorder un nom au nombre. */}
            <summary className="w-fit cursor-pointer text-sm font-medium text-muted transition hover:text-foreground">
              {t.showAll.replace('{n}', String(data.total))}
            </summary>
            <div className="mt-6">
              <BikeList bikes={rest} locale={locale} />
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

/**
 * Chaque carte est le `BikeCard` du catalogue (même lien), en `h3` sous le `h2` du bloc. Raisons et lien Compare
 * vivent SOUS la carte, hors de son `<Link>` : un lien dans un lien est invalide.
 */
function BikeList({ bikes, locale }: { bikes: SimilarBuild[]; locale: Locale }) {
  const t = COPY[locale];

  return (
    <ul className="grid grid-cols-1 gap-6 @xl:grid-cols-2 @5xl:grid-cols-4">
      {bikes.map((bike) => (
        <li key={`${bike.brand.slug}/${bike.slug}`} data-similar-card className="flex flex-col gap-3">
          <BikeCard bike={bike} locale={locale} headingLevel="h3" />
          {bike.reasons.length > 0 && (
            <ul data-similar-reasons className="flex flex-col gap-1 text-xs text-muted">
              {bike.reasons.slice(0, MAX_REASONS).map((reason) => (
                <li key={reason.key}>{reason.text}</li>
              ))}
            </ul>
          )}
          <Link
            href={bike.compare_path}
            className="w-fit rounded-sm text-sm font-medium underline underline-offset-4 transition hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.compare}
            {/* Lu par le lecteur d'écran : dix liens « Compare » sans leur vélo ne disent rien. */}
            <span className="sr-only">
              {' '}
              <bdi>{bike.model_name}</bdi>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
