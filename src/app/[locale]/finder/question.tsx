import Link from 'next/link';
import type { FinderQuestion, Locale } from '@/lib/api';

/**
 * L'écran de question du bikefinder : des LIENS purs, aucune hydratation.
 * Chaque réponse ajoute son segment à l'URL (mécanique du bikefinder Canyon :
 * retour navigateur naturel, parcours partageable, une question par écran).
 * Les libellés des questions et des options viennent de l'API ; seul le
 * chrome de navigation (retour, recommencer) est traduit ici.
 */
const COPY = {
  'ar-sa': {
    eyebrow: 'دليل اختيار السيكل',
    back: 'رجوع',
    restart: 'ابدأ من جديد',
    step: 'خطوة',
  },
  'en-sa': {
    eyebrow: 'Bike finder',
    back: 'Back',
    restart: 'Start over',
    step: 'Step',
  },
} as const;

export function finderCopy(locale: Locale) {
  return COPY[locale];
}

/** La profondeur maximale observée de l'arbre : universe → power → usage → budget. */
const PROFONDEUR = 4;

export function FinderQuestionScreen({
  locale,
  question,
  steps,
  depth,
}: {
  locale: Locale;
  question: FinderQuestion;
  steps: string[];
  depth: number;
}) {
  const copy = COPY[locale];
  const base = `/${locale}/finder`;
  const parent = steps.length > 1 ? `${base}/${steps.slice(0, -1).join('/')}` : base;
  const tiles = question.kind === 'tiles';

  return (
    <div>
      <div className="mb-6 mt-2 flex items-center justify-between gap-4">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.min(100, (depth / PROFONDEUR) * 100)}%` }}
          />
        </div>
        <div className="flex shrink-0 gap-2 text-sm">
          {steps.length > 0 && (
            <Link
              href={parent}
              className="rounded-full border border-border px-4 py-1.5 transition hover:border-accent"
            >
              {copy.back}
            </Link>
          )}
          {steps.length > 0 && (
            <Link
              href={base}
              className="rounded-full border border-border px-4 py-1.5 transition hover:border-accent"
            >
              {copy.restart}
            </Link>
          )}
        </div>
      </div>

      <h1 className="text-3xl font-bold sm:text-4xl">{question.label}</h1>

      <ul
        className={
          tiles
            ? 'mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'
            : 'mt-8 flex max-w-xl flex-col gap-3'
        }
      >
        {question.options.map((option) => (
          <li key={option.key}>
            <Link
              href={`/${locale}/finder/${[...steps, option.key].join('/')}`}
              className={`block rounded-xl border border-border bg-white p-4 text-start transition hover:border-accent hover:shadow-lg dark:bg-transparent dark:hover:shadow-none ${
                tiles ? 'min-h-28 sm:min-h-32' : ''
              }`}
            >
              <span className="font-semibold">{option.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
