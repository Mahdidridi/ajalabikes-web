import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ComparePicker } from '@/components/ComparePicker';
import { ComparisonSection } from '@/components/ComparisonSection';
import { GeometryBlock } from '@/components/GeometryBlock';
import { SizeSelect } from '@/components/SizeSelect';
import { InvalidSelection } from '@/components/InvalidSelection';
import {
  ApiValidationError, getCatalog, getCompare, getGeometryGlossary, isLocale,
  type BuildCard, type CompareData, type Locale,
} from '@/lib/api';
import { exampleSelection } from '@/lib/compare-example';
import { GEOMETRY_COPY } from '@/lib/geometry-copy';
import { sizeCatalogue } from '@/lib/images';
import { seoFor } from '@/lib/seo';

/**
 * Libellés d'interface uniquement — toute DONNÉE arrive déjà localisée de l'API. Ceux du dessin et du glossaire
 * vivent dans `geometry-copy.ts`, partagés avec la fiche (web #66).
 */
const COPY = {
  'ar-sa': {
    title: 'قارن الدراجات',
    intro: 'أضف دراجتين أو ثلاث دراجات لمقارنتها جنبًا إلى جنب.',
    example: 'مثال',
    add: 'أضف دراجةً',
    search: 'ابحث عن دراجة…',
    no_match: 'لا نتائج.',
    remove: 'إزالة',
    view: 'عرض التفاصيل',
    size: 'اختر المقاس',
    diff_only: 'الاختلافات فقط',
    all_rows: 'كل الصفوف',
  },
  'en-sa': {
    title: 'Compare bikes',
    intro: 'Add two or three bikes to compare them side by side.',
    example: 'Example',
    add: 'Add a bike',
    search: 'Find a bike…',
    no_match: 'No match.',
    remove: 'Remove',
    view: 'View details',
    size: 'Choose size',
    diff_only: 'Differences only',
    all_rows: 'All rows',
  },
} as const;

/**
 * La page nue est une vraie page ; une comparaison en cours (`?bikes=`,
 * `sizes`, `diff`) est un etat d'interface : canonical de la page nue,
 * politique cible `noindex, follow`. Les comparaisons indexables seront la
 * liste blanche de Laravel, `/compare/{a}-vs-{b}` (decision 3 du 2 septembre
 * 2026) — pas ces permutations. Depuis le 16 octobre 2026, la page nue montre
 * un exemple fixe (`compare-example.ts`) : contenu stable, adresse inchangée.
 */
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/[locale]/compare'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return seoFor({
    locale,
    path: '/compare',
    title: COPY[locale].title,
    indexable: Object.keys(await searchParams).length === 0,
  });
}

