import { expect } from '@playwright/test';
import type { CatalogPage } from '@/lib/api';

export function expectArabicCategory(label: string) {
  expect(label, 'Une categorie arabe doit employer l ecriture arabe').toMatch(/\p{Script=Arabic}/u);
  expect(label, 'Le generique arabe doit distinguer le velo de la moto').toContain('هوائية');
}

export function expectLatinBrand(label: string) {
  expect(label, 'Le nom canonique de marque reste latin').toMatch(/[A-Za-z]/);
  expect(label, 'Un alias arabe ne remplace pas le nom de marque').not.toMatch(/\p{Script=Arabic}/u);
}

export function expectFacetSubset(
  filtered: CatalogPage['facets']['categories'],
  all: CatalogPage['facets']['categories'],
  total: number,
) {
  for (const bucket of filtered) {
    const unfiltered = all.find((candidate) => candidate.key === bucket.key);
    expect(unfiltered, `La facette filtree ${bucket.key} existe dans le catalogue global`).toBeDefined();
    expect(bucket.count, `${bucket.key} ne depasse pas la collection`).toBeLessThanOrEqual(total);
    expect(bucket.count, `${bucket.key} ne depasse pas son seau global`).toBeLessThanOrEqual(unfiltered!.count);
  }
}
