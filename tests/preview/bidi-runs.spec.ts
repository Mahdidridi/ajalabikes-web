import { expect, test } from '@playwright/test';
import { latinRuns } from '../../src/components/hotspots/bidi';

/**
 * Découpe d'un texte arabe en suites latines à isoler par <bdi> (web #49, relecture du 10 oct.) :
 * la ponctuation de PHRASE reste à la phrase arabe, celle du NOM reste au nom.
 */
const latin = (text: string) => latinRuns(text).filter((r) => r.latin).map((r) => r.text);

test('le point final reste à la phrase arabe', () => {
  expect(latin('في هذه الدراجة: Giant Sport.')).toEqual(['Giant Sport']);
  expect(latin('هنا SRAM AXS Pod.')).toEqual(['SRAM AXS Pod']);
  expect(latin('ومتوافق مع نظام MIK HD.')).toEqual(['MIK HD']);
});

test('des parenthèses autour d’un mot latin restent ensemble, dans le <bdi>', () => {
  expect(latin('هنا عمود كربوني بشكل انسيابي (aero) خاص بدراجة Madone.')).toEqual(['(aero)', 'Madone']);
  expect(latin('جزء من تجهيز هذه النسخة (EQ). الطراز')).toEqual(['(EQ)']);
  expect(latin('إطارات الحصى (Gravel): 700 هو مقاس العجلة')).toEqual(['(Gravel)']);
  expect(latin('الهيكل المنخفض (Step-through) بلا أنبوب')).toEqual(['(Step-through)']);
});

test('un signe qui fait partie du nom reste au nom', () => {
  expect(latin('الطراز: Lezyne EBike Power STVZO E500+.')).toEqual(['Lezyne EBike Power STVZO E500+']);
  expect(latin('Borrego+')).toEqual(['Borrego+']);
  expect(latin('دراجة Ponto Go!')).toEqual(['Ponto Go!']);
  expect(latin('Precaliber 20"')).toEqual(['Precaliber 20"']);
});

test('le séparateur « · », les chiffres et l’arabe ne sont jamais avalés', () => {
  expect(latin('Giant SXC32-2 · 80 / 100 مم')).toEqual(['Giant SXC32-2']);
  expect(latin('Maxxis Rekon بمقاس 27.5×2.4 بوصة في المقاس XS، وRekon Race بمقاس 29×2.4')).toEqual(['Maxxis Rekon', 'XS', 'Rekon Race']);
});

test('la découpe restitue le texte entier, sans perte ni doublon', () => {
  for (const text of ['هنا عمود كربوني بشكل انسيابي (aero) خاص بدراجة Madone.', 'جزء من تجهيز هذه النسخة (EQ). الطراز: Lezyne E500+.']) {
    expect(latinRuns(text).map((r) => r.text).join('')).toBe(text);
  }
});
