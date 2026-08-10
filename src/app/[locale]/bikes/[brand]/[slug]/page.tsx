import { notFound } from 'next/navigation';
import { SizePicker } from '@/components/SizePicker';
import { getBuild, isLocale, type Locale } from '@/lib/api';

/**
 * Libelles d'interface. Ils ne decrivent aucune donnee : tout ce qui vient de
 * l'API arrive deja traduit et mis en forme.
 */
const COPY = {
  'ar-sa': {
    measure: 'القياس',
    value: 'القيمة',
    source: 'كما نشرتها الشركة',
    height: 'طول الراكب',
    inseam: 'طول الساق',
    wheels: 'العجلات',
    geometry: 'الهندسة',
    components: 'المكونات',
    freshness: 'آخر تحديث',
  },
  'en-sa': {
    measure: 'Measure',
    value: 'Value',
    source: 'As published',
    height: 'Rider height',
    inseam: 'Inseam',
    wheels: 'Wheels',
    geometry: 'Geometry',
    components: 'Components',
    freshness: 'Last updated',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export default async function BuildPage({ params }: PageProps<'/[locale]/bikes/[brand]/[slug]'>) {
  const { locale, brand, slug } = await params;
  if (!isLocale(locale)) notFound();

  const build = await getBuild(locale, brand, slug);
  if (!build) notFound();

  const t = COPY[locale];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-neutral-900 pb-4 dark:border-neutral-100">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60">
            {build.brand.name} · {build.family.name}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-balance">
            {build.model_name}
          </h1>
          <p className="mt-2 inline-block border border-dashed border-neutral-400 px-2 py-1 font-mono text-xs opacity-70 dark:border-neutral-600">
            {build.year_label}
          </p>
        </div>

        <div className="text-end">
          {build.msrp ? (
            <>
              <p className="font-mono text-2xl font-bold tabular-nums">{build.msrp.formatted}</p>
              {/* L'avertissement accompagne toujours un MSRP : ce n'est pas un prix local. */}
              <p className="mt-1 max-w-56 text-xs text-amber-800 dark:text-amber-500">
                {build.msrp.disclaimer}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg italic opacity-60">{build.msrp_label}</p>
              {/* Un prix absent dit pourquoi il l'est. Jamais zero, jamais une estimation. */}
              <p className="mt-1 max-w-56 text-xs text-amber-800 dark:text-amber-500">
                {build.msrp_absent_reason}
              </p>
            </>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60">
          {t.geometry}
        </h2>
        <SizePicker
          sizes={build.sizes}
          labels={{
            height: t.height,
            inseam: t.inseam,
            wheels: t.wheels,
            measure: t.measure,
            value: t.value,
            source: t.source,
          }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60">
          {t.components}
        </h2>
        <dl className="grid grid-cols-[minmax(140px,auto)_1fr] text-sm">
          {build.components.map((c) => (
            <div key={c.key} className="contents">
              <dt className="border-b border-neutral-200 py-2 pe-3 opacity-70 dark:border-neutral-800">
                {c.label}
              </dt>
              {/* Description constructeur : jamais traduite. */}
              <dd className="border-b border-neutral-200 py-2 font-mono text-xs dark:border-neutral-800">
                {c.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t border-neutral-200 pt-4 font-mono text-xs opacity-50 dark:border-neutral-800">
        {t.freshness} : {build.freshness.last_changed_at}
      </footer>
    </main>
  );
}
