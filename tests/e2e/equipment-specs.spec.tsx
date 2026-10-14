/** @jsxImportSource react */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { EquipmentSpecs, hasEquipment } from '@/components/EquipmentSpecs';
import type { EquipmentItem, EquipmentSpecs as Spec, Locale } from '@/lib/api';

/**
 * Le bloc « Équipements » de la fiche (web #36), rendu seul : ni API, ni serveur. Les libellés attendus sont écrits ici en
 * toutes lettres — un oracle indépendant du `COPY` du composant. Les pages réelles sont dans `equipment.spec.ts`.
 */
const FSI = '⁨';
const PDI = '⁩';

const LOCALES = ['en-sa', 'ar-sa'] as const satisfies readonly Locale[];
const LABELS = {
  'en-sa': {
    title: 'Equipment', checked: (d: string) => `Checked: ${d}`, source: 'Manufacturer page',
    shared: (c: string) => `Values published for: ${c}`, sourceText: 'Source text',
  },
  'ar-sa': {
    title: 'التجهيزات', checked: (d: string) => `تاريخ التحقق: ${d}`, source: 'صفحة الشركة المصنّعة',
    shared: (c: string) => `القيم المنشورة لـ: ${c}`, sourceText: 'نص المصدر',
  },
} as const;

function item(over: Partial<EquipmentItem> & Pick<EquipmentItem, 'role' | 'label' | 'value_formatted'>): EquipmentItem {
  return {
    property: `${over.role}.x`, status: 'known', status_label: 'Published value', value: over.value_formatted, unit: null,
    precision: 'exact', precision_label: null, scope: 'build', conditions_formatted: null,
    evidence: [{ category_original: 'Rear Derailleur', unit_original: null, excerpt: 'SRAM Force AXS', observed_at: null, observed_at_formatted: null }],
    ...over,
  };
}

/** Cinq valeurs sur trois rôles : deux changements de rôle, donc deux filets. */
function spec(over: Partial<Spec> = {}): Spec {
  return {
    state: 'current', state_label: 'Current', checked_at: '2026-08-26T00:00:00Z', checked_at_formatted: 'August 26, 2026',
    source_url: 'https://www.example.com/bike?article=1&size=m',
    coverage: { completeness: 'partial', label: 'Partial coverage' }, rules_version: 'rules.v4', shared_conditions_formatted: null,
    items: [
      item({ role: 'rear_derailleur', label: 'Rear derailleur brand', value_formatted: 'SRAM' }),
      item({ role: 'rear_derailleur', label: 'Rear derailleur model', value_formatted: 'Force AXS' }),
      item({
        role: 'fork', label: 'Fork travel', value_formatted: '80 mm / 100 mm', status: 'ambiguous', status_label: 'Several possible values',
        evidence: [{ category_original: 'Fork', unit_original: null, excerpt: '100mm of travel (XS - 80mm travel) & <15x110mm>', observed_at: null, observed_at_formatted: null }],
      }),
      item({
        role: 'bike', label: 'Bike weight', value_formatted: '7.14 kg', precision: 'approximate', precision_label: 'Approximate',
        scope: 'conditional', conditions_formatted: `Size: ${FSI}56${PDI}`,
        evidence: [{ category_original: 'Weight', unit_original: 'lbs', excerpt: '15.74', observed_at: '2026-08-26T00:00:00Z', observed_at_formatted: 'August 26, 2026' }],
      }),
      item({ role: 'bike', label: 'Chainring teeth', value_formatted: '30 / 42', status: 'conflict', status_label: 'Conflicting values' }),
    ],
    ...over,
  };
}

const render = (locale: Locale, data: Spec) =>
  renderToStaticMarkup(<main dir={locale === 'ar-sa' ? 'rtl' : 'ltr'}><EquipmentSpecs data={data} locale={locale} /></main>);

test('rien à montrer hors publication « current » ou sans valeur : ni titre, ni ancre', () => {
  for (const locale of LOCALES) {
    for (const none of [spec({ state: 'unavailable', items: [] }), spec({ state: 'stale' }), spec({ items: [] })]) {
      expect(hasEquipment(none), `${locale} ${none.state} ${none.items.length}`).toBe(false);
      expect(renderToStaticMarkup(<EquipmentSpecs data={none} locale={locale} />)).toBe('');
    }
    // Le pendant : une publication courante avec des valeurs a son bloc — la même règle décide du bloc ET de l'ancre.
    expect(hasEquipment(spec()), locale).toBe(true);
    expect(hasEquipment(null), locale).toBe(false);
  }
});

