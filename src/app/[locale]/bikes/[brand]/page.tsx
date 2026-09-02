import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionHeader } from '@/components/collection/CollectionHeader';
import { FacetTiles } from '@/components/collection/FacetTiles';
import { RecentBikes } from '@/components/collection/RecentBikes';
import { isLocale, type Locale } from '@/lib/api';
import { getBrandPage } from '@/lib/api-pages';
import { catalogPath } from '@/lib/routes';

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

/** Libellés d'interface : rien ici ne décrit une donnée, tout arrive traduit de l'API. */
const COPY = {
  'ar-sa': {
    eyebrow: 'الماركة',
    results: 'دراجة',
    categories: 'تصفح حسب الفئة',
    newest: 'أحدث الموديلات',
    all: 'كل دراجات {name}',
    title: 'دراجات {name} — Darraja Bikes',
    description: '{total} دراجة من {name}: المواصفات والهندسة والمقارنة.',
  },
  'en-sa': {
    eyebrow: 'Brand',
    results: 'bikes',
    categories: 'Browse by category',
    newest: 'Newest models',
    all: 'All {name} bikes',
    title: '{name} bikes — Darraja Bikes',
    description: '{total} {name} bikes: specifications, geometry and comparison.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

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
 * Métadonnées MINIMALES, en attendant le helper SEO (canonical, hreflang) :
 * titre et description bilingues. Le noindex reste — décision du 28 août
 * 2026, rien n'est indexé avant que les URL soient figées.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, bucket, page } = await resolve(params);
  const t = COPY[locale];

  return {
    title: t.title.replace('{name}', bucket.label),
    description: t.description
      .replace('{name}', bucket.label)
      .replace('{total}', String(page.meta.total)),
    robots: { index: false, follow: false },
  };
}

export default async function BrandPage({ params }: Props) {
  const { locale, bucket, page } = await resolve(params);
  const t = COPY[locale];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <CollectionHeader
        eyebrow={t.eyebrow}
        title={bucket.label}
        total={page.meta.total}
        results={t.results}
      />

      {/* Les catégories DE LA MARQUE : chaque tuile ouvre le catalogue filtré marque + catégorie. */}
      <FacetTiles
        title={t.categories}
        results={t.results}
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
