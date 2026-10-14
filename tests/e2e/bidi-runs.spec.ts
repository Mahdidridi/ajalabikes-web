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

// Vu sur la planche du 11 octobre : « 300 Series Alpha » s'affichait « Series Alpha 300 » — le nombre restait hors du <bdi>.
test('un nom latin qui commence par un nombre le garde ; un nombre suivi d’arabe reste à l’arabe', () => {
  expect(latin('ألومنيوم 300 Series Alpha')).toEqual(['300 Series Alpha']);
  expect(latin('هذا من ألومنيوم Alpha من فئة 300 Series.')).toEqual(['Alpha', '300 Series']);
  expect(latin('من فئة 500 Series، بأنابيب')).toEqual(['500 Series']);
  expect(latin('microSHIFT Advent · 11 سرعة')).toEqual(['microSHIFT Advent']);
  expect(latin('Tektro HD M3121 · قرص 180 مم')).toEqual(['Tektro HD M3121']);
});

test('le séparateur « · », les chiffres et l’arabe ne sont jamais avalés', () => {
  expect(latin('Giant SXC32-2 · 80 / 100 مم')).toEqual(['Giant SXC32-2']);
  expect(latin('Maxxis Rekon بمقاس 27.5×2.4 بوصة في المقاس XS، وRekon Race بمقاس 29×2.4')).toEqual(['Maxxis Rekon', 'XS', 'Rekon Race']);
});

// Canyon (lot du 13 octobre 2026) : « Strive:ON », « Spectral:ONfly » portent un deux-points dans leur NOM. Sans lui dans la suite,
// l'arabe coupait le nom en trois <bdi> et l'affichait « ON:Canyon Strive ».
test('un deux-points collé à un mot latin reste dans le nom ; celui de la phrase reste à la phrase', () => {
  expect(latin('Canyon Strive:ON')).toEqual(['Canyon Strive:ON']);
  expect(latin('Canyon Spectral:ONfly CF')).toEqual(['Canyon Spectral:ONfly CF']);
  expect(latin('Canyon:ON HB0057 Riser bar')).toEqual(['Canyon:ON HB0057 Riser bar']);
  expect(latin('Canyon Pathlite:ON Step-Through')).toEqual(['Canyon Pathlite:ON Step-Through']);
  expect(latin('الطراز: Canyon Torque:ON CF · 170 مم')).toEqual(['Canyon Torque:ON CF']);
  // Le deux-points d'une phrase arabe n'entre pas dans le nom, ni le nombre qui le suit.
  expect(latin('إطارات الحصى (Gravel): 700 هو مقاس العجلة')).toEqual(['(Gravel)']);
  expect(latin('اسم الطراز: Giant Sport.')).toEqual(['Giant Sport']);
  expect(latin('Madone:هذا')).toEqual(['Madone']);
  expect(latin('Madone: 2026 هو')).toEqual(['Madone']);
});

// Specialized (lot du 13 octobre 2026) : « 840Wh battery » (15 vélos), « 900Wh Battery », « 3D-forged alloy » — un nombre COLLÉ à ses
// lettres restait hors du <bdi> et l'arabe affichait « Wh battery840 ».
test('un nom latin qui commence par un nombre collé à ses lettres le garde ; un nombre sans lettre reste à l’arabe', () => {
  expect(latin('840Wh battery')).toEqual(['840Wh battery']);
  expect(latin('900Wh Battery')).toEqual(['900Wh Battery']);
  expect(latin('3D-forged alloy')).toEqual(['3D-forged alloy']);
  expect(latin('بطارية 600Wh Battery · 12 سرعة')).toEqual(['600Wh Battery']);
  // Un nombre suivi d'arabe ou d'un signe ne forme pas de suite latine.
  expect(latin('بمقاس 27.5×2.4 بوصة')).toEqual([]);
  expect(latin('من فئة 500مم')).toEqual([]);
});

test('la découpe restitue le texte entier, sans perte ni doublon', () => {
  for (const text of [
    'هنا عمود كربوني بشكل انسيابي (aero) خاص بدراجة Madone.',
    'جزء من تجهيز هذه النسخة (EQ). الطراز: Lezyne E500+.',
    'هذا من ألومنيوم Alpha من فئة 300 Series.',
    'الطراز: Canyon Strive:ON · 170 مم',
  ]) {
    expect(latinRuns(text).map((r) => r.text).join('')).toBe(text);
  }
});
