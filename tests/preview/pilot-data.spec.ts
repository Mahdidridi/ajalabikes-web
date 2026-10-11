import { expect, test } from '@playwright/test';
import type { Build } from '../../src/lib/api';
import { PILOT_BIKES, isEntered, pilotBike, pilotFor, type PilotBike, type PilotSource } from '../../src/lib/hotspot-pilot';

/**
 * Garde-fous des données du pilote (web #49) : chaque valeur affichée doit citer un texte
 * que l'API sert réellement, et une photo différente ne reçoit jamais d'annotation.
 * Lit l'API publique en lecture seule ; aucun serveur Next n'est nécessaire.
 */
const API = process.env.API_BASE_URL;

async function fetchBuild(brand: string, slug: string): Promise<Build> {
  if (!API) throw new Error('Exporter API_BASE_URL (API de production, lecture seule).');
  const res = await fetch(`${API}/v1/en-sa/builds/${brand}/${slug}`, { headers: { Accept: 'application/json' } });
  expect(res.status, `${brand}/${slug}`).toBe(200);
  const body = await res.json();
  return (body.data ?? body) as Build;
}

/** Le texte servi par l'API pour une source : c'est là que la citation doit se trouver. */
function served(build: Build, source: PilotSource): string {
  if (source.layer === 'equipment_specs') {
    return build.equipment_specs.items
      .filter((item) => item.label === source.ref)
      .map((item) => `${item.label}: ${item.value_formatted} ${item.conditions_formatted ?? ''}`)
      .join('\n');
  }
  if (source.layer === 'components') {
    return build.components
      .filter((component) => component.key.toLowerCase() === source.ref.toLowerCase())
      .map((component) => `${component.description}\n${component.description_formatted}`)
      .join('\n');
  }
  return build.sizes.map((size) => `${size.label}=${size.wheel_size ?? ''}`).join('\n');
}

for (const bike of PILOT_BIKES) {
  test(`${bike.key} : identité, photo et sources servies par l'API`, async () => {
    const build = await fetchBuild(bike.brand, bike.slug);
    expect(build.model_name).toBe(bike.modelName);
    expect(build.year).toBe(bike.year);
    expect(build.category?.key).toBe(bike.category);
    expect(build.images[0]?.id).toBe(bike.media.id);
    expect([build.images[0]?.sizes.detail.w, build.images[0]?.sizes.detail.h]).toEqual([bike.media.w, bike.media.h]);
    expect(pilotFor(build, bike.key)).toBe(bike);
    for (const point of bike.points) {
      expect(point.sources.length, point.id).toBeGreaterThan(0);
      for (const source of point.sources) {
        expect(served(build, source), `${bike.key}/${point.id} ${source.layer}:${source.ref}`).toContain(source.quote);
      }
    }
  });

  test(`${bike.key} : photo différente = pas d'annotation`, async () => {
    const build = await fetchBuild(bike.brand, bike.slug);
    const [first, ...rest] = build.images;
    const autreMedia = { ...build, images: [{ ...first, id: first.id + 1 }, ...rest] };
    expect(pilotFor(autreMedia, bike.key)).toBeNull();
    const autresDimensions = {
      ...build,
      images: [{ ...first, sizes: { ...first.sizes, detail: { ...first.sizes.detail, h: first.sizes.detail.h + 1 } } }, ...rest],
    };
    expect(pilotFor(autresDimensions, bike.key)).toBeNull();
  });
}

test('textes complets, ancres dans les bornes, identifiants uniques', () => {
  for (const bike of PILOT_BIKES) {
    expect(new Set(bike.points.map((p) => p.id)).size, bike.key).toBe(bike.points.length);
    for (const p of bike.points) {
      for (const locale of ['en-sa', 'ar-sa'] as const) {
        for (const field of [p.main, p.part, p.note]) {
          expect(field[locale].trim(), `${bike.key}/${p.id}/${locale}`).not.toBe('');
        }
      }
      for (const v of [p.dot.x, p.dot.y, p.label.x, p.label.y]) {
        expect(v, `${bike.key}/${p.id}`).toBeGreaterThanOrEqual(0);
        expect(v, `${bike.key}/${p.id}`).toBeLessThanOrEqual(100);
      }
    }
  }
});

// Relecture du 10 octobre (Important 4) : un drapeau `entered` par point, posé sur les 34, ne distinguait plus rien. Une
// valeur est SAISIE quand elle vient d'un texte libre (`components[].description`) — c'est ce que Laravel devra servir ;
// `equipment_specs` et `sizes` sont servis normalisés.
test('saisi ou servi : la nature de chaque valeur se lit à sa source, jamais au point', () => {
  const refs = (key: PilotBike['key'], id: string, entered: boolean) =>
    pilotBike(key)!
      .points.find((p) => p.id === id)!
      .sources.filter((source) => isEntered(source) === entered)
      .map((source) => source.ref);
  expect(refs('talon', 'brake', false)).toContain('Front brake rotor diameter');
  expect(refs('anthem', 'fork', false)).toContain('Fork travel');
  expect(refs('anthem', 'crankset', false)).toContain('Chainring teeth');
  expect(refs('vado', 'tyres', false)).toContain('Front tyre width');
  expect(refs('vado', 'derailleur', false)).toContain('Cassette speeds');
  expect(refs('talon', 'seatpost', true)).toEqual(['Seatpost']);
  for (const bike of PILOT_BIKES) {
    for (const point of bike.points) expect(point, `${bike.key}/${point.id}`).not.toHaveProperty('entered');
  }
});

test('électrique : moteur et batterie seulement sur le vélo électrique, et les deux', () => {
  for (const bike of PILOT_BIKES) {
    const kinds = new Set(bike.points.map((p) => p.kind));
    expect(bike.electric, bike.key).toBe(bike.category.startsWith('e_'));
    expect(kinds.has('motor') && kinds.has('battery'), bike.key).toBe(bike.electric);
    if (!bike.electric) expect(kinds.has('motor') || kinds.has('battery'), bike.key).toBe(false);
  }
});

test('terminologie arabe : cadre = الهيكل, pneu = الإطار', () => {
  for (const bike of PILOT_BIKES) {
    for (const p of bike.points) {
      if (p.kind === 'frame') {
        expect(p.part['ar-sa'], `${bike.key}/${p.id}`).toContain('الهيكل');
        expect(p.part['ar-sa'], `${bike.key}/${p.id}`).not.toContain('الإطار');
      }
      if (p.kind === 'tyre') expect(p.part['ar-sa'], `${bike.key}/${p.id}`).toContain('الإطار');
    }
  }
});

test('aucun jugement dans les notes', () => {
  // « top » n'y figure pas : « top tube » (tube supérieur) est un terme technique, pas un jugement.
  const interdits = /\b(best|excellent|great|amazing|superb|perfect|ideal)\b|أفضل|ممتاز|رائع|مثالي/i;
  for (const bike of PILOT_BIKES) {
    for (const p of bike.points) {
      for (const text of [p.main, p.part, p.note]) {
        for (const value of Object.values(text)) expect(value, `${bike.key}/${p.id}`).not.toMatch(interdits);
      }
    }
  }
});