export default async function ComparePage({ params, searchParams }: PageProps<'/[locale]/compare'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = COPY[locale as Locale];
  const g = GEOMETRY_COPY[locale as Locale];

  const q = await searchParams;
  const brut = typeof q.bikes === 'string' ? q.bikes : '';
  // La sélection de l'adresse, telle quelle : c'est elle que le sélecteur complète.
  const choisis = brut.split(',').filter(Boolean).slice(0, 3);
  const sizesBrut = typeof q.sizes === 'string' ? q.sizes : '';
  const taillesChoisies = choisis.map((_, i) => sizesBrut.split(',')[i] || null);
  const diffOnly = q.diff === '1';

  // Les 98 cartes alimentent le sélecteur ET les colonnes avant que la
  // comparaison existe (un seul vélo choisi). Un appel, celui du catalogue.
  const [catalogue, glossaire] = await Promise.all([
    getCatalog(locale, { per_page: '800' }),
    getGeometryGlossary(locale),
  ]);
  const carteDe = new Map(catalogue.data.map((b) => [`${b.brand.slug}/${b.slug}`, b]));

  // Page nue : l'exemple (décision du fondateur du 16 octobre 2026, `compare-example.ts`). Il ne fait jamais tomber la
  // page : un vélo sorti du catalogue, un refus ou une panne de l'API rendent la page vide d'avant.
  let exemple = exampleSelection(q, (key) => carteDe.has(key));
  let data: CompareData | null = null;
  if (exemple) {
    data = await getCompare(locale, exemple.bikes.join(','), exemple.sizes.join(',')).catch(() => null);
    if (data === null) exemple = null;
  } else if (choisis.length >= 2) {
    // La comparaison n'existe qu'à partir de deux vélos — l'API le garantit.
    try {
      data = await getCompare(
        locale,
        choisis.join(','),
        taillesChoisies.some(Boolean) ? taillesChoisies.map((s) => s ?? '').join(',') : undefined,
      );
    } catch (error) {
      if (error instanceof ApiValidationError) return <InvalidSelection locale={locale} context="compare" />;
      throw error;
    }
    if (data === null) notFound();
  }

  // Ce que la page montre : l'exemple, ou la sélection de l'adresse.
  const paires = exemple ? exemple.bikes : choisis;
  const sizes: (string | null)[] = exemple ? exemple.sizes : taillesChoisies;

  const cartes: BuildCard[] = data
    ? data.bikes
    : (paires.map((p) => carteDe.get(p)).filter(Boolean) as BuildCard[]);

  /** TOUTE construction d'URL vit ici, côté serveur — l'état, c'est l'URL. */
  const urlCompare = (b: string[], s: (string | null)[], diff: boolean) => {
    const p = new URLSearchParams();
    if (b.length > 0) p.set('bikes', b.join(','));
    if (s.some(Boolean)) p.set('sizes', s.map((x) => x ?? '').join(','));
    if (diff) p.set('diff', '1');
    const qs = p.toString();

    return `/${locale}/compare${qs ? `?${qs}` : ''}`;
  };

  const sansIndex = <T,>(liste: T[], i: number) => liste.filter((_, j) => j !== i);

  // Le sélecteur complète la sélection de l'adresse, jamais l'exemple : depuis la page nue, choisir un vélo démarre SA
  // comparaison, comme avant l'exemple (deux choix pour comparer deux vélos, pas quatre).
  const optionsAjout = catalogue.data
    .map((b) => ({ value: `${b.brand.slug}/${b.slug}`, label: `${b.brand.name} ${b.model_name}` }))
    .filter((o) => !choisis.includes(o.value))
    .map((o) => ({ label: o.label, href: urlCompare([...choisis, o.value], [...taillesChoisies, null], diffOnly) }));

  const sections = data?.sections.map((section) => ({
    ...section,
    rows: diffOnly ? section.rows.filter((r) => r.status !== 'same') : section.rows,
  }));

  // La géométrie sort du tableau : elle a un dessin, une explication qui s'ouvre
  // en place et sa propre grille lisible à 400 px. Les autres sections gardent
  // le rendu générique, aligné sous les cartes.
  const geometrie = sections?.find((s) => s.key === 'geometry') ?? null;
  const autresSections = sections?.filter((s) => s.key !== 'geometry') ?? [];
  const velosDeLaPlanche = cartes.map((bike, i) => ({
    name: `${bike.brand.name} ${bike.model_name}`,
    size: data?.sizes_selected[i] ?? null,
    // Les mêmes URL que le sélecteur de la carte : une seule construction, côté
    // serveur, pour que la taille se choisisse aussi sous les yeux du dessin.
    sizeOptions: bike.sizes.map((label) => ({
      label,
      href: urlCompare(paires, sizes.map((s, j) => (j === i ? label : s)), diffOnly),
    })),
  }));

  // Cartes et données partagent UNE table : c'est ce qui garantit que la
  // colonne d'un vélo tombe sous sa carte. Deux grilles séparées se décalaient
  // dès que la case « ajouter » entrait en jeu.
  const peutAjouter = cartes.length < 3;
  const colonnes = cartes.length + (peutAjouter ? 1 : 0);
  const largeurTotale = 1 + colonnes;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.title}</h1>
        {/* L'exemple se dit exemple : personne ne doit y lire sa propre sélection. Le jaune est celui du logo. */}
        {(cartes.length < 2 || exemple) && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {exemple && (
              <span
                data-compare-example
                className="rounded-full bg-tone-butter px-2.5 py-0.5 text-xs font-semibold text-tone-ink"
              >
                {t.example}
              </span>
            )}
            <span>{t.intro}</span>
          </p>
        )}
      </header>

      {sections && (
        // Un lien, pas un état client : le filtre se partage avec l'URL.
        <div className="flex justify-end">
          <Link
            href={urlCompare(paires, sizes, !diffOnly)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-foreground hover:text-foreground"
          >
            {diffOnly ? t.all_rows : t.diff_only}
          </Link>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] table-fixed border-collapse text-sm">
          {/* `table-fixed` + largeurs déclarées ici : les colonnes ne bougent
              plus avec le contenu, et les trois sections restent alignées. */}
          <colgroup>
            <col className="w-36 sm:w-48" />
            {Array.from({ length: colonnes }, (_, i) => <col key={i} />)}
          </colgroup>

          <thead>
            <tr>
              <td />
              {cartes.map((bike, i) => (
                <th key={`${bike.brand.slug}/${bike.slug}`} scope="col" className="p-1.5 align-top sm:p-2">
                  <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border">
                    <div className="relative aspect-4/3 w-full bg-white">
                      {bike.image && (
                        <Image
                          src={sizeCatalogue(bike.image)}
                          alt={bike.image.alt}
                          width={bike.image.sizes.card.w}
                          height={bike.image.sizes.card.h}
                          className="absolute inset-0 h-full w-full object-contain p-3"
                        />
                      )}
                    </div>
                    <div className="flex grow flex-col gap-1 bg-background px-3 pb-3 pt-2 text-start font-normal">
                      <p className="text-xs text-muted">
                        <bdi>{bike.brand.name}</bdi>
                      </p>
                      <p className="text-sm font-semibold leading-snug">
                        <bdi>{bike.model_name}</bdi>
                      </p>
                      <p className="text-xs text-muted">{bike.year_label}</p>
                      <p className="text-sm font-medium tabular-nums">
                        {bike.msrp_formatted ?? <span className="font-normal italic text-muted">{bike.msrp_label}</span>}
                      </p>

                      <div className="mt-auto flex flex-col gap-2 pt-2">
                        <SizeSelect
                          label={t.size}
                          current={sizes[i]}
                          options={bike.sizes.map((label) => ({
                            label,
                            href: urlCompare(paires, sizes.map((s, j) => (j === i ? label : s)), diffOnly),
                          }))}
                        />
                        <div className="flex items-center justify-between text-xs">
                          <Link
                            href={`/${locale}/bikes/${bike.brand.slug}/${bike.slug}`}
                            className="text-muted underline-offset-2 transition hover:text-foreground hover:underline"
                          >
                            {t.view}
                          </Link>
                          <Link
                            href={urlCompare(sansIndex(paires, i), sansIndex(sizes, i), diffOnly)}
                            className="text-muted underline-offset-2 transition hover:text-foreground hover:underline"
                          >
                            {t.remove}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </th>
              ))}

              {peutAjouter && (
                <th scope="col" className="p-1.5 align-top sm:p-2">
                  <div className="flex h-full min-h-48 flex-col justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-start font-normal">
                    <p className="text-sm font-medium">{t.add}</p>
                    <ComparePicker placeholder={t.search} empty={t.no_match} options={optionsAjout} />
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {autresSections.map((section) => (
            <ComparisonSection
              key={section.key}
              section={section}
              columnCount={largeurTotale}
              canAdd={peutAjouter}
              dash={g.dash}
            />
          ))}
        </table>
      </div>

      {geometrie && (
        <GeometryBlock
          section={geometrie}
          bikes={velosDeLaPlanche}
          glossary={glossaire}
          labels={g}
        />
      )}
    </main>
  );
}
