import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BikeCard } from '@/components/BikeCard';
import { getFinderResults, getFinderTree, isLocale } from '@/lib/api';
import { seoFor } from '@/lib/seo';
import { FinderQuestionScreen, finderCopy } from '../question';

/**
 * Chaque étape est rendue au premier appel, puis servie du cache : le tag
 * `bikefinder` la fait re-rendre quand l'API le demande, les 24 h sont un
 * filet. Sans `generateStaticParams` — même vide — Next rendrait la route à
 * chaque requête (doc `generate-static-params`, « All paths at runtime »).
 */
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/**
 * Le parcours du bikefinder, un segment d'URL par réponse
 * (`/finder/mountain/no-power/trails/budget-mid`) — mécanique du bikefinder
 * Canyon : retour navigateur naturel, parcours partageable.
 *
 * La page MARCHE l'arbre servi par l'API avec les segments reçus : segment
 * inconnu → 404 ; il reste une question → écran de question ; le chemin est
 * complet → résultats. La résolution réponses → vélos vit dans Laravel
 * (`/bikefinder/results`) ; ici on affiche, rien d'autre.
 */
const COPY = {
  'ar-sa': {
    match: 'وجدنا ما يناسبك',
    because: 'بناءً على اختياراتك',
    shortlist: 'أفضل الترشيحات',
    alternatives: 'بدائل تستحق النظر',
    compare: 'قارن هذه الدراجات',
    empty: 'لا توجد دراجات مطابقة لهذا المسار بعد.',
    restart: 'ابدأ من جديد',
    refine: 'عدّل إجاباتك',
  },
  'en-sa': {
    match: "It's a match",
    because: 'Based on your choices',
    shortlist: 'Top picks',
    alternatives: 'Worth a look too',
    compare: 'Compare these bikes',
    empty: 'No bikes match this path yet.',
    restart: 'Start over',
    refine: 'Refine your answers',
  },
} as const;

/**
 * Une étape du parcours est un état d'interface, pas une page de destination :
 * canonical propre (l'URL se partage), politique cible `noindex, follow`.
 * Un chemin invalide rend 404 par la page elle-même.
 */
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/finder/[...steps]'>): Promise<Metadata> {
  const { locale, steps } = await params;
  if (!isLocale(locale)) notFound();

  return seoFor({
    locale,
    path: `/finder/${steps.join('/')}`,
    title: finderCopy(locale).eyebrow,
    indexable: false,
  });
}

export default async function FinderStepsPage({
  params,
}: PageProps<'/[locale]/finder/[...steps]'>) {
  const { locale, steps } = await params;
  if (!isLocale(locale)) notFound();

  const tree = await getFinderTree(locale);

  // Marche de l'arbre : chaque segment doit être une option du nœud courant.
  let noeud = tree.questions[tree.root];
  let suivant: string | null | undefined = tree.root;
  for (const segment of steps) {
    if (!noeud) notFound();
    const option = noeud.options.find((o) => o.key === segment);
    if (!option) notFound();
    suivant = option.next;
    noeud = suivant ? tree.questions[suivant] : undefined!;
  }

  if (suivant && tree.questions[suivant]) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          {finderCopy(locale).eyebrow}
        </p>
        <FinderQuestionScreen
          locale={locale}
          question={tree.questions[suivant]}
          steps={steps}
          depth={steps.length}
        />
      </main>
    );
  }

  // Chemin complet : les résultats. Un chemin qui ne résout pas (l'arbre a
  // changé de version entre deux visites) rend un 404 propre, pas une erreur.
  const results = await getFinderResults(locale, steps.join(','));
  if (!results) notFound();

  const copy = COPY[locale];
  const base = `/${locale}/finder`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">
        {finderCopy(locale).eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{copy.match}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{copy.because}</span>
        {results.choices.map((choix) => (
          <span
            key={choix.key}
            className="rounded-full border border-border px-3 py-1 text-sm"
          >
            {choix.label}
          </span>
        ))}
        <Link href={base} className="text-sm text-accent underline-offset-2 hover:underline">
          {copy.restart}
        </Link>
      </div>

      {results.builds.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border p-8">
          <p>{copy.empty}</p>
          <Link
            href={`${base}/${steps.slice(0, -1).join('/')}`}
            className="mt-3 inline-block text-accent underline-offset-2 hover:underline"
          >
            {copy.refine}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{copy.shortlist}</h2>
            {results.compare_url && (
              <Link
                href={results.compare_url}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {copy.compare}
              </Link>
            )}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {results.builds.map((bike) => (
              <li key={`${bike.brand.slug}/${bike.slug}`}>
                <BikeCard bike={bike} locale={locale} />
              </li>
            ))}
          </ul>

          {results.alternatives.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-semibold">{copy.alternatives}</h2>
              <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                {results.alternatives.map((bike) => (
                  <li key={`${bike.brand.slug}/${bike.slug}`}>
                    <BikeCard bike={bike} locale={locale} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
