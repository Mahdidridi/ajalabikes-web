/** @jsxImportSource react */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { HomeCategories } from '@/components/home/HomeCategories';
import { HomeNewest } from '@/components/home/HomeNewest';
import { CatalogFilters } from '@/components/CatalogFilters';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import type { BuildCard, Facets } from '@/lib/api';

// Rendu statique : les contextes fournissent l URL, aucune navigation n est simulee.
const noNavigation = () => { throw new Error('Aucune navigation attendue dans ce rendu statique'); };
const router = {
  back: noNavigation, forward: noNavigation, refresh: noNavigation,
  push: noNavigation, replace: noNavigation, prefetch: noNavigation, bfcacheId: 'fixture',
};

for (const locale of ['en-sa', 'ar-sa'] as const) {
  test(`${locale} : une facette sans categorie garde le catalogue filtre`, async ({ page }) => {
    const categories: Facets['categories'] = [
      { key: 'uncategorized', label: locale === 'en-sa' ? 'Not categorised' : 'غير مصنّف', count: 1 },
      { key: 'road', label: locale === 'en-sa' ? 'Road' : 'دراجات هوائية للطرق', count: 2 },
    ];
    await page.setContent(renderToStaticMarkup(<main><HomeCategories locale={locale} categories={categories} /></main>));
    const tile = page.getByRole('link').filter({ has: page.getByText(categories[0].label, { exact: true }) });
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAttribute('href', `/${locale}/bikes?category=uncategorized`);
    await expect(page.locator(`a[href="/${locale}/uncategorized-bikes"]`)).toHaveCount(0);
    await expect(page.locator(`a[href="/${locale}/road-bikes"]`)).toHaveCount(1);
  });

  test(`${locale} : le filtre rend et selectionne la facette sans categorie`, async ({ page }) => {
    const label = locale === 'en-sa' ? 'Not categorised' : 'غير مصنّف';
    const facets: Facets = {
      categories: [{ key: 'uncategorized', label, count: 2 }],
      brands: [], wheel_sizes: [], price: null,
    };
    await page.setContent(renderToStaticMarkup(
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value={`/${locale}/bikes`}>
          <SearchParamsContext.Provider value={new URLSearchParams('category=uncategorized')}>
            <CatalogFilters facets={facets} labels={{
              brand: 'Brand', category: 'Category', wheelSize: 'Wheels', sort: 'Sort', reset: 'Reset', sortOptions: [],
            }} />
          </SearchParamsContext.Provider>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>,
    ));
    const category = page.getByLabel('Category', { exact: true });
    await expect(category).toBeVisible();
    await expect(category).toHaveValue('uncategorized');
    await expect(category.locator('option[value="uncategorized"]')).toHaveText(`${label} (2)`);
  });
}

test('une carte sans photo garde sa place et son lien dans l apercu', async ({ page }) => {
  const bike: BuildCard = {
    slug: 'sans-photo', model_name: 'Sans photo',
    brand: { slug: 'trek', name: 'Trek' }, family: { key: 'test', name: 'Test', slug: 'test' },
    category: null, indexable: false, indexable_reasons: ['no_product_photo'],
    year: null, year_label: 'Year not recorded', model_path: '/en-sa/bikes/trek/sans-photo',
    msrp_formatted: null, msrp_amount_minor: null, msrp_currency: null, msrp_label: 'Price not recorded',
    image: null, sizes: [], wheel_size: null, last_changed_at: '2026-10-03T00:00:00Z',
  };
  await page.setContent(renderToStaticMarkup(<main><HomeNewest locale="en-sa" bikes={[bike]} /></main>));
  const cards = page.locator('main a.rounded-xl').filter({ has: page.locator('h2') });
  await expect(cards).toHaveCount(1);
  await expect(cards.locator('h2')).toHaveText('Sans photo');
  await expect(cards).toHaveAttribute('href', '/en-sa/bikes/trek/sans-photo');
  await expect(cards.locator('img')).toHaveCount(0);
});
