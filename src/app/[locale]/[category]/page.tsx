import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionHeader } from '@/components/collection/CollectionHeader';
import { FacetTiles } from '@/components/collection/FacetTiles';
import { RecentBikes } from '@/components/collection/RecentBikes';
import { isLocale, type Locale } from '@/lib/api';
import { getCategoryPage } from '@/lib/api-pages';
import { catalogPath, categoryKeyOf } from '@/lib/routes';

/**
 * La page d'une catégorie : `/{locale}/{category}-bikes` (`road` →
 * `/en-sa/road-bikes`, `e_mtb` → `/ar-sa/e-mtb-bikes`) — décision du
 * 2 septembre 2026 (rapport SEO, § 1), à la racine de la locale pour ne jamais
 * entrer en collision avec un slug de marque. Le slug est PROVISOIRE, dérivé
 * de la clé API dans `src/lib/routes.ts`.
 *
 * Ce segment dynamique est servi en dernier : `bikes`, `compare` et `finder`
 * gagnent parce que Next préfère un segment littéral (vérifié par
 * `tests/e2e/brand-category.spec.ts`) ; tout ce qui n'est pas une catégorie
 * réelle de l'API rend 404 — le seau `uncategorized` compris.
 *
 * Même schéma de cache que la fiche et la page marque.
 */
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** Libellés d'interface : rien ici ne décrit une donnée, tout arrive traduit de l'API. */
const COPY = {
  'ar-sa': {
    eyebrow: 'الفئة',
    results: 'دراجة',
    brands: 'تصفح حسب الماركة',
    newest: 'أحدث الموديلات',
    all: 'كل الدراجات في هذه الفئة',
    title: 'دراجات {name} — Darraja Bikes',
    description: '{total} دراجة في فئة {name}: المواصفات والهندسة والمقارنة.',
  },
  'en-sa': {
    eyebrow: 'Category',
    results: 'bikes',
    brands: 'Browse by brand',
    newest: 'Newest models',
    all: 'All {name} bikes',
    title: '{name} bikes — Darraja Bikes',
    description: '{total} {name} bikes: specifications, geometry and comparison.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

type Props = PageProps<'/[locale]/[category]'>;

/**
 * Résout le segment en catégorie, ou rend 404 — partagé par la page et ses
 * métadonnées. Un segment qui n'a pas la forme `{clé}-bikes` ne coûte aucun
 * appel à l'API.
 */
async function resolve(params: Props['params']) {
  const { locale, category } = await params;
  if (!isLocale(locale)) notFound();

  const key = categoryKeyOf(category);
  if (!key) notFound();

  const result = await getCategoryPage(locale, key);
  if (!result) notFound();

  return { locale, key, ...result };
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

export default async function CategoryPage({ params }: Props) {
  const { locale, key, bucket, page } = await resolve(params);
  const t = COPY[locale];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <CollectionHeader
        eyebrow={t.eyebrow}
        title={bucket.label}
        total={page.meta.total}
        results={t.results}
      />

      {/* Les marques présentes DANS la catégorie, comptées dans la catégorie :
          chaque tuile ouvre le catalogue filtré marque + catégorie. */}
      <FacetTiles
        title={t.brands}
        results={t.results}
        tiles={page.facets.brands.map((b) => ({
          ...b,
          href: catalogPath(locale, { brand: b.key, category: key }),
        }))}
      />

      <RecentBikes
        locale={locale}
        title={t.newest}
        bikes={page.data}
        viewAll={{
          label: t.all.replace('{name}', bucket.label),
          href: catalogPath(locale, { category: key }),
        }}
      />
    </main>
  );
}
