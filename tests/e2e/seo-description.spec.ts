import { expect, test } from '@playwright/test';
import { bikeDescription } from '@/lib/seo';

const build = {
  brand: { slug: 'specialized', name: 'Specialized' },
  model_name: 'Stumpjumper 15 Comp  - SRAM S-1000 AXS, FOX Performance',
  year: 2025,
  year_label: '2025',
  sizes: [{}, {}, {}, {}, {}, {}],
};

test('la description garde le mot entier avant une espace a l index 159', () => {
  expect(bikeDescription('ar-sa', build)).toBe(
    'دراجة Specialized Stumpjumper 15 Comp  - SRAM S-1000 AXS, FOX Performance 2025: المواصفات الكاملة، الهندسة حسب المقاس (6 مقاسات)، المكونات، والمقارنة مع دراجات…',
  );
});

test('la description conserve les doubles espaces internes et retire ceux avant la coupe', () => {
  expect(bikeDescription('en-sa', {
    brand: { slug: 'test', name: 'Test' },
    model_name: 'Endurance Road Performance Edition Long Distance Carbon Frame Electronic Groupset Integrated Cockpit Lightweight Wheels Racing Saddle  Final  Model',
    year: null, year_label: 'Unknown', sizes: [],
  })).toBe(
    'Test Endurance Road Performance Edition Long Distance Carbon Frame Electronic Groupset Integrated Cockpit Lightweight Wheels Racing Saddle  Final  Model: full…',
  );
});

test('une description courte reste litteralement intacte', () => {
  expect(bikeDescription('en-sa', {
    brand: { slug: 'trek', name: 'Trek' },
    model_name: 'Marlin', year: null, year_label: 'Unknown', sizes: [],
  })).toBe('Trek Marlin: full specs, geometry by size, components and side-by-side comparison.');
});
