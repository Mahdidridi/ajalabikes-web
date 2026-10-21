import { expect, test } from '@playwright/test';
import type { Locale } from '@/lib/api';
import { LEGAL_PAGES } from '@/lib/legal';
import { LEGAL_COPY } from '@/lib/legal-copy';

/**
 * Les pages légales (web #16, plan de levée du noindex du 16 octobre 2026) : confidentialité, droits des images et
 * retrait, contact et informations légales, conditions d'utilisation — quatre pages, deux langues.
 *
 * Attentes lues dans `LEGAL_COPY`, la source unique des textes. L'hôte canonique est celui de la production.
 */
const SITE = 'https://darrajabikes.com';
const LOCALES: Locale[] = ['ar-sa', 'en-sa'];

for (const locale of LOCALES) {
  for (const page of LEGAL_PAGES) {
    const copy = LEGAL_COPY[page][locale];

    test(`${locale}/${page} : la page, son titre, son canonical, ses hreflang et son JSON-LD`, async ({ page: tab }) => {
      const response = await tab.goto(`/${locale}/${page}`);
      expect(response?.status()).toBe(200);

      await expect(tab.locator('html')).toHaveAttribute('lang', locale === 'ar-sa' ? 'ar' : 'en');
      await expect(tab.locator('html')).toHaveAttribute('dir', locale === 'ar-sa' ? 'rtl' : 'ltr');
      await expect(tab.getByRole('heading', { level: 1 })).toHaveText(copy.title);
      await expect(tab).toHaveTitle(`${copy.title} · Darraja Bikes`);
      await expect(tab.locator('meta[name="description"]')).toHaveAttribute('content', copy.description);
      await expect(tab.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/${locale}/${page}`);
      // Le groupe hreflang a cinq liens, le meme pour toute page (`hreflangGroup`).
      await expect(tab.locator('link[rel="alternate"][hreflang]')).toHaveCount(5);
      // Verrou leve : ces pages sont indexables, sans leurs images (`noimageindex`, droits non documentes).
      await expect(tab.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, noimageindex');

      const blocks = await tab.locator('script[type="application/ld+json"]').allTextContents();
      const types = blocks.map((b) => JSON.parse(b)['@type']);
      expect(types).toContain('BreadcrumbList');
      expect(types).toContain(page === 'contact' ? 'ContactPage' : 'WebPage');
      const trail = blocks.map((b) => JSON.parse(b)).find((b) => b['@type'] === 'BreadcrumbList');
      expect(trail.itemListElement.map((i: { item: string }) => i.item)).toEqual([
        `${SITE}/${locale}`,
        `${SITE}/${locale}/${page}`,
      ]);
    });
  }

  test(`${locale} : le pied de page lie les quatre pages`, async ({ page: tab }) => {
    await tab.goto(`/${locale}`);
    const nav = tab.locator('footer nav').nth(1);
    const hrefs = await nav.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(LEGAL_PAGES.map((page) => `/${locale}/${page}`));
    // Cible tactile : 24 px de haut au moins (WCAG 2.5.8).
    for (const box of await nav.locator('a').evaluateAll((links) => links.map((a) => a.getBoundingClientRect().height)))
      expect(box).toBeGreaterThanOrEqual(24);
  });

  test(`${locale} : aucune page legale ne defile en largeur a 320 px`, async ({ page: tab }) => {
    await tab.setViewportSize({ width: 320, height: 720 });
    for (const page of LEGAL_PAGES) {
      await tab.goto(`/${locale}/${page}`);
      const width = await tab.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(width.scroll, `${locale}/${page}`).toBeLessThanOrEqual(width.client);
    }
  });
}

test('ar-sa : les noms latins sont isoles par <bdi> dans le texte arabe', async ({ page: tab }) => {
  await tab.goto('/ar-sa/privacy');
  await expect(tab.locator('article bdi', { hasText: /^Darraja Bikes$/ }).first()).toBeVisible();
  await expect(tab.locator('article bdi', { hasText: /^Google Analytics 4$/ }).first()).toBeVisible();
  await expect(tab.locator('article bdi code', { hasText: /^_ga$/ })).toHaveCount(1);
});

/**
 * L'exception de l'accueil (décision du fondateur du 21 octobre 2026 ; phrase validée le 22) : la photo de droite de
 * l'accueil est affichée en miroir. Tant qu'elle l'est, la page Droits des images le dit, dans les deux langues — sinon
 * elle dirait le contraire de ce que fait le site. Si l'accueil change, la phrase et ce test changent avec lui.
 */
for (const locale of LOCALES)
  test(`${locale} : la page Droits des images dit le miroir de l'accueil`, async ({ page: tab }) => {
    await tab.goto(`/${locale}`);
    const miroirs = await tab.locator('[data-hero-pair] [data-hero-bike]').evaluateAll(
      (cadres) =>
        cadres.filter((cadre) => {
          const style = getComputedStyle(cadre);
          return style.scale.startsWith('-1 ') || /^matrix\(-1, 0, 0, 1,/.test(style.transform);
        }).length,
    );
    expect(miroirs, "l'accueil montre une photo en miroir").toBe(1);

    await tab.goto(`/${locale}/image-rights`);
    await expect(tab.locator('article li', { hasText: locale === 'ar-sa' ? 'معكوسةً' : 'shown mirrored' })).toHaveCount(1);
  });

test('les liens entre pages legales menent a la bonne page, dans la langue de la page', async ({ page: tab }) => {
  await tab.goto('/en-sa/contact');
  await tab.getByRole('link', { name: LEGAL_COPY['image-rights']['en-sa'].title }).click();
  await expect(tab).toHaveURL(/\/en-sa\/image-rights$/);
  await expect(tab.getByRole('heading', { level: 1 })).toHaveText(LEGAL_COPY['image-rights']['en-sa'].title);
});

/**
 * Les faits que seul le fondateur peut donner — responsable, pays, e-mail, durée des journaux, droit applicable, date
 * (`LEGAL_FACTS`, `src/lib/legal.ts`). ROUGE TANT QU'IL EN MANQUE UN : aucune page ne part en ligne avec un blanc.
 */
test('les faits du fondateur sont tous renseignes', async ({ page: tab }) => {
  const missing: string[] = [];
  for (const locale of LOCALES)
    for (const page of LEGAL_PAGES) {
      await tab.goto(`/${locale}/${page}`);
      for (const field of await tab.locator('[data-legal-missing]').evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-legal-missing')),
      ))
        missing.push(`${locale}/${page} : ${field}`);
    }
  expect(missing, 'Champs a remplir dans LEGAL_FACTS (src/lib/legal.ts)').toEqual([]);
});
