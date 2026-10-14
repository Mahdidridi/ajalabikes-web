/** @jsxImportSource react */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { BikeCard } from '@/components/BikeCard';
import { SimilarBikes, hasSimilar } from '@/components/SimilarBikes';
import type { Locale, SimilarBuild, SimilarBuilds } from '@/lib/api';

/**
 * Le bloc « Vélos proches » de la fiche (web #35), rendu seul : ni API, ni serveur. Les libellés attendus sont écrits
 * ici en toutes lettres — un oracle indépendant du `COPY` du composant. Les pages réelles sont dans `similar.spec.ts`.
 */
const FSI = '⁨';
const PDI = '⁩';

const LOCALES = ['en-sa', 'ar-sa'] as const satisfies readonly Locale[];
const LABELS = {
  'en-sa': { title: 'Similar bikes', how: 'How we choose', showAll: (n: number) => `Show all (${n})`, compare: 'Compare' },
  'ar-sa': { title: 'دراجات مشابهة', how: 'كيف نختار', showAll: (n: number) => `عرض الكل (${n})`, compare: 'قارن' },
} as const;

/** Un vélo proche. Le « + » final de son nom est le cas bidi connu (« Borrego+ »). */
function bike(n: number, locale: Locale, reasons: number): SimilarBuild {
  return {
    slug: `modele-${n}`, model_name: `Modèle ${n}+`,
    brand: { slug: 'marque', name: 'Marque' },
    family: { key: 'famille', name: 'Famille', slug: 'famille' },
    category: { key: 'road', label: locale === 'en-sa' ? 'Road' : 'دراجات هوائية للطرق', slug: 'road-bikes' },
    indexable: true, indexable_reasons: [],
    year: 2026, year_label: '2026', model_path: `/${locale}/bikes/marque/modele-${n}`,
    msrp_formatted: '$4,999.00', msrp_amount_minor: 499900, msrp_currency: 'USD', msrp_label: null,
    image: null, sizes: ['M'], wheel_size: '700c', last_changed_at: '2026-10-03T00:00:00Z',
    // Les isolats FSI/PDI sont déjà dans le texte servi : le site l'affiche tel quel.
    reasons: Array.from({ length: reasons }, (_, i) => ({
      key: `raison_${i + 1}`, value: i + 1, text: `Raison ${n}.${i + 1} : ${FSI}${i + 1} mm${PDI}`,
    })),
    compare_path: `/${locale}/compare?bikes=trek/ce-velo,marque/modele-${n}`,
  };
}

function similar(locale: Locale, count: number, reasons = 3): SimilarBuilds {
  return {
    method: { version: '1-draft.2', title: 'Titre de la méthode', criteria: ['Critère un', 'Critère deux', 'Critère trois'] },
    msrp_disclaimer: 'Avertissement MSRP, une seule fois',
    total: count,
    items: Array.from({ length: count }, (_, i) => bike(i + 1, locale, reasons)),
  };
}

const page6 = (locale: Locale, data = similar(locale, 6)) =>
  renderToStaticMarkup(<main dir={locale === 'ar-sa' ? 'rtl' : 'ltr'}><SimilarBikes data={data} locale={locale} /></main>);

test('sans vélo proche, le bloc ne rend rien : ni titre, ni ancre', () => {
  for (const locale of LOCALES) {
    const none = similar(locale, 0);
    expect(hasSimilar(none), locale).toBe(false);
    expect(renderToStaticMarkup(<SimilarBikes data={none} locale={locale} />), locale).toBe('');
    // Le pendant : avec des vélos, la même règle répond oui — elle décide du bloc ET de l'ancre de la barre.
    expect(hasSimilar(similar(locale, 3)), locale).toBe(true);
  }
});

