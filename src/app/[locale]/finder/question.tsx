/** @jsxImportSource react */
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
    eyebrow: 'دليل اختيار الدراجة',
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

/** Illustration d'une tuile : nom de base du fichier et dimensions de sa version de 480 px. */
type TileArt = { file: string; width: number; height: number };
type Tile = { tone: string; art?: TileArt };

/**
 * Habillage de chaque tuile de la QUESTION RACINE (clé d'option → teinte et illustration).
 * Seule la racine est habillée ; les écrans suivants restent neutres. Une clé que l'API
 * ajouterait n'a ni teinte ni image et garde la tuile neutre — jamais une teinte devinée.
 * Un `Map`, pas un objet littéral : `TILES['constructor']` y rendrait la fonction héritée
 * d'`Object`. Les classes sont écrites en entier : Tailwind ne génère que ce qu'il lit.
 *
 * TEINTE — décision du 9 octobre 2026 (fondateur) : les quatre teintes du bikefinder de Trek
 * plus un jaune pour Kids ; valeurs, contrastes et justification dans `globals.css`
 * (`--tone-*`). Gravel prend le bleu de l'« E-Bike » de Trek, libre ici puisque l'assistance
 * électrique est une question de deuxième niveau — si une tuile « électrique » devient racine,
 * elle recevra sa propre teinte. Écarté : Gravel en lavande comme « Road or Gravel » chez Trek
 * (deux tuiles identiques, le bleu inutilisé).
 *
 * ILLUSTRATION — décisions du 9 octobre 2026 (fondateur) : les cinq tuiles portent leur
 * illustration, Road et Mountain d'abord, les trois autres le même jour. Elle applique la
 * direction visuelle du projet — un système d'illustrations éditoriales dessinées à la main,
 * `CLAUDE.md` racine, « Direction visuelle ». Fichiers `public/finder-art/{file}-{320|480}-v1.webp`
 * (WebP à fond transparent, rognés à l'emprise du vélo ; recette dans `CLAUDE.md`), noms
 * versionnés donc cache immuable (`next.config.ts`). Fournies par le fondateur, qui les déclare
 * créées de zéro (par lui ou par une IA), pas d'après une photo de constructeur. Vélo ENTIER,
 * collé en bas de la tuile, jamais rogné, et jamais retourné en arabe : miroiter l'image ferait
 * passer la transmission du côté opposé, ce qu'un cycliste verrait tout de suite. Décorative
 * (`alt=""`) : le nom accessible reste le libellé.
 */
const TILES: ReadonlyMap<string, Tile> = new Map<string, Tile>([
  ['road', { tone: 'bg-tone-lavender', art: { file: 'road', width: 480, height: 277 } }],
  ['mountain', { tone: 'bg-tone-sage', art: { file: 'mountain', width: 480, height: 263 } }],
  ['gravel-cx', { tone: 'bg-tone-sky', art: { file: 'gravel', width: 480, height: 281 } }],
  ['city-fitness', { tone: 'bg-tone-peach', art: { file: 'city', width: 480, height: 276 } }],
  ['kids', { tone: 'bg-tone-butter', art: { file: 'kids', width: 480, height: 267 } }],
]);

/** Largeurs servies pour chaque illustration, en `srcset`. */
const ART_WIDTHS = [320, 480] as const;

const artUrl = (file: string, width: number) => `/finder-art/${file}-${width}-v1.webp`;

/**
 * Largeur réelle d'une illustration selon la grille de la racine : 2 colonnes, puis 3 (`sm`),
 * puis 5 (`lg`, conteneur de 1024 px) — une tuile moins ses marges de 16 px et ses bords de 1 px.
 */
const ART_SIZES =
  '(min-width: 1024px) 155px, (min-width: 640px) calc((100vw - 56px) / 3 - 34px), calc((100vw - 44px) / 2 - 34px)';

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
  const root = tiles && steps.length === 0;

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
        {question.options.map((option) => {
          const tile = root ? TILES.get(option.key) : undefined;
          const tone = tile?.tone;
          const art = tile?.art;

          return (
            // À la racine, la cellule est un conteneur flex et la tuile s'y étire : toutes les
            // tuiles d'une rangée ont la hauteur de la plus haute, illustrées ou non.
            <li key={option.key} className={root ? 'flex' : undefined}>
              <Link
                href={`/${locale}/finder/${[...steps, option.key].join('/')}`}
                className={`${
                  root ? 'flex flex-1 flex-col gap-2' : 'block'
                } rounded-xl border p-4 text-start transition hover:border-accent hover:shadow-lg dark:hover:shadow-none ${
                  tone ? `${tone} border-transparent text-tone-ink` : 'border-border bg-white dark:bg-transparent'
                } ${tiles ? 'min-h-28 sm:min-h-32' : ''}`}
              >
                <span className="font-semibold">{option.label}</span>
                {art && (
                  // `<img>` et non `next/image` : le loader de ce site est global et réservé aux
                  // médias de l'API ; ces fichiers statiques portent leurs dimensions et leur srcset.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artUrl(art.file, 480)}
                    srcSet={ART_WIDTHS.map((w) => `${artUrl(art.file, w)} ${w}w`).join(', ')}
                    sizes={ART_SIZES}
                    width={art.width}
                    height={art.height}
                    alt=""
                    decoding="async"
                    className="mt-auto h-auto w-full"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