for (const locale of LOCALES) {
  const L = LABELS[locale];

  test(`${locale} : en-tête — couverture, date, page du constructeur (nouvel onglet, nofollow)`, async ({ page }) => {
    const data = spec();
    await page.setContent(render(locale, data));
    const section = page.locator('section#equipment');

    await expect(section.getByRole('heading', { level: 2 })).toHaveText(L.title);
    await expect(section.getByText(data.coverage!.label, { exact: true })).toBeVisible();
    await expect(section.getByText(L.checked(data.checked_at_formatted!), { exact: true })).toBeVisible();
    const link = section.getByRole('link', { name: L.source });
    await expect(link).toHaveAttribute('href', data.source_url!);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    // Pas de condition commune : aucune ligne « Values published for ».
    await expect(section.locator('[data-equipment-shared]')).toHaveCount(0);
  });

  test(`${locale} : une condition commune s’affiche une seule fois, en tête, jamais par ligne`, async ({ page }) => {
    const shared = `Size: ${FSI}M${PDI}`;
    const data = spec({ shared_conditions_formatted: shared, items: spec().items.map((i) => ({ ...i, conditions_formatted: null })) });
    await page.setContent(render(locale, data));
    const section = page.locator('section#equipment');

    await expect(section.locator('[data-equipment-shared]')).toHaveText(L.shared(shared));
    await expect(section.locator('[data-equipment-conditions]')).toHaveCount(0);
  });

  test(`${locale} : les valeurs dans l’ordre servi, un filet à chaque changement de rôle`, async ({ page }) => {
    const data = spec();
    await page.setContent(render(locale, data));
    const rows = page.locator('section#equipment [data-equipment-row]');

    await expect(rows).toHaveCount(data.items.length);
    await expect(rows.locator('dt')).toHaveText(data.items.map((i) => i.label));
    // rear_derailleur → fork → bike : deux changements, deux filets ; jamais sur la première ligne.
    await expect(page.locator('[data-equipment-row][data-new-role]')).toHaveCount(2);
    await expect(rows.first()).not.toHaveAttribute('data-new-role', /.*/);
  });

  test(`${locale} : précision, condition par ligne, badge seulement pour une valeur ambiguë ou en conflit`, async ({ page }) => {
    const data = spec();
    await page.setContent(render(locale, data));
    const rows = page.locator('section#equipment [data-equipment-row]');

    for (const [i, it] of data.items.entries()) {
      const row = rows.nth(i);
      // La valeur telle que servie, candidats compris : le site n'en choisit aucun.
      await expect(row.locator('dd bdi').first(), it.label).toHaveText(it.value_formatted);
      const badge = row.locator('[data-equipment-status]');
      if (it.status === 'known') await expect(badge, it.label).toHaveCount(0);
      else await expect(badge, it.label).toHaveText(it.status_label);
      await expect(row.locator('[data-equipment-conditions]'), it.label).toHaveCount(it.conditions_formatted ? 1 : 0);
      if (it.conditions_formatted) await expect(row.locator('[data-equipment-conditions]')).toHaveText(it.conditions_formatted);
      if (it.precision_label) await expect(row.locator('dd'), it.label).toContainText(it.precision_label);
    }
  });

  test(`${locale} : les preuves sont repliées sous « ${L.sourceText} » — extrait, unité, catégorie, date`, async ({ page }) => {
    const data = spec();
    await page.setContent(render(locale, data));
    const weight = page.locator('section#equipment [data-equipment-row]').nth(3);
    const details = weight.locator('details');

    await expect(details.locator('summary')).toHaveText(L.sourceText);
    expect(await details.evaluate((d) => (d as HTMLDetailsElement).open), 'fermé au chargement').toBe(false);
    const evidence = details.locator('[data-equipment-evidence]');
    await expect(evidence).toHaveCount(1);
    // L'unité d'origine accompagne l'extrait : « 15.74 » seul, à côté de « 7.14 kg », passerait pour une erreur.
    await expect(evidence).toContainText('15.74');
    await expect(evidence).toContainText('lbs');
    await expect(evidence).toContainText('Weight');
    await expect(evidence).toContainText('August 26, 2026');
  });

  test(`${locale} : un extrait avec « < » et « & » s’affiche en texte, sans être interprété`, async ({ page }) => {
    const data = spec();
    await page.setContent(render(locale, data));
    const fork = page.locator('section#equipment [data-equipment-row]').nth(2);

    const evidence = fork.locator('[data-equipment-evidence]');
    // Le premier <bdi> est l'extrait, mot pour mot ; le second, la catégorie d'origine.
    await expect(evidence.locator('bdi').first()).toHaveText(data.items[2].evidence[0].excerpt);
    // Aucun élément n'est né de l'extrait : seuls les deux <bdi> attendus sont dans la preuve.
    await expect(evidence.locator(':scope > *')).toHaveCount(2);
  });

  test(`${locale} : valeurs et extraits latins isolés dans <bdi>`, () => {
    const html = render(locale, spec());
    expect(html).toMatch(/<bdi[^>]*>SRAM<\/bdi>/);
    expect(html).toMatch(/<bdi[^>]*>SRAM Force AXS<\/bdi>/);
  });
}
