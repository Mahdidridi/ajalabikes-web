import Image from 'next/image';
import Link from 'next/link';
import { BikeGallery, type GalleryAnnotation } from '@/components/BikeGallery';
import { ComponentList } from '@/components/ComponentList';
import { EquipmentSpecs, equipmentTitle, hasEquipment } from '@/components/EquipmentSpecs';
import { JsonLd } from '@/components/JsonLd';
import { SimilarBikes, hasSimilar, similarTitle } from '@/components/SimilarBikes';
import { SizePicker } from '@/components/SizePicker';
import type { Build, Locale, SimilarBuilds } from '@/lib/api';
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
 * Corps de la fiche vélo, extrait de la page (`[locale]/bikes/[brand]/[slug]`) le 10 octobre 2026
 * pour l'aperçu du pilote web #49, retiré le 14 octobre 2026 (phase 4.1 de web #52) : la page
 * publique est désormais sa seule route. Le rendu public n'avait pas changé à l'extraction (HTML de
 * six fiches comparé avant et après).
 *
 * `annotated` : la photo de tête annotée (`headAnnotation`), composée par la page avec les notes
 * servies par l'API (web #52). La fiche s'élargit alors à 1264 px pour laisser aux notes leurs
 * marges autour de la photo (décision du fondateur du 12 octobre 2026) ; sans notes, elle garde
 * ses 896 px.
 *
 * `similar` : les vélos proches servis par l'API (web #35), lus par la page publique en même temps que la fiche.
 * Sans vélo proche, ni bloc ni ancre.
 */
export function BuildDetails({
  build,
  locale,
  annotated,
  similar,
}: {
  build: Build;
  locale: Locale;
  annotated?: GalleryAnnotation;
  similar?: SimilarBuilds | null;
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
          lecteur saute a la section qui l'interesse. Liens purs, zero JS.
          `flex-wrap` : avec l'ancre des velos proches (web #35), quatre liens ne
          tiennent plus sur une ligne a 320 px en anglais (336 px mesures) ; la
          barre passe a la ligne plutot que d'elargir la page (regle du 11 octobre).
          `gap-y-2` : 24 px entre deux rangees de liens, la cible tactile minimale.
          Sur deux rangees, la barre mesure 57 px (Pixel 7, anglais) : les sections
          gardent `scroll-mt-16` (64 px), sinon le saut cachait leur titre dessous. */}
      <nav className="sticky top-0 z-10 -mx-6 flex flex-wrap gap-x-5 gap-y-2 border-b border-border bg-background px-6 py-2 font-mono text-xs uppercase tracking-widest">
        <a href="#highlights" className="opacity-60 transition hover:opacity-100">
          {t.highlights}
        </a>
        <a href="#geometry" className="opacity-60 transition hover:opacity-100">
          {t.geometry}
        </a>
        {hasEquipment(build.equipment_specs) && (
          <a href="#equipment" className="opacity-60 transition hover:opacity-100">
            {equipmentTitle(locale)}
          </a>
        )}
        <a href="#components" className="opacity-60 transition hover:opacity-100">
          {t.components}
        </a>
        {hasSimilar(similar) && (
          <a href="#similar" className="opacity-60 transition hover:opacity-100">
            {similarTitle(locale)}
          </a>
        )}
      </nav>

      <BikeGallery
        images={build.images}
        // Clé posée seulement sur une fiche annotée : `annotated={undefined}` écrirait
        // `"annotated":"$undefined"` dans la charge RSC de chaque fiche sans notes (relecture du 10 octobre 2026).
        {...(annotated && { annotated })}
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
        <section id="highlights" className="flex flex-col gap-3 scroll-mt-16">
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

      <section id="geometry" className="flex flex-col gap-4 scroll-mt-16">
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

      {/* Les valeurs normalisées par Laravel, avec leur preuve (web #36). La liste brute du constructeur reste
          dessous, dans « Components » : les deux blocs coexistent. Sans valeur courante, ni bloc ni ancre. */}
      <EquipmentSpecs data={build.equipment_specs} locale={locale} />

      <section id="components" className="flex flex-col gap-4 scroll-mt-16">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60">
          {t.components}
        </h2>
        <ComponentList components={build.components} />
      </section>

      {similar && <SimilarBikes data={similar} locale={locale} />}

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
