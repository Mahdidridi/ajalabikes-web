import Link from 'next/link';
import { BikeGallery, type GalleryAnnotation } from '@/components/BikeGallery';
import { ComponentList } from '@/components/ComponentList';
import { EquipmentSpecs, equipmentTitle, hasEquipment } from '@/components/EquipmentSpecs';
import { GeometryMatrix } from '@/components/GeometryMatrix';
import { JsonLd } from '@/components/JsonLd';
import { SectionNav, type SectionNavItem } from '@/components/SectionNav';
import { SimilarBikes, hasSimilar, similarTitle } from '@/components/SimilarBikes';
import type { Build, GeometryGlossary, Locale, SimilarBuilds } from '@/lib/api';
import { GEOMETRY_COPY } from '@/lib/geometry-copy';
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
    components: 'Components',
    freshness: 'Last updated',
    thumbnails: 'Bike photos',
    photoOf: 'Photo {n} of {total}',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/** Le titre de chaque bloc de la fiche : un seul style pour les quatre, repris par `EquipmentSpecs` et `SimilarBikes`. */
export const SECTION_TITLE = 'text-2xl font-bold tracking-tight';

/**
 * Corps de la fiche vélo, extrait de la page (`[locale]/bikes/[brand]/[slug]`) le 10 octobre 2026
 * pour l'aperçu du pilote web #49, retiré le 14 octobre 2026 (phase 4.1 de web #52) : la page
 * publique est désormais sa seule route. Le rendu public n'avait pas changé à l'extraction (HTML de
 * six fiches comparé avant et après).
 *
 * STRUCTURE DU BAS DE PAGE — décision du fondateur du 14 octobre 2026 (web #65), validée sur une
 * maquette arabe de la fiche du Giant Talon 1. Dans la colonne centrale, de haut en bas : la photo
 * annotée, inchangée ; la barre d'ancres, SOUS la photo, collante, le bloc courant souligné
 * (`SectionNav`) ; puis Équipements, Composants, Géométrie, Vélos proches. La page se lit du résumé
 * vérifié au détail. Deux blocs ont disparu le même jour : « Specs clés » (il répétait les notes de la
 * photo et les équipements) et la silhouette Specialized servie dans `geometry_chart` (décision du
 * 13 septembre 2026 : une silhouette sans cote n'est pas un schéma ; le document officiel viendra avec
 * web #30 — le champ reste dans le contrat, il n'est plus rendu). La colonne ne s'élargit pas : la fiche
 * garde ses 896 px, 1264 px avec la photo annotée.
 *
 * `annotated` : la photo de tête annotée (`headAnnotation`), composée par la page avec les notes
 * servies par l'API (web #52). La fiche s'élargit alors à 1264 px pour laisser aux notes leurs
 * marges autour de la photo (décision du fondateur du 12 octobre 2026) ; sans notes, elle garde
 * ses 896 px.
 *
 * `similar` : les vélos proches servis par l'API (web #35), lus par la page publique en même temps que la fiche.
 * Sans vélo proche, ni bloc ni ancre.
 *
 * `glossary` : le glossaire des cotes (api #41), lu en même temps que la fiche pour les explications « ? » du bloc
 * Géométrie (web #66) ; nul en cas de panne, et la fiche se rend sans boutons « ? ».
 */
export function BuildDetails({
  build,
  locale,
  annotated,
  similar,
  glossary,
}: {
  build: Build;
  locale: Locale;
  annotated?: GalleryAnnotation;
  similar?: SimilarBuilds | null;
  glossary?: GeometryGlossary | null;
}) {
  const t = COPY[locale];

  // Une ancre par bloc présent, dans l'ordre de la page : la même règle (`hasEquipment`, `hasSimilar`)
  // décide du bloc ET de son ancre.
  const sections: SectionNavItem[] = [
    ...(hasEquipment(build.equipment_specs) ? [{ href: '#equipment' as const, label: equipmentTitle(locale) }] : []),
    { href: '#components', label: t.components },
    { href: '#geometry', label: t.geometry },
    ...(hasSimilar(similar) ? [{ href: '#similar' as const, label: similarTitle(locale) }] : []),
  ];

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

      {/* La barre d'ancres, sous la photo : la page est longue, le lecteur saute au bloc qui l'intéresse. */}
      <SectionNav items={sections} />

      {/* Le résumé vérifié d'abord (web #36) : les valeurs normalisées par Laravel, avec leur preuve. La liste brute du
          constructeur suit, dans « Components » : les deux blocs coexistent. Sans valeur courante, ni bloc ni ancre. */}
      <EquipmentSpecs data={build.equipment_specs} locale={locale} />

      <section id="components" className="flex flex-col gap-4 scroll-mt-16">
        <h2 className={SECTION_TITLE}>{t.components}</h2>
        <ComponentList components={build.components} />
      </section>

      <section id="geometry" className="flex flex-col gap-4 scroll-mt-16">
        <h2 className={SECTION_TITLE}>{t.geometry}</h2>
        {/* Toutes les tailles, le dessin de la taille choisie à gauche (web #66). Les libellés du dessin et du glossaire
            sont ceux du comparateur ; le titre du dessin est celui du bloc. */}
        <GeometryMatrix
          sizes={build.sizes}
          bikeName={`${build.brand.name} ${build.model_name}`}
          glossary={glossary ?? null}
          labels={{
            ...GEOMETRY_COPY[locale],
            title: t.geometry,
            measure: t.measure,
            value: t.value,
            source: t.source,
            wheels: t.wheels,
            height: t.height,
            inseam: t.inseam,
          }}
        />
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
