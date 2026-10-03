import { randomUUID } from 'node:crypto';
import type { Page, Response, TestInfo } from '@playwright/test';
import { expect, test } from './fixtures/error-app';

const LOCALES = [
  { locale: 'ar-sa', lang: 'ar', dir: 'rtl', missing: 'الصفحة غير موجودة', error: 'تعذّر تحميل الصفحة', retry: 'إعادة المحاولة', catalog: 'الدراجات الهوائية' },
  { locale: 'en-sa', lang: 'en', dir: 'ltr', missing: 'Page not found', error: 'Unable to load this page', retry: 'Try again', catalog: 'Bikes' },
] as const;

function assertNotFound(response: Response | null) {
  expect(response?.status()).toBe(404);
  expect(response?.headers()['location']).toBeUndefined();
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(response?.request().redirectedFrom()).toBeNull();
}

async function assertShell(page: Page, locale: typeof LOCALES[number]) {
  await expect(page.locator('html')).toHaveAttribute('lang', locale.lang);
  await expect(page.locator('html')).toHaveAttribute('dir', locale.dir);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.locator(`main a[href="/${locale.locale}"]`)).toBeVisible();
  await expect(page.locator(`main a[href="/${locale.locale}/bikes"]`)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}

for (const locale of LOCALES) {
  test(`${locale.locale}: unknown bike, brand and category keep a translated 404`, async ({ page }, info) => {
    for (const path of ['bikes/trek/nexiste-pas', 'bikes/nexiste-pas', 'e-mtb-bikes', 'nexiste-pas', 'missing/nested', 'bikes/trek/nexiste-pas/extra']) {
      assertNotFound(await page.goto(`/${locale.locale}/${path}`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale.missing);
      await assertShell(page, locale);
    }
    await screenshot(page, info, `404-${locale.locale}`);
    await page.locator(`main a[href="/${locale.locale}/bikes"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale.locale}/bikes$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale.catalog);
  });

  test(`${locale.locale}: API failure stays private and retry recovers`, async ({ page, errorApp }, info) => {
    errorApp.fail(true);
    try {
      const response = await page.goto(`/${locale.locale}/bikes?brand=${randomUUID()}`);
      expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale.error);
      await assertShell(page, locale);
      await expect(page.locator('body')).not.toContainText(/PRIVATE_UPSTREAM_DETAIL|API 503|digest|Application error/);
      await screenshot(page, info, `error-${locale.locale}`);
      errorApp.fail(false);
      await page.getByRole('button', { name: locale.retry, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale.catalog);
    } finally {
      errorApp.fail(false);
    }
  });

  test(`${locale.locale}: an uncached bike API 503 keeps HTTP 500 and a bilingual retry`, async ({ page, errorApp }, info) => {
    errorApp.fail(true);
    try {
      const response = await page.goto(`/${locale.locale}/bikes/trek/${randomUUID()}`);
      expect(response?.status()).toBe(500);
      expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
      for (const language of LOCALES) {
        await expect(page.getByRole('heading', { name: language.error, exact: true })).toBeVisible();
      }
      await expect(page.getByRole('button', { name: locale.retry, exact: true })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/PRIVATE_UPSTREAM_DETAIL|API 503/);
      await screenshot(page, info, `500-${locale.locale}`);
      errorApp.fail(false);
      const recovery = page.waitForResponse((res) => res.request().isNavigationRequest());
      await page.getByRole('button', { name: locale.retry, exact: true }).click();
      assertNotFound(await recovery);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale.missing);
    } finally {
      errorApp.fail(false);
    }
  });
}

test('unsupported locales and unmatched routes return a bilingual 404 without redirecting', async ({ page }, info) => {
  for (const path of ['/xx-yy/abc', '/n-importe-quoi', '/xx-yy/bikes/trek/nexiste-pas', '/missing/nested/path/extra/segment']) {
    assertNotFound(await page.goto(path));
    await expect(page.getByRole('heading', { name: 'الصفحة غير موجودة', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
    await expect(page.locator('section[lang="ar"][dir="rtl"]')).toBeVisible();
    await expect(page.locator('section[lang="en"][dir="ltr"]')).toBeVisible();
    await expect(page.locator('main a[href="/ar-sa"]')).toBeVisible();
    await expect(page.locator('main a[href="/en-sa"]')).toBeVisible();
  }
  await screenshot(page, info, '404-bilingual');
});

test('standalone error documents preserve the saved theme', async ({ page, errorApp }, info) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  assertNotFound(await page.goto('/xx-yy/abc'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
  await screenshot(page, info, '404-bilingual-dark');
  errorApp.fail(true);
  try {
    expect((await page.goto(`/en-sa/bikes/trek/${randomUUID()}`))?.status()).toBe(500);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
    await screenshot(page, info, '500-bilingual-dark');
  } finally {
    errorApp.fail(false);
  }
});
