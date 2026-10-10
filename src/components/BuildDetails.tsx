import Image from 'next/image';
import Link from 'next/link';
import { BikeGallery } from '@/components/BikeGallery';
import { ComponentList } from '@/components/ComponentList';
import { JsonLd } from '@/components/JsonLd';
import { SizePicker } from '@/components/SizePicker';
import type { AnnotatedConfig } from '@/components/hotspots/AnnotatedPhoto';
import type { Build, Locale } from '@/lib/api';
import { sizeCatalogue } from '@/lib/images';
import { buildBreadcrumbJsonLd, productJsonLd } from '@/lib/jsonld';
import { brandPath } from '@/lib/routes';

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
    highlights: 'المواصفات الرئيسية',
    geometryChart: 'مخطط الهندسة',
    components: 'المكونات',
    freshness: 'آخر تحديث',
    thumbnails: 'صور الدراجة',
    photoOf: 'صورة {n} من {total}',
  },
  'en-sa': {
    measure: 'Measure',
    value: 'Value',
    source: 'As published',
    height: 'Rider height',
    inseam: 'Inseam',
    wheels: 'Wheels',
    geometry: 'Geometry',
    highlights: 'Key specs',
    geometryChart: 'Geometry chart',
    components: 'Components',
    freshness: 'Last updated',
    thumbnails: 'Bike photos',
    photoOf: 'Photo {n} of {total}',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/**
 * Corps de la fiche vélo, extrait de la page (`[locale]/bikes/[brand]/[slug]`)
 * pour qu'une autre route puisse rendre la MEME fiche (aperçu du pilote web #49).
 * Le rendu public est inchangé : vérifié en comparant le HTML de six fiches
 * avant et après l'extraction (décision du 10 octobre 2026).
 *
 * `annotated` : aperçu du pilote seulement. La fiche s'élargit (1264 px) pour laisser aux notes
 * leurs marges autour de la photo — choix à valider par le fondateur sur la planche du Talon.
 */
export function BuildDetails({
  build,
  locale,
  annotated,
}: {
  build: Build;
  locale: Locale;
  annotated?: AnnotatedConfig;
}) {
  const t = COPY[locale];
  // Le contrat marque les lignes nullable (filtrage cote API) : on ne garde
  // que les lignes reelles, sans jamais en fabriquer.
  const highlights = build.highlights.flatMap((h) => (h ? [h] : []));

  return (
    <main className={`mx-auto flex w-full ${annotated ? 'max-w-[1264px]' : 'max-w-4xl'} flex-col gap-8 p-6`}>
      {/* Fil d'Ariane et produit pour Google — tout vient de `build`, sans
          offre ni prix : le MSRP US n'est pas un prix local. */}
      <JsonLd data={buildBreadcrumbJsonLd(locale, build)} />
      <JsonLd data={productJsonLd(locale, build)} />
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-neutral-900 pb-4 dark:border-neutral-100">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60">
            {/* Le nom de la marque mène à sa page — le seul lien « vers le haut » de la fiche. */}
            <Link href={brandPath(locale, build.brand.slug)} className="hover:underline">
              <bdi>{build.brand.name}</bdi>
            </Link>
            {' · '}
            <bdi>{build.family.name}</bdi>
          </p>
          {/* <bdi> : sans lui, un nom qui finit par un signe (« Borrego+ »,
              « Ponto Go! », « Precaliber 20\" ») voit ce signe passer a gauche
              dans une page RTL — 11 modeles du catalogue sont concernes. */}
          <h1 className="text-3xl font-extrabold tracking-tight text-balance">
            <bdi>{build.model_name}</bdi>
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

      {/* Ancres de fiche (structure 99 Spokes) : la page est longue, le
          lecteur saute a la section qui l'interesse. Liens purs, zero JS. */}
      <nav className="sticky top-0 z-10 -mx-6 flex gap-5 border-b border-border bg-background px-6 py-2 font-mono text-xs uppercase tracking-widest">
        <a href="#highlights" className="opacity-60 transition hover:opacity-100">
          {t.highlights}
        </a>
        <a href="#geometry" className="opacity-60 transition hover:opacity-100">
          {t.geometry}
        </a>
        <a href="#components" className="opacity-60 transition hover:opacity-100">
          {t.components}
        </a>
      </nav>

      <BikeGallery
        images={build.images}
        annotated={annotated}
        labels={{
          thumbnails: t.thumbnails,
          // Composes ici, cote serveur : une fonction ne franchit pas la
          // frontiere vers un Client Component.
          photoLabels: build.images.map((_, i) =>
            t.photoOf.replace('{n}', String(i + 1)).replace('{total}', String(build.images.length)),
          ),
        }}
      />

      {highlights.length > 0 && (
        <section id="highlights" className="flex flex-col gap-3 scroll-mt-12">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60">
            {t.highlights}
          </h2>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
            {highlights.map((h) => (
              <div key={h.key} className="contents">
                <dt className="text-sm font-semibold">{h.label}</dt>
                <dd className="text-sm text-muted">{h.description}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section id="geometry" className="flex flex-col gap-4 scroll-mt-12">
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

        {/* Le schema de geometrie illustre le tableau de cotes : il vit ici, et
            jamais dans le carrousel produit. Toutes les marques n'en publient
            pas — Specialized oui, Trek non. */}
        {build.geometry_chart && (
          <figure className="flex flex-col gap-2">
            <figcaption className="font-mono text-[11px] uppercase tracking-widest opacity-75">
              {t.geometryChart}
            </figcaption>
            <Image
              src={sizeCatalogue(build.geometry_chart)}
              alt={build.geometry_chart.alt}
              width={build.geometry_chart.sizes.detail.w}
              height={build.geometry_chart.sizes.detail.h}
              className="h-auto w-full max-w-2xl border border-neutral-200 bg-white object-contain dark:border-neutral-800"
            />
          </figure>
        )}
      </section>

      <section id="components" className="flex flex-col gap-4 scroll-mt-12">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60">
          {t.components}
        </h2>
        <ComponentList components={build.components} />
      </section>

      {/*
       * Le libelle formate par Laravel, jamais `last_changed_at` : depuis
       * api #13 c'est un horodatage ISO 8601 pour le sitemap, pas un texte.
       */}
      {build.freshness.last_changed_label !== null && (
        <footer className="border-t border-neutral-200 pt-4 font-mono text-xs opacity-75 dark:border-neutral-800">
          {t.freshness} : {build.freshness.last_changed_label}
        </footer>
      )}
    </main>
  );
}
