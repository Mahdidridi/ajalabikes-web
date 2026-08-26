import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ComparePicker } from '@/components/ComparePicker';
import { SizeSelect } from '@/components/SizeSelect';
import { getCatalog, getCompare, isLocale, type BuildCard, type Locale } from '@/lib/api';
import { sizeCatalogue } from '@/lib/images';

/** Libellés d'interface uniquement — toute DONNÉE arrive déjà localisée de l'API. */
const COPY = {
  'ar-sa': {
    title: 'قارن الدراجات',
    intro: 'أضف دراجتين أو ثلاث دراجات لمقارنتها جنبًا إلى جنب.',
    add: 'أضف دراجة',
    search: 'ابحث عن دراجة…',
    no_match: 'لا نتائج.',
    remove: 'إزالة',
    view: 'عرض التفاصيل',
    size: 'اختر المقاس',
    diff_only: 'الاختلافات فقط',
    all_rows: 'كل الصفوف',
    dash: '—',
  },
  'en-sa': {
    title: 'Compare bikes',
    intro: 'Add two or three bikes to compare them side by side.',
    add: 'Add a bike',
    search: 'Find a bike…',
    no_match: 'No match.',
    remove: 'Remove',
    view: 'View details',
    size: 'Choose size',
    diff_only: 'Differences only',
    all_rows: 'All rows',
    dash: '—',
  },
} as const;

export default async function ComparePage({ params, searchParams }: PageProps<'/[locale]/compare'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = COPY[locale as Locale];

  const q = await searchParams;
  const brut = typeof q.bikes === 'string' ? q.bikes : '';
  const paires = brut.split(',').filter(Boolean).slice(0, 3);
  const sizesBrut = typeof q.sizes === 'string' ? q.sizes : '';
  const sizes = paires.map((_, i) => sizesBrut.split(',')[i] || null);
  const diffOnly = q.diff === '1';

  // Les 98 cartes alimentent le sélecteur ET les colonnes avant que la
  // comparaison existe (un seul vélo choisi). Un appel, celui du catalogue.
  const catalogue = await getCatalog(locale, { per_page: '800' });
  const carteDe = new Map(catalogue.data.map((b) => [`${b.brand.slug}/${b.slug}`, b]));

  // La comparaison n'existe qu'à partir de deux vélos — l'API le garantit.
  const data = paires.length >= 2
    ? await getCompare(locale, paires.join(','), sizes.some(Boolean) ? sizes.map((s) => s ?? '').join(',') : undefined)
    : null;
  if (paires.length >= 2 && data === null) notFound();

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

  const optionsAjout = catalogue.data
    .map((b) => ({ value: `${b.brand.slug}/${b.slug}`, label: `${b.brand.name} ${b.model_name}` }))
    .filter((o) => !paires.includes(o.value))
    .map((o) => ({ label: o.label, href: urlCompare([...paires, o.value], [...sizes, null], diffOnly) }));

  const sections = data?.sections.map((section) => ({
    ...section,
    rows: diffOnly ? section.rows.filter((r) => r.status !== 'same') : section.rows,
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
        {cartes.length < 2 && <p className="text-sm text-muted">{t.intro}</p>}
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
                      <p className="text-xs text-muted">{bike.brand.name}</p>
                      <p className="text-sm font-semibold leading-snug">{bike.model_name}</p>
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

          {sections?.map((section) => (
            <tbody key={section.key}>
              <tr>
                {/* `rowgroup` : ces titres coiffent un groupe de LIGNES, pas de
                    colonnes. Le `h2` reste un vrai titre — sans lui, la page
                    n'a plus qu'un seul niveau et la navigation par titres
                    d'un lecteur d'écran ne mène nulle part. */}
                <th scope="rowgroup" colSpan={largeurTotale} className="pb-2 pt-6 text-start">
                  <h2 className="text-lg font-bold">{section.label}</h2>
                </th>
              </tr>

              {section.requires_sizes && section.hint && (
                <tr>
                  <td colSpan={largeurTotale}>
                    <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
                      {section.hint}
                    </p>
                  </td>
                </tr>
              )}

              {section.rows.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <th scope="row" className="py-2 pe-3 text-start align-top text-xs font-medium text-muted">
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`whitespace-pre-line px-2 py-2 align-top tabular-nums ${
                        row.status === 'differs' ? 'font-medium' : ''
                      }`}
                    >
                      {cell === null ? (
                        <span className="text-muted">{t.dash}</span>
                      ) : (
                        <>
                          {/* `dir="auto"` isole chaque valeur : « 80 mm (492 mm
                              axle-to-crown) » s'affichait « mm (…) 80 » en RTL,
                              l'algorithme bidi détachant le nombre de tête. */}
                          <span dir="auto">{cell.formatted}</span>
                          {cell.original !== null && cell.original !== cell.formatted && (
                            <span className="ms-2 text-xs text-muted" dir="ltr">
                              {cell.original}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  ))}
                  {peutAjouter && <td />}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </main>
  );
}
