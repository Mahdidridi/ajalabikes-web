import { expect, test } from '@playwright/test';
import { buildCacheTags, resolveBuildAddress } from '@/lib/build-address';
import { hreflangGroup, seoFor, SITE_URL } from '@/lib/seo';

/**
 * web #15 — deux adresses par vélo (décision du 5 septembre 2026, `../CLAUDE.md`, « Conventions → Routes ») : le
 * résolveur seul, sur des réponses d'API synthétiques à la forme du contrat (`slug` = slug du modèle, sans année ;
 * `year`, `is_current`, `model_path`). Les pages réelles sont dans `edition-address.spec.ts`.
 */
const SLUG = 'fuel-ex-5-gen-7';
const MODEL = `/bikes/trek/${SLUG}`;

const edition = (year: number | null, isCurrent: boolean, modelPath: string | null = `/en-sa${MODEL}`) => ({
  slug: SLUG,
  brand: { slug: 'trek' },
  year,
  is_current: isCurrent,
  model_path: modelPath,
});

test.describe('resolveBuildAddress', () => {
  test('adresse modèle : rendue, canonical propre', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: SLUG }, edition(2027, true))).toEqual({
      kind: 'render',
      path: MODEL,
      canonicalPath: MODEL,
    });
  });

  test('adresse millésime de l année en cours : rendue, canonical vers l adresse modèle', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: `${SLUG}-2027` }, edition(2027, true))).toEqual({
      kind: 'render',
      path: `${MODEL}-2027`,
      canonicalPath: MODEL,
    });
  });

  test('adresse millésime supplantée : rendue, canonical propre, jamais une redirection', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: `${SLUG}-2026` }, edition(2026, false))).toEqual({
      kind: 'render',
      path: `${MODEL}-2026`,
      canonicalPath: `${MODEL}-2026`,
    });
  });

  test('vélo nommé comme sa famille (model_path nul) : son adresse millésime reste canonique, même en cours', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: `${SLUG}-2027` }, edition(2027, true, null))).toEqual({
      kind: 'render',
      path: `${MODEL}-2027`,
      canonicalPath: `${MODEL}-2027`,
    });
  });

  test('ancien slug résolu vers l édition courante : redirection vers l adresse modèle', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: 'fuel-ex-5' }, edition(2027, true))).toEqual({
      kind: 'redirect',
      path: MODEL,
    });
  });

  test('ancien slug résolu vers une édition supplantée : redirection vers SON adresse millésime', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: 'fuel-ex-5-2026' }, edition(2026, false))).toEqual({
      kind: 'redirect',
      path: `${MODEL}-2026`,
    });
  });

  test('autre marque dans l URL : redirection vers l adresse de la fiche', () => {
    expect(resolveBuildAddress({ brand: 'trek-bikes', slug: SLUG }, edition(2027, true))).toEqual({
      kind: 'redirect',
      path: MODEL,
    });
  });

  test('une année qui n est pas celle de l édition servie ne rend jamais cette édition', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: `${SLUG}-2025` }, edition(2026, false))).toEqual({
      kind: 'redirect',
      path: `${MODEL}-2026`,
    });
  });

  test('édition sans année sous un autre slug : redirection vers l adresse modèle', () => {
    expect(resolveBuildAddress({ brand: 'trek', slug: 'old-slug' }, edition(null, true))).toEqual({
      kind: 'redirect',
      path: MODEL,
    });
  });
});

test.describe('buildCacheTags', () => {
  test('adresse modèle : le tag de la fiche, seul', () => {
    expect(buildCacheTags('trek', SLUG)).toEqual([`build:trek:${SLUG}`]);
  });

  test('adresse millésime : aussi le tag du modèle, celui que l API émet pour chacune de ses éditions', () => {
    expect(buildCacheTags('trek', `${SLUG}-2026`)).toEqual([`build:trek:${SLUG}-2026`, `build:trek:${SLUG}`]);
  });

  test('un suffixe numérique qui n est pas une année 20xx reste un slug', () => {
    expect(buildCacheTags('scott', 'addict-rc-20-427382')).toEqual(['build:scott:addict-rc-20-427382']);
    expect(buildCacheTags('trek', 'precaliber-20')).toEqual(['build:trek:precaliber-20']);
    expect(buildCacheTags('trek', 'model-1999')).toEqual(['build:trek:model-1999']);
  });
});

test.describe('seoFor et canonicalPath', () => {
  test('canonical et og:url suivent canonicalPath ; les hreflang restent ceux de l adresse servie', () => {
    const meta = seoFor({ locale: 'en-sa', path: `${MODEL}-2027`, canonicalPath: MODEL });

    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en-sa${MODEL}`);
    expect(meta.openGraph?.url).toBe(`${SITE_URL}/en-sa${MODEL}`);
    expect(meta.alternates?.languages).toEqual(hreflangGroup(`${MODEL}-2027`));
    expect(hreflangGroup(`${MODEL}-2027`)).toEqual({
      'ar-SA': `${SITE_URL}/ar-sa${MODEL}-2027`,
      'en-SA': `${SITE_URL}/en-sa${MODEL}-2027`,
      ar: `${SITE_URL}/ar-sa${MODEL}-2027`,
      en: `${SITE_URL}/en-sa${MODEL}-2027`,
      'x-default': `${SITE_URL}/en-sa${MODEL}-2027`,
    });
  });

  test('sans canonicalPath : le canonical reste la page elle-même', () => {
    const meta = seoFor({ locale: 'ar-sa', path: `${MODEL}-2026` });

    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/ar-sa${MODEL}-2026`);
    expect(meta.openGraph?.url).toBe(`${SITE_URL}/ar-sa${MODEL}-2026`);
  });
});
