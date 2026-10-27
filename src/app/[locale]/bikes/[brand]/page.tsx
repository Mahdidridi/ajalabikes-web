import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { CollectionHeader } from '@/components/collection/CollectionHeader';
import { FacetTiles } from '@/components/collection/FacetTiles';
import { RecentBikes } from '@/components/collection/RecentBikes';
import { isLocale, type Locale } from '@/lib/api';
import { getBrandPage, type BrandBucket } from '@/lib/api-pages';
import { brandBreadcrumbJsonLd } from '@/lib/jsonld';
import { catalogPath } from '@/lib/routes';
import { seoFor } from '@/lib/seo';
import { bikesCount } from '@/lib/vocabulary';

/**
 * La page d'une marque : `/{locale}/bikes/{brand}` — décision du 2 septembre
 * 2026 (rapport SEO, § 1). Tout ce qu'elle montre vient d'UN appel au
 * catalogue filtré : le nom de la marque, son total, ses catégories (facette
 * filtrée) et ses vélos les plus récents.
 *
 * Rendue au premier appel, puis servie du cache : le tag `catalog` porté par
 * `getCatalog` la fait re-rendre quand l'API le demande, les 24 h sont un
 * filet. `generateStaticParams` vide : sans lui, même vide, Next rendrait la
 * route à chaque requête — même schéma que la fiche.
 */
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/**
 * Libellés d'interface : rien ici ne décrit une donnée, tout arrive traduit de
 * l'API. En arabe, le générique est « دراجة / دراجات » (`src/lib/vocabulary.ts`) ;
 * la description garde le registre formel en second, jamais « دراجة » nue.
 * `{count}` est le total accordé (`bikesCount`), `{name}` le nom de la marque.
 */
const COPY = {
  'ar-sa': {
    eyebrow: 'الماركة',
    categories: 'تصفح حسب الفئة',
    newest: 'أحدث الموديلات',
    all: 'كل دراجات {name}',
    title: 'دراجات {name}',
    description:
      '{count} من {name}: المواصفات الكاملة والهندسة حسب المقاس ومقارنة الدراجات الهوائية جنبًا إلى جنب.',
  },
  'en-sa': {
    eyebrow: 'Brand',
    categories: 'Browse by category',
    newest: 'Newest models',
    all: 'All {name} bikes',
    title: '{name} bikes',
    description: '{count} by {name}: specifications, geometry and side-by-side comparison.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/**
 * Le nom de la marque dans le TITRE de la page. En arabe, ses lettres arabes
 * quand l'API les connait (`name_ar`) : « دراجات كانيون » — decision du
 * fondateur du 27 octobre 2026, c'est ainsi qu'on la tape en Arabie (meme
 * regle que le titre de la fiche, `bikePageTitle`). Sinon, et en anglais, le
 * nom latin. Le H1, la description et le fil d'Ariane gardent le nom latin.
 */
const TITLE_NAME: Record<Locale, (bucket: BrandBucket) => string> = {
  'ar-sa': (bucket) => bucket.name_ar ?? bucket.label,
  'en-sa': (bucket) => bucket.label,
};

type Props = PageProps<'/[locale]/bikes/[brand]'>;

/** Résout la marque de l'URL, ou rend 404 — partagé par la page et ses métadonnées. */
async function resolve(params: Props['params']) {
  const { locale, brand } = await params;
  if (!isLocale(locale)) notFound();

  const result = await getBrandPage(locale, brand);
  if (!result) notFound();

  return { locale, ...result };
}

/**
 * Canonical, hreflang et titre par le helper SEO ; la politique robots est
 * l'`indexable` de la facette, decide par l'API (seuil de 5 velos, le meme que
 * les fiches) — sauf si le verrou (`INDEXING_LOCKED`) referme tout.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, bucket, page } = await resolve(params);
  const t = COPY[locale];

  return seoFor({
    locale,
    path: `/bikes/${bucket.key}`,
    title: t.title.replace('{name}', TITLE_NAME[locale](bucket)),
    description: t.description
      .replace('{name}', bucket.label)
      .replace('{count}', bikesCount(locale, page.meta.total)),
    indexable: bucket.indexable,
  });
}

export default async function BrandPage({ params }: Props) {
  const { locale, bucket, page } = await resolve(params);
  const t = COPY[locale];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd data={brandBreadcrumbJsonLd(locale, { name: bucket.label, slug: bucket.key })} />
      <CollectionHeader locale={locale} eyebrow={t.eyebrow} title={bucket.label} total={page.meta.total} />

      {/* Les catégories DE LA MARQUE : chaque tuile ouvre le catalogue filtré marque + catégorie. */}
      <FacetTiles
        locale={locale}
        title={t.categories}
        tiles={page.facets.categories.map((c) => ({
          ...c,
          href: catalogPath(locale, { brand: bucket.key, category: c.key }),
        }))}
      />

      <RecentBikes
        locale={locale}
        title={t.newest}
        bikes={page.data}
        viewAll={{
          label: t.all.replace('{name}', bucket.label),
          href: catalogPath(locale, { brand: bucket.key }),
        }}
      />
    </main>
  );
}
