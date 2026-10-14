import { expect, test, type Page } from '@playwright/test';
import type { EquipmentItem, Locale } from '@/lib/api';
import { readBuild } from './helpers/catalog-api';
import { settled } from './helpers/scroll';

/**
 * Le bloc « Équipements » sur les fiches RÉELLES (web #36). Les attentes se lisent dans l'API au moment du test, jamais
 * dans le code du site. Le composant seul est dans `equipment-specs.spec.tsx`.
 *
 * Fiches choisies sur le relevé de la production du 14 octobre 2026 (540 fiches du catalogue) ; chaque test vérifie
 * d'abord, dans l'API, que la fiche présente toujours le cas qu'elle illustre.
 */
type Bike = { brand: string; slug: string };
const CANYON: Bike = { brand: 'canyon', slug: 'aeroad-cfr-axs' }; // condition commune « taille M »
const WEIGHT: Bike = { brand: 'specialized', slug: 'aethos-2-expert-shimano-ultegra-di2' }; // poids conditionné à une taille
const AMBIGUOUS: Bike = { brand: 'specialized', slug: 'chisel-hardtail' }; // débattement ambigu (80 mm / 100 mm)
const CONFLICT: Bike = { brand: 'giant', slug: 'cypress-2' }; // poids en conflit
const NONE: Bike = { brand: 'trek', slug: 'madone-sl-6-gen-8' }; // publication courante, aucune valeur
const AMPERSAND: Bike = { brand: 'scott', slug: 'scale-920' }; // « & » dans un extrait
const LOCALES: readonly Locale[] = ['ar-sa', 'en-sa'];

// Libellé attendu, écrit en toutes lettres : un oracle indépendant du `COPY` du composant.
const SHARED = { 'ar-sa': (c: string) => `القيم المنشورة لـ: ${c}`, 'en-sa': (c: string) => `Values published for: ${c}` } as const;

const fiche = (locale: Locale, bike: Bike) => `/${locale}/bikes/${bike.brand}/${bike.slug}`;
const rows = (page: Page) => page.locator('#equipment [data-equipment-row]');