for (const locale of LOCALES) {
  const L = LABELS[locale];

  test(`${locale} : le titre, la méthode, les critères repliés et l’avertissement MSRP`, async ({ page }) => {
    const data = similar(locale, 6);
    await page.setContent(page6(locale, data));
    const section = page.locator('section#similar');

    // Un seul h2, celui du bloc : les cartes passent en h3 dessous.
    await expect(section.getByRole('heading', { level: 2 })).toHaveText(L.title);
    await expect(section.getByText(data.method.title, { exact: true })).toBeVisible();

    // Les critères vivent dans un <details> natif, fermé : aucun JavaScript.
    const how = section.locator('details').filter({ has: page.locator('summary', { hasText: L.how }) });
    await expect(how).toHaveCount(1);
    expect(await how.evaluate((d) => (d as HTMLDetailsElement).open), 'fermé au chargement').toBe(false);
    await expect(how.locator('li')).toHaveText(data.method.criteria);

    // L'avertissement : une fois pour tout le bloc, jamais par carte.
    await expect(section.getByText(data.msrp_disclaimer, { exact: true })).toHaveCount(1);
  });

  test(`${locale} : quatre cartes visibles, les autres sous « ${L.showAll(6)} », dans l’ordre servi`, async ({ page }) => {
    await page.setContent(page6(locale));
    const section = page.locator('section#similar');
    const names = section.getByRole('heading', { level: 3 });

    await expect(names).toHaveCount(4);
    await expect(names).toHaveText([1, 2, 3, 4].map((n) => `Modèle ${n}+`));

    // Le nombre affiché est le total de l'API, pas le reste à découvrir.
    await section.locator('summary', { hasText: L.showAll(6) }).click();
    await expect(names).toHaveCount(6);
    await expect(names).toHaveText([1, 2, 3, 4, 5, 6].map((n) => `Modèle ${n}+`));
  });

  test(`${locale} : jusqu’à quatre vélos, rien à déplier`, async ({ page }) => {
    await page.setContent(page6(locale, similar(locale, 4)));
    const section = page.locator('section#similar');

    await expect(section.getByRole('heading', { level: 3 })).toHaveCount(4);
    // Le seul <summary> est celui des critères.
    await expect(section.locator('summary')).toHaveCount(1);
    await expect(section.locator('summary', { hasText: L.how })).toHaveCount(1);
  });

  test(`${locale} : sous chaque carte, hors du lien, trois raisons au plus puis « ${L.compare} » vers compare_path`, async ({ page }) => {
    // L'API en servirait quatre : le bloc en montre trois, dans l'ordre servi.
    const data = similar(locale, 5, 4);
    await page.setContent(page6(locale, data));
    const cards = page.locator('[data-similar-card]');

    await expect(cards).toHaveCount(5);
    for (const [i, item] of data.items.entries()) {
      const card = cards.nth(i);
      await expect(card.locator('[data-similar-reasons] li'), item.slug).toHaveText(item.reasons.slice(0, 3).map((r) => r.text));

      // Le lien Compare est l'adresse de l'API, telle quelle ; il n'est pas dans le lien de la carte.
      const compare = card.locator(`a[href="${item.compare_path}"]`);
      await expect(compare, item.slug).toHaveCount(1);
      await expect(compare, item.slug).toContainText(L.compare);

      const link = card.locator(`a[href="/${locale}/bikes/marque/${item.slug}"]`);
      await expect(link, item.slug).toHaveCount(1);
      await expect(link.locator('[data-similar-reasons]'), item.slug).toHaveCount(0);
      await expect(link.locator(`a[href="${item.compare_path}"]`), item.slug).toHaveCount(0);
    }
  });

  test(`${locale} : une carte sans raison n’affiche pas de liste vide, mais garde son lien « ${L.compare} »`, async ({ page }) => {
    await page.setContent(page6(locale, similar(locale, 4, 0)));
    const cards = page.locator('[data-similar-card]');

    await expect(cards).toHaveCount(4);
    await expect(page.locator('[data-similar-reasons]')).toHaveCount(0);
    await expect(cards.first().getByRole('link', { name: new RegExp(L.compare) })).toHaveCount(1);
  });

  test(`${locale} : les noms latins sont isolés dans <bdi> et les isolats des raisons sont intacts`, () => {
    const html = renderToStaticMarkup(<SimilarBikes data={similar(locale, 6)} locale={locale} />);
    for (let n = 1; n <= 6; n++) {
      expect(html, `modèle ${n}`).toContain(`<bdi>Modèle ${n}+</bdi>`);
      expect(html, `raison du modèle ${n}`).toContain(`Raison ${n}.1 : ${FSI}1 mm${PDI}`);
    }
  });
}

test('une carte ne contient jamais un lien dans un lien', () => {
  // Le navigateur « répare » un <a> dans un <a> en silence : le contrôle porte sur le texte rendu.
  const html = renderToStaticMarkup(<SimilarBikes data={similar('en-sa', 6)} locale="en-sa" />);
  const anchors = html.match(/<a\b[\s\S]*?<\/a>/g) ?? [];

  expect(anchors.length).toBeGreaterThan(0);
  for (const anchor of anchors) expect(anchor.match(/<a\b/g)?.length, anchor.slice(0, 90)).toBe(1);
});

test('BikeCard garde son titre h2 par défaut et passe en h3 à la demande', async ({ page }) => {
  // `bidi.spec.ts` cherche le h2 des cartes du catalogue : le défaut ne bouge pas.
  const b = bike(1, 'en-sa', 0);
  await page.setContent(renderToStaticMarkup(
    <main><BikeCard bike={b} locale="en-sa" /><BikeCard bike={b} locale="en-sa" headingLevel="h3" /></main>,
  ));

  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(1);
});
