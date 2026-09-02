import { notFound } from 'next/navigation';
import { getFinderTree, isLocale } from '@/lib/api';
import { FinderQuestionScreen, finderCopy } from './question';

/** Prérendue par locale, re-rendue sur le tag `bikefinder` ; 24 h de filet. */
export const revalidate = 86400;

/**
 * L'entrée du bikefinder : la première question EST l'accueil du parcours
 * (mécanique du bikefinder Canyon — pas d'écran d'introduction superflu).
 * Tout l'arbre vient de l'API, localisé ; aucun libellé de question en dur.
 */
export default async function FinderPage({ params }: PageProps<'/[locale]/finder'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const tree = await getFinderTree(locale);
  const racine = tree.questions[tree.root];
  if (!racine) notFound();

  const copy = finderCopy(locale);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">
        {copy.eyebrow}
      </p>
      <FinderQuestionScreen locale={locale} question={racine} steps={[]} depth={0} />
    </main>
  );
}