for (const locale of LOCALES) {
  test(`${locale} : Canyon — la condition commune une fois en tête, aucune par ligne ; lignes et lien comme l’API`, async ({ page, request }) => {
    const e = (await readBuild(request, locale, CANYON.brand, CANYON.slug)).equipment_specs;
    expect(e.state, 'précondition : publication courante').toBe('current');
    expect(e.shared_conditions_formatted, 'précondition : condition commune').not.toBeNull();
    await page.goto(fiche(locale, CANYON));

    await expect(page.locator('main nav a[href="#equipment"]')).toHaveCount(1);
    await expect(page.locator('#equipment [data-equipment-shared]')).toHaveText(SHARED[locale](e.shared_conditions_formatted!));
    await expect(page.locator('#equipment [data-equipment-conditions]')).toHaveCount(0);
    await expect(rows(page)).toHaveCount(e.items.length);
    await expect(rows(page).locator('dt')).toHaveText(e.items.map((i) => i.label));
    const source = page.locator('#equipment').getByRole('link').filter({ hasNotText: /^$/ }).first();
    await expect(source).toHaveAttribute('href', e.source_url!);
    await expect(source).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    await expect(source).toHaveAttribute('target', '_blank');
  });

  test(`${locale} : Specialized — un poids conditionné porte sa condition sur sa seule ligne`, async ({ page, request }) => {
    const e = (await readBuild(request, locale, WEIGHT.brand, WEIGHT.slug)).equipment_specs;
    expect(e.items.some((i) => i.conditions_formatted), 'précondition : une ligne conditionnée').toBe(true);
    expect(e.shared_conditions_formatted, 'précondition : pas de condition commune').toBeNull();
    await page.goto(fiche(locale, WEIGHT));

    await expect(rows(page)).toHaveCount(e.items.length);
    for (const [i, it] of e.items.entries()) {
      const conditions = rows(page).nth(i).locator('[data-equipment-conditions]');
      await expect(conditions, it.label).toHaveCount(it.conditions_formatted ? 1 : 0);
      if (it.conditions_formatted) await expect(conditions, it.label).toHaveText(it.conditions_formatted);
    }
  });

  for (const [bike, status] of [[AMBIGUOUS, 'ambiguous'], [CONFLICT, 'conflict']] as const) {
    test(`${locale} : ${bike.brand}/${bike.slug} — une valeur « ${status} » garde ses candidats, avec son badge`, async ({ page, request }) => {
      const e = (await readBuild(request, locale, bike.brand, bike.slug)).equipment_specs;
      const flagged = e.items.flatMap((it, i): [EquipmentItem, number][] => (it.status === status ? [[it, i]] : []));
      expect(flagged.length, `précondition : au moins une valeur ${status}`).toBeGreaterThan(0);
      await page.goto(fiche(locale, bike));

      for (const [it, i] of flagged) {
        const row = rows(page).nth(i);
        // Les candidats tels que servis : le site n'en choisit aucun.
        await expect(row.locator('dd bdi').first(), it.label).toHaveText(it.value_formatted);
        await expect(row.locator('[data-equipment-status]'), it.label).toHaveText(it.status_label);
      }
      // Une valeur publiée n'a pas de badge.
      const known = e.items.findIndex((it) => it.status === 'known');
      if (known >= 0) await expect(rows(page).nth(known).locator('[data-equipment-status]')).toHaveCount(0);
    });
  }

  test(`${locale} : une publication sans valeur (Trek Madone) n’affiche ni section ni ancre`, async ({ page, request }) => {
    const e = (await readBuild(request, locale, NONE.brand, NONE.slug)).equipment_specs;
    expect(e.state === 'current' && e.items.length === 0, `précondition : courante sans valeur (${e.state}, ${e.items.length})`).toBe(true);

    const response = await page.goto(fiche(locale, NONE));
    expect(response?.status()).toBe(200);
    await expect(page.locator('#equipment')).toHaveCount(0);
    await expect(page.locator('main nav a[href="#equipment"]')).toHaveCount(0);
  });

  test(`${locale} : un extrait qui contient « & » s’affiche mot pour mot`, async ({ page, request }) => {
    const e = (await readBuild(request, locale, AMPERSAND.brand, AMPERSAND.slug)).equipment_specs;
    const i = e.items.findIndex((it) => it.evidence.some((ev) => ev.excerpt.includes('&')));
    expect(i, 'précondition : un extrait avec « & »').toBeGreaterThanOrEqual(0);
    const ev = e.items[i].evidence.findIndex((x) => x.excerpt.includes('&'));
    await page.goto(fiche(locale, AMPERSAND));

    const excerpt = rows(page).nth(i).locator('[data-equipment-evidence]').nth(ev).locator('bdi').first();
    expect(await excerpt.textContent()).toBe(e.items[i].evidence[ev].excerpt);
  });

  test(`${locale} : la fiche la plus fournie ne défile pas en largeur`, async ({ page }) => {
    await page.goto(fiche(locale, WEIGHT));
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `${scroll} px de contenu pour ${client} px d'écran`).toBeLessThanOrEqual(client);
  });

  test(`${locale} : à 320 px, chaque ancre de la barre (cinq liens) pose le titre de sa section sous la barre`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(fiche(locale, WEIGHT));
    const bar = page.locator('main nav');
    const hrefs = await bar.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs).toContain('#equipment');

    for (const href of hrefs) {
      await bar.locator(`a[href="${href}"]`).click();
      // Le défilement est doux depuis web #65 : on mesure une fois la page immobile.
      await settled(page);
      const title = page.locator(`${href} h2`).first();
      await expect(title, href).toBeInViewport();
      const barBox = (await bar.boundingBox())!;
      const titleBox = (await title.boundingBox())!;
      expect(titleBox.y, `${href} : titre à ${titleBox.y} px, barre jusqu’à ${barBox.y + barBox.height} px`)
        .toBeGreaterThanOrEqual(barBox.y + barBox.height - 0.5);
    }
  });
}

test('ar-sa : la section est en RTL et les valeurs sont isolées dans <bdi>', async ({ page, request }) => {
  const e = (await readBuild(request, 'ar-sa', CANYON.brand, CANYON.slug)).equipment_specs;
  await page.goto(fiche('ar-sa', CANYON));

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(rows(page).first().locator('dd bdi').first()).toHaveText(e.items[0].value_formatted);
});
