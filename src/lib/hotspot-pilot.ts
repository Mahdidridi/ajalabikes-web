import type { Build, Locale } from '@/lib/api';

/**
 * Pilote des hotspots éditoriaux (web #49, étape 1) — données des cinq fiches annotées.
 *
 * Décisions du fondateur du 10 octobre 2026 : la vraie photo reste intacte ; autour d'elle, des
 * notes « de connaisseur » à l'esprit dessiné à la main. Ligne principale = marque + modèle + chiffre
 * clé quand la donnée existe ; seconde ligne = nom de la pièce ; sur mobile, une note qui dit ce
 * qu'est la pièce, à quoi elle sert et ce que ce vélo a. On explique, on ne juge jamais.
 *
 * NE JAMAIS INVENTER : chaque point cite le texte exact que l'API sert (`equipment_specs`,
 * `components[].description`, `sizes[].wheel_size`) — `tests/preview/pilot-data.spec.ts` le
 * vérifie contre l'API. Une valeur tirée d'un texte libre est SAISIE pour le pilote (`isEntered`) :
 * jamais déployée, elle dit au bilan ce que Laravel devra servir.
 * Pièges : « Max brake rotor sizes » et « Max fork travel » (Trek) sont des compatibilités, jamais
 * l'équipement monté ; une capacité de batterie ne donne jamais une autonomie.
 *
 * Coordonnées : `dot` en % de la photo `detail` (identifiée par `media`) ; `label` en % de la scène
 * (photo + marges, voir `AnnotatedPhoto`). Elles ne valent que pour CETTE photo : `pilotFor` refuse
 * toute autre image, la fiche retombe alors sur la galerie ordinaire.
 */

export type PilotLayer = 'equipment_specs' | 'components' | 'sizes';

export interface PilotSource {
  layer: PilotLayer;
  /** equipment_specs : item.label · components : component.key · sizes : 'wheel_size' */
  ref: string;
  /** citation exacte d'un texte servi par l'API en en-sa */
  quote: string;
}

export type PilotKind =
  | 'frame' | 'fork' | 'shock' | 'seatpost' | 'drivetrain' | 'brake' | 'wheels' | 'tyre'
  | 'handlebar' | 'crankset' | 'motor' | 'battery' | 'light' | 'rack' | 'fender';

/** Côté du vélo où se trouve la note : son texte s'aligne contre le trait, quel que soit le sens de lecture. */
export type LabelAlign = 'left' | 'right' | 'top' | 'bottom';

export interface PilotPoint {
  id: string;
  kind: PilotKind;
  dot: { x: number; y: number };
  label: { x: number; y: number; align: LabelAlign };
  main: Record<Locale, string>;
  part: Record<Locale, string>;
  note: Record<Locale, string>;
  sources: PilotSource[];
}

export interface PilotBike {
  key: 'talon' | 'anthem' | 'madone' | 'checkpoint' | 'vado';
  brand: string;
  slug: string;
  modelName: string;
  year: number;
  category: 'road' | 'gravel' | 'cross_country' | 'e_city';
  electric: boolean;
  media: { id: number; w: number; h: number };
  points: PilotPoint[];
}

const c = (ref: string, quote: string): PilotSource => ({ layer: 'components', ref, quote });
const e = (ref: string, quote: string): PilotSource => ({ layer: 'equipment_specs', ref, quote });
const s = (quote: string): PilotSource => ({ layer: 'sizes', ref: 'wheel_size', quote });

/**
 * Une valeur tirée d'un texte libre (`components[].description` : noms de marque et de modèle, références) a été SAISIE
 * pour le pilote : l'API ne la sert pas sous forme normalisée, c'est ce que Laravel devra servir. `equipment_specs` et
 * `sizes` sont servis normalisés. Se lit à la source, jamais au point (relecture du 10 octobre 2026 : un drapeau par
 * point, posé sur les 34, ne distinguait plus rien — une ligne principale mêle presque toujours les deux).
 */
export const isEntered = (source: PilotSource): boolean => source.layer === 'components';

export const PILOT_BIKES: readonly PilotBike[] = [
  {
    key: 'talon',
    brand: 'giant',
    slug: 'talon-1',
    modelName: 'Talon 1',
    year: 2027,
    category: 'cross_country',
    electric: false,
    media: { id: 5188, w: 800, h: 600 },
    points: [
      {
        id: 'seatpost', kind: 'seatpost',
        dot: { x: 36, y: 28.17 }, label: { x: 22.5, y: 30, align: 'left' },
        main: { 'en-sa': 'Giant Sport', 'ar-sa': 'Giant Sport' },
        part: { 'en-sa': 'Seatpost', 'ar-sa': 'عمود السرج' },
        note: {
          'en-sa': 'The seatpost holds the saddle; raising or lowering it sets your pedalling height. On this bike: Giant Sport.',
          'ar-sa': 'عمود السرج يحمل السرج، ورفعه أو خفضه يضبط ارتفاعك أثناء التبديل. في هذه الدراجة: Giant Sport.',
        },
        sources: [c('Seatpost', 'Giant Sport, 30.9, SP217')],
      },
      {
        id: 'frame', kind: 'frame',
        dot: { x: 50, y: 32.5 }, label: { x: 54, y: 14, align: 'top' },
        main: { 'en-sa': 'ALUXX aluminium', 'ar-sa': 'ألومنيوم ALUXX' },
        part: { 'en-sa': 'Frame', 'ar-sa': 'الهيكل' },
        note: {
          'en-sa': "The frame is the bike's backbone: every other part is fixed to it. This one is ALUXX-grade butted aluminium.",
          'ar-sa': 'الهيكل هو العمود الفقري للدراجة، وتُثبَّت عليه بقية القطع. هيكل هذه الدراجة من ألومنيوم ALUXX متدرّج السماكة.',
        },
        sources: [e('Frame material', 'Aluminium'), c('Frame', 'ALUXX-Grade Butted Aluminum')],
      },
      {
        id: 'fork', kind: 'fork',
        dot: { x: 70.63, y: 36.33 }, label: { x: 77.5, y: 32, align: 'right' },
        main: { 'en-sa': 'Giant SXC32-2 · 80 / 100 mm', 'ar-sa': 'Giant SXC32-2 · 80 / 100 مم' },
        part: { 'en-sa': 'Suspension fork · by size', 'ar-sa': 'الشوكة المعلّقة · حسب المقاس' },
        note: {
          'en-sa': 'The suspension fork absorbs bumps at the front; its travel is how far it can compress: 80 mm with 27.5" wheels, 100 mm with 29" wheels. The wheel size follows the frame size.',
          'ar-sa': 'الشوكة المعلّقة تمتص الصدمات في الأمام، وشوطها هو المسافة التي تنضغط فيها: 80 مم مع عجلات 27.5 بوصة، و100 مم مع عجلات 29 بوصة، ومقاس العجلة يتبع مقاس الهيكل.',
        },
        sources: [
          e('Fork travel', '80 mm / 100 mm'),
          c('Fork', 'SXC32-2'),
          c('Fork', '80mm(27.5")/100mm(29")'),
          s('XS=27.5"'),
          s('M=29"'),
        ],
      },
      {
        id: 'brake', kind: 'brake',
        dot: { x: 76.5, y: 57.33 }, label: { x: 77.5, y: 62, align: 'right' },
        main: { 'en-sa': 'Tektro HD M3121 · 180 mm disc', 'ar-sa': 'Tektro HD M3121 · قرص 180 مم' },
        part: { 'en-sa': 'Front brake · hydraulic disc', 'ar-sa': 'الفرامل الأمامية · قرصية هيدروليكية' },
        note: {
          'en-sa': 'Hydraulic disc brakes squeeze a rotor fixed to the wheel hub; a bigger rotor gives more braking leverage. Front rotor 180 mm, rear 160 mm.',
          'ar-sa': 'الفرامل القرصية الهيدروليكية تضغط على قرص مثبّت في محور العجلة، والقرص الأكبر يمنح قوة كبح أكبر. القرص الأمامي هنا 180 مم والخلفي 160 مم.',
        },
        sources: [
          e('Front brake brand', 'Tektro'),
          e('Front brake type', 'Hydraulic disc'),
          e('Front brake rotor diameter', '180 mm'),
          c('Brakes', 'Tektro HD M3121, hydraulic, Tektro rotors [F]180mm, [R]160mm'),
        ],
      },
      {
        id: 'tyres', kind: 'tyre',
        dot: { x: 92, y: 75.67 }, label: { x: 72, y: 87, align: 'bottom' },
        main: { 'en-sa': 'Maxxis Rekon / Rekon Race · 27.5 or 29 in', 'ar-sa': 'Maxxis Rekon / Rekon Race · 27.5 أو 29 بوصة' },
        part: { 'en-sa': 'Tyres · by size', 'ar-sa': 'الإطارات · حسب المقاس' },
        note: {
          'en-sa': 'Tyres are the only contact with the ground: their size and tread decide grip. Maxxis Rekon 27.5 x 2.4" on size XS, Rekon Race 29 x 2.4" on the other sizes.',
          'ar-sa': 'الإطارات هي نقطة التماس الوحيدة مع الأرض، ومقاسها ونقشها يحددان الثبات. Maxxis Rekon بمقاس 27.5×2.4 بوصة في المقاس XS، وRekon Race بمقاس 29×2.4 بوصة في بقية المقاسات.',
        },
        sources: [
          e('Front tyre brand', 'Maxxis'),
          c('Tires', 'Maxxis Rekon 27.5x2.4" or Maxxis Rekon Race 29x2.4"'),
          s('XS=27.5"'),
          s('L=29"'),
        ],
      },
      {
        id: 'derailleur', kind: 'drivetrain',
        dot: { x: 20.75, y: 69 }, label: { x: 22.5, y: 64, align: 'left' },
        main: { 'en-sa': 'microSHIFT Advent · 11 speeds', 'ar-sa': 'microSHIFT Advent · 11 سرعة' },
        part: { 'en-sa': 'Rear derailleur', 'ar-sa': 'المُبدّل الخلفي' },
        note: {
          'en-sa': 'The rear derailleur moves the chain across the cassette to change gear. Here: microSHIFT Advent, 1 x 11 — one chainring and 11 speeds.',
          'ar-sa': 'المُبدّل الخلفي ينقل السلسلة بين تروس الكاسيت لتغيير السرعة. هنا microSHIFT Advent بنظام 1×11: ترس أمامي واحد و11 سرعة.',
        },
        sources: [c('Rear Derailleur', 'microSHIFT Advent, clutch'), c('Shifters', 'microSHIFT Advent, 1x11')],
      },
    ],
  },
  {
    key: 'anthem',
    brand: 'giant',
    slug: 'anthem-advanced-sl-0',
    modelName: 'Anthem Advanced SL 0',
    year: 2026,
    category: 'cross_country',
    electric: false,
    media: { id: 5141, w: 800, h: 600 },
    points: [
      {
        id: 'dropper', kind: 'seatpost',
        dot: { x: 35.25, y: 21.67 }, label: { x: 22.5, y: 27, align: 'left' },
        main: { 'en-sa': 'Giant Contact Switch SL · 110 / 140 mm', 'ar-sa': 'Giant Contact Switch SL · 110 / 140 مم' },
        part: { 'en-sa': 'Dropper post · by size', 'ar-sa': 'عمود سرج قابل للخفض · حسب المقاس' },
        note: {
          'en-sa': 'A dropper post lowers the saddle from a remote on the handlebar, so you can move freely on descents. Travel: 110 mm on size S, 140 mm on M and L; not stated for XL.',
          'ar-sa': 'عمود السرج القابل للخفض يُنزل السرج بزر على المقود لتتحرك بحرية في المنحدرات. شوطه 110 مم في المقاس S و140 مم في المقاسين M وL، ولم يُذكر للمقاس XL.',
        },
        sources: [c('Seatpost', 'Giant Contact Switch SL dropper, remote S: 110mm travel / 30.9 x 395mm M: 140mm travel / 30.9 x 395mm L: 140mm travel')],
      },
      {
        id: 'shock', kind: 'shock',
        dot: { x: 48, y: 37.17 }, label: { x: 42, y: 14, align: 'top' },
        main: { 'en-sa': 'RockShox SidLuxe Ultimate · 120 mm', 'ar-sa': 'RockShox SidLuxe Ultimate · 120 مم' },
        part: { 'en-sa': 'Rear shock', 'ar-sa': 'ممتص الصدمات الخلفي' },
        note: {
          'en-sa': 'The rear shock lets the back wheel move over bumps. This frame gives 120 mm of rear-wheel travel.',
          'ar-sa': 'ممتص الصدمات الخلفي يسمح للعجلة الخلفية بالتحرك فوق العوائق. شوط العجلة الخلفية في هذا الهيكل 120 مم.',
        },
        sources: [c('Shock', 'RockShox SidLuxe Ultimate'), c('Frame', '120mm FlexPoint Pro suspension')],
      },
      {
        id: 'frame', kind: 'frame',
        dot: { x: 61.88, y: 27.5 }, label: { x: 64, y: 14, align: 'top' },
        main: { 'en-sa': 'Advanced SL composite', 'ar-sa': 'كومبوزيت Advanced SL' },
        part: { 'en-sa': 'Frame', 'ar-sa': 'الهيكل' },
        note: {
          'en-sa': "The frame is the bike's backbone. Front and rear triangles in Advanced SL-grade composite; frame weight 1,530 g in size M.",
          'ar-sa': 'الهيكل هو العمود الفقري للدراجة. مثلثاه الأمامي والخلفي من كومبوزيت Advanced SL، ووزنه 1530 غرامًا بالمقاس M.',
        },
        sources: [c('Frame', 'Advanced SL-grade composite front and rear triangles'), c('Frame', 'Frame weight 1530 grams (size medium)')],
      },
      {
        id: 'fork', kind: 'fork',
        dot: { x: 73.63, y: 47 }, label: { x: 77.5, y: 40, align: 'right' },
        main: { 'en-sa': 'RockShox Sid Ultimate 3P · 120 mm', 'ar-sa': 'RockShox Sid Ultimate 3P · 120 مم' },
        part: { 'en-sa': 'Suspension fork', 'ar-sa': 'الشوكة المعلّقة' },
        note: {
          'en-sa': 'The suspension fork absorbs bumps at the front; its travel is how far it can compress: 120 mm here, with a remote lockout on the handlebar.',
          'ar-sa': 'الشوكة المعلّقة تمتص الصدمات في الأمام، وشوطها هو المسافة التي تنضغط فيها: 120 مم هنا، مع قفل يُتحكَّم به من المقود.',
        },
        sources: [e('Fork brand', 'RockShox'), e('Fork travel', '120 mm'), c('Fork', 'RockShox Sid Ultimate 3P, 120mm'), c('Fork', 'remote lockout')],
      },
      {
        id: 'tyres', kind: 'tyre',
        dot: { x: 92, y: 77.5 }, label: { x: 77.5, y: 70, align: 'right' },
        main: { 'en-sa': 'Maxxis Aspen · 29 x 2.4 in', 'ar-sa': 'Maxxis Aspen · 29×2.4 بوصة' },
        part: { 'en-sa': 'Tyres', 'ar-sa': 'الإطارات' },
        note: {
          'en-sa': 'Tyres are the only contact with the ground: their size and tread decide grip. Here: Maxxis Aspen 29 x 2.4", tubeless.',
          'ar-sa': 'الإطارات هي نقطة التماس الوحيدة مع الأرض، ومقاسها ونقشها يحددان الثبات. هنا Maxxis Aspen بمقاس 29×2.4 بوصة، بنظام Tubeless.',
        },
        sources: [e('Front tyre brand', 'Maxxis'), c('Tires', 'Maxxis Aspen 29x2.4'), c('Tires', 'tubeless')],
      },
      {
        id: 'crankset', kind: 'crankset',
        dot: { x: 41.75, y: 63.5 }, label: { x: 50, y: 86, align: 'bottom' },
        main: { 'en-sa': 'SRAM XX SL · Quark power meter', 'ar-sa': 'SRAM XX SL · مقياس قدرة Quark' },
        part: { 'en-sa': 'Crankset', 'ar-sa': 'مجموعة الدوّاسات' },
        note: {
          'en-sa': 'The crankset turns your pedalling into chain movement. This one has a built-in Quark power meter, which measures your effort in watts, and a 34-tooth chainring.',
          'ar-sa': 'مجموعة الدوّاسات تحوّل حركة ساقيك إلى حركة السلسلة. هذه تضم مقياس قدرة Quark يقيس جهدك بالواط، وترسًا أماميًا من 34 سنًّا.',
        },
        sources: [c('Crankset', 'SRAM XX SL Eagle Transmission with Quark power meter 34t'), e('Chainring teeth', '34')],
      },
      {
        id: 'derailleur', kind: 'drivetrain',
        dot: { x: 20.75, y: 71 }, label: { x: 22.5, y: 66, align: 'left' },
        main: { 'en-sa': 'SRAM XX SL Eagle Transmission · 12 speeds', 'ar-sa': 'SRAM XX SL Eagle Transmission · 12 سرعة' },
        part: { 'en-sa': 'Rear derailleur', 'ar-sa': 'المُبدّل الخلفي' },
        note: {
          'en-sa': 'The rear derailleur moves the chain across the cassette to change gear. Here a 1 x 12 drivetrain with SRAM AXS Pod shifters.',
          'ar-sa': 'المُبدّل الخلفي ينقل السلسلة بين تروس الكاسيت لتغيير السرعة. هنا نظام 1×12 مع أذرع تعشيق SRAM AXS Pod.',
        },
        sources: [e('Rear derailleur brand', 'SRAM'), c('Rear Derailleur', 'SRAM XX SL Eagle Transmission'), c('Shifters', 'SRAM AXS Pod, 1x12')],
      },
    ],
  },
  {
    key: 'madone',
    brand: 'trek',
    slug: 'madone-sl-6-gen-8',
    modelName: 'Madone SL 6 Gen 8',
    year: 2027,
    category: 'road',
    electric: false,
    media: { id: 3403, w: 800, h: 600 },
    points: [
      {
        id: 'seatpost', kind: 'seatpost',
        dot: { x: 33.5, y: 27.33 }, label: { x: 22.5, y: 30, align: 'left' },
        main: { 'en-sa': 'Madone aero · carbon', 'ar-sa': 'Madone aero · كربون' },
        part: { 'en-sa': 'Seatpost', 'ar-sa': 'عمود السرج' },
        note: {
          'en-sa': 'The seatpost holds the saddle at your pedalling height. Here an aero carbon post made for the Madone.',
          'ar-sa': 'عمود السرج يحمل السرج على ارتفاع التبديل المناسب. هنا عمود كربوني بشكل انسيابي (aero) خاص بدراجة Madone.',
        },
        sources: [c('specSeatpost', 'Madone aero carbon seatpost')],
      },
      {
        id: 'frame', kind: 'frame',
        dot: { x: 55, y: 35.5 }, label: { x: 50, y: 14, align: 'top' },
        main: { 'en-sa': 'OCLV 500 Series carbon', 'ar-sa': 'كربون OCLV 500 Series' },
        part: { 'en-sa': 'Frame', 'ar-sa': 'الهيكل' },
        note: {
          'en-sa': "The frame is the bike's backbone. This one is 500 Series OCLV carbon, with Full System Foil tube shaping.",
          'ar-sa': 'الهيكل هو العمود الفقري للدراجة. هذا من كربون OCLV من فئة 500 Series، بأنابيب بتصميم Full System Foil.',
        },
        sources: [c('shortSpecFrame', '500 Series OCLV Carbon'), c('specFrame', 'Full System Foil tube shaping')],
      },
      {
        id: 'handlebar', kind: 'handlebar',
        dot: { x: 73, y: 29.17 }, label: { x: 70, y: 14, align: 'top' },
        main: { 'en-sa': 'Bontrager Comp · alloy', 'ar-sa': 'Bontrager Comp · سبيكة معدنية' },
        part: { 'en-sa': 'Handlebar', 'ar-sa': 'المقود' },
        note: {
          'en-sa': 'The handlebar is where you steer and hold on; its width and shape set your hand position. Here: Bontrager Comp, alloy.',
          'ar-sa': 'المقود هو موضع التوجيه والإمساك، وعرضه وشكله يحددان وضعية اليدين. هنا Bontrager Comp من سبيكة معدنية.',
        },
        sources: [c('shortSpecHandlebar', 'Bontrager Comp, alloy')],
      },
      {
        id: 'fork', kind: 'fork',
        dot: { x: 75, y: 56.33 }, label: { x: 77.5, y: 48, align: 'right' },
        main: { 'en-sa': 'Madone Gen 8 · carbon', 'ar-sa': 'Madone Gen 8 · كربون' },
        part: { 'en-sa': 'Fork', 'ar-sa': 'الشوكة' },
        note: {
          'en-sa': 'The fork holds the front wheel and steers it. This one is full carbon, with a tapered carbon steerer.',
          'ar-sa': 'الشوكة تحمل العجلة الأمامية وتوجّهها. هذه من الكربون بالكامل، بساق توجيه كربونية مستدقّة.',
        },
        sources: [c('specFork', 'Madone Gen 8 full carbon, tapered carbon steerer')],
      },
      {
        id: 'tyres', kind: 'tyre',
        dot: { x: 93.13, y: 90.33 }, label: { x: 72, y: 86, align: 'bottom' },
        main: { 'en-sa': 'Bontrager Aeolus Pro · 700 x 28 mm', 'ar-sa': 'Bontrager Aeolus Pro · 700×28 مم' },
        part: { 'en-sa': 'Tyres', 'ar-sa': 'الإطارات' },
        note: {
          'en-sa': 'Road tyres: 700 is the wheel size and 28 mm the tyre width; the width affects comfort and grip.',
          'ar-sa': 'إطارات طريق: 700 هو مقاس العجلة و28 مم عرض الإطار، والعرض يؤثر في الراحة والثبات.',
        },
        sources: [c('shortSpecTires', 'Bontrager Aeolus Pro, 700x28 mm')],
      },
      {
        id: 'wheels', kind: 'wheels',
        dot: { x: 10, y: 70 }, label: { x: 22.5, y: 56, align: 'left' },
        main: { 'en-sa': 'Bontrager Aeolus Elite 50 · carbon', 'ar-sa': 'Bontrager Aeolus Elite 50 · كربون' },
        part: { 'en-sa': 'Wheels', 'ar-sa': 'العجلات' },
        note: {
          'en-sa': 'The wheels carry the tyres and spin on the hubs. These are OCLV carbon and tubeless ready: they can run without inner tubes.',
          'ar-sa': 'العجلات تحمل الإطارات وتدور على المحاور. هذه من كربون OCLV وجاهزة لنظام Tubeless، أي يمكن استعمالها دون أنابيب داخلية.',
        },
        sources: [c('shortSpecWheels', 'Bontrager Aeolus Elite 50, OCLV Carbon'), c('specWheels', 'Tubeless Ready')],
      },
      {
        id: 'drivetrain', kind: 'drivetrain',
        dot: { x: 21.88, y: 76 }, label: { x: 36, y: 86, align: 'bottom' },
        main: { 'en-sa': 'Shimano 105 Di2 · 2 x 12', 'ar-sa': 'Shimano 105 Di2 · 2×12' },
        part: { 'en-sa': 'Drivetrain', 'ar-sa': 'مجموعة النقل' },
        note: {
          'en-sa': 'Chainrings, cassette and derailleurs set your range of gears: 2 x 12 means two chainrings and twelve cogs at the back. Here: Shimano 105 Di2.',
          'ar-sa': 'التروس الأمامية والكاسيت والمبدّلات تحدد نطاق السرعات: 2×12 تعني ترسين أماميين و12 ترسًا خلفيًا. هنا Shimano 105 Di2.',
        },
        sources: [c('shortSpecDrivetrain', 'Shimano 105 Di2, 2x12')],
      },
    ],
  },
  {
    key: 'checkpoint',
    brand: 'trek',
    slug: 'checkpoint-alr-5-gen-3',
    modelName: 'Checkpoint ALR 5 Gen 3',
    year: 2027,
    category: 'gravel',
    electric: false,
    media: { id: 3725, w: 800, h: 600 },
    points: [
      {
        id: 'frame', kind: 'frame',
        dot: { x: 52, y: 38.5 }, label: { x: 48, y: 14, align: 'top' },
        main: { 'en-sa': '300 Series Alpha aluminium', 'ar-sa': 'ألومنيوم 300 Series Alpha' },
        part: { 'en-sa': 'Frame', 'ar-sa': 'الهيكل' },
        note: {
          'en-sa': "The frame is the bike's backbone. This one is 300 Series Alpha aluminium.",
          'ar-sa': 'الهيكل هو العمود الفقري للدراجة. هذا من ألومنيوم Alpha من فئة 300 Series.',
        },
        sources: [c('shortSpecFrame', '300 Series Alpha Aluminium')],
      },
      {
        id: 'handlebar', kind: 'handlebar',
        dot: { x: 72.5, y: 28.67 }, label: { x: 70, y: 14, align: 'top' },
        main: { 'en-sa': 'Bontrager Elite Gravel · alloy', 'ar-sa': 'Bontrager Elite Gravel · سبيكة معدنية' },
        part: { 'en-sa': 'Handlebar', 'ar-sa': 'المقود' },
        note: {
          'en-sa': 'The handlebar is where you steer and hold on; its width and shape set your hand position. Here: Bontrager Elite Gravel, alloy.',
          'ar-sa': 'المقود هو موضع التوجيه والإمساك، وعرضه وشكله يحددان وضعية اليدين. هنا Bontrager Elite Gravel من سبيكة معدنية.',
        },
        sources: [c('shortSpecHandlebar', 'Bontrager Elite Gravel, alloy')],
      },
      {
        id: 'fork', kind: 'fork',
        dot: { x: 75.13, y: 59.5 }, label: { x: 77.5, y: 48, align: 'right' },
        main: { 'en-sa': 'Checkpoint · full carbon', 'ar-sa': 'Checkpoint · كربون بالكامل' },
        part: { 'en-sa': 'Fork', 'ar-sa': 'الشوكة' },
        note: {
          'en-sa': 'The fork holds the front wheel and steers it. This one is full carbon.',
          'ar-sa': 'الشوكة تحمل العجلة الأمامية وتوجّهها. هذه من الكربون بالكامل.',
        },
        sources: [c('shortSpecFork', 'Checkpoint full carbon')],
      },
      {
        id: 'tyres', kind: 'tyre',
        dot: { x: 93.88, y: 91.17 }, label: { x: 72, y: 86, align: 'bottom' },
        main: { 'en-sa': 'Bontrager Girona Pro · 700 x 42 mm', 'ar-sa': 'Bontrager Girona Pro · 700×42 مم' },
        part: { 'en-sa': 'Tyres', 'ar-sa': 'الإطارات' },
        note: {
          'en-sa': 'Gravel tyres: 700 is the wheel size and 42 mm the tyre width; the width affects comfort and grip on loose ground.',
          'ar-sa': 'إطارات الحصى (Gravel): 700 هو مقاس العجلة و42 مم عرض الإطار، والعرض يؤثر في الراحة والثبات على الأرض غير الممهّدة.',
        },
        sources: [c('shortSpecTires', 'Bontrager Girona Pro, 700x42 mm')],
      },
      {
        id: 'wheels', kind: 'wheels',
        dot: { x: 9, y: 75 }, label: { x: 22.5, y: 56, align: 'left' },
        main: { 'en-sa': 'Bontrager Paradigm 23', 'ar-sa': 'Bontrager Paradigm 23' },
        part: { 'en-sa': 'Wheels', 'ar-sa': 'العجلات' },
        note: {
          'en-sa': 'The wheels carry the tyres and spin on the hubs. Here: Bontrager Paradigm 23.',
          'ar-sa': 'العجلات تحمل الإطارات وتدور على المحاور. هنا Bontrager Paradigm 23.',
        },
        sources: [c('shortSpecWheels', 'Bontrager Paradigm 23')],
      },
      {
        id: 'drivetrain', kind: 'drivetrain',
        dot: { x: 20, y: 83.33 }, label: { x: 36, y: 86, align: 'bottom' },
        main: { 'en-sa': 'SRAM Apex XPLR · 12 speeds', 'ar-sa': 'SRAM Apex XPLR · 12 سرعة' },
        part: { 'en-sa': 'Drivetrain', 'ar-sa': 'مجموعة النقل' },
        note: {
          'en-sa': 'Chainring, cassette and derailleur set your range of gears. Here: SRAM Apex XPLR with 12 speeds.',
          'ar-sa': 'الترس الأمامي والكاسيت والمبدّل تحدد نطاق السرعات. هنا SRAM Apex XPLR بـ12 سرعة.',
        },
        sources: [c('shortSpecDrivetrain', 'SRAM Apex XPLR, 12-speed')],
      },
    ],
  },
  {
    key: 'vado',
    brand: 'specialized',
    slug: 'turbo-vado-sl-2-5-0-step-through-eq',
    modelName: 'Turbo Vado SL 2 5.0 Step-Through EQ',
    year: 2026,
    category: 'e_city',
    electric: true,
    media: { id: 4913, w: 800, h: 450 },
    points: [
      {
        id: 'headlight', kind: 'light',
        dot: { x: 63.5, y: 10 }, label: { x: 72, y: 17, align: 'top' },
        main: { 'en-sa': 'Lezyne E500+', 'ar-sa': 'Lezyne E500+' },
        part: { 'en-sa': 'Headlight', 'ar-sa': 'المصباح الأمامي' },
        note: {
          'en-sa': 'The headlight is part of this equipped (EQ) version. Model: Lezyne EBike Power STVZO E500+.',
          'ar-sa': 'المصباح الأمامي جزء من تجهيز هذه النسخة (EQ). الطراز: Lezyne EBike Power STVZO E500+.',
        },
        sources: [c('Headlight', 'Lezyne EBike Power STVZO E500+')],
      },
      {
        id: 'rack', kind: 'rack',
        dot: { x: 21, y: 31 }, label: { x: 28, y: 17, align: 'top' },
        main: { 'en-sa': 'Turbo SL Rack · 27 kg', 'ar-sa': 'Turbo SL Rack · 27 كجم' },
        part: { 'en-sa': 'Rear rack', 'ar-sa': 'حامل الأمتعة' },
        note: {
          'en-sa': 'The rear rack carries bags or a basket. This one takes up to 27 kg and is MIK HD compatible.',
          'ar-sa': 'حامل الأمتعة الخلفي يحمل الحقائب أو السلة، وحمولته 27 كجم، ومتوافق مع نظام MIK HD.',
        },
        sources: [c('Rack', 'Turbo SL Rack, MIK HD-Compatible, 27kg')],
      },
      {
        id: 'battery', kind: 'battery',
        dot: { x: 56, y: 42 }, label: { x: 50, y: 17, align: 'top' },
        main: { 'en-sa': 'Specialized SL2-520 · 520 Wh', 'ar-sa': 'Specialized SL2-520 · 520 واط ساعة' },
        part: { 'en-sa': 'Battery · fully integrated', 'ar-sa': 'البطارية · مدمجة بالكامل' },
        note: {
          'en-sa': 'The battery feeds the motor; its capacity is 520 Wh. Range depends on the assistance level, the route and the rider, so it is not given here.',
          'ar-sa': 'البطارية تغذّي المحرّك، وسعتها 520 واط ساعة. المدى يتوقف على مستوى المساعدة والطريق والراكب، لذا لا نذكره هنا.',
        },
        sources: [c('Battery', 'Specialized SL2-520, Fully Integrated, 520Wh')],
      },
      {
        id: 'brakes', kind: 'brake',
        dot: { x: 75, y: 61 }, label: { x: 77.5, y: 44, align: 'right' },
        main: { 'en-sa': 'Tektro HD-R510 · 160 mm discs', 'ar-sa': 'Tektro HD-R510 · أقراص 160 مم' },
        part: { 'en-sa': 'Brakes · hydraulic disc', 'ar-sa': 'الفرامل · قرصية هيدروليكية' },
        note: {
          'en-sa': 'Hydraulic disc brakes squeeze a rotor fixed to the wheel hub. Here 160 mm rotors front and rear.',
          'ar-sa': 'الفرامل القرصية الهيدروليكية تضغط على قرص مثبّت في محور العجلة. هنا أقراص 160 مم في الأمام والخلف.',
        },
        sources: [
          e('Front brake brand', 'Tektro'),
          e('Front brake type', 'Hydraulic disc'),
          e('Front brake rotor diameter', '160 mm'),
          e('Rear brake rotor diameter', '160 mm'),
          c('Front Brake', 'Tektro HD-R510, hydraulic disc, 160mm'),
        ],
      },
      {
        id: 'tyres', kind: 'tyre',
        dot: { x: 92.5, y: 62 }, label: { x: 77.5, y: 66, align: 'right' },
        main: { 'en-sa': 'Specialized Hemisphere · 47 mm', 'ar-sa': 'Specialized Hemisphere · 47 مم' },
        part: { 'en-sa': 'Tyres', 'ar-sa': 'الإطارات' },
        note: {
          'en-sa': 'All-terrain tyres with flat protection and reflective sidewalls, 47 mm wide.',
          'ar-sa': 'إطارات لجميع التضاريس بحماية من الثقوب وجوانب عاكسة للضوء، بعرض 47 مم.',
        },
        sources: [
          e('Front tyre brand', 'Specialized'),
          e('Front tyre width', '47 mm'),
          c('Front Tire', 'Specialized Hemisphere flat protection, Reflective side walls, Wirebead, All terrain tire'),
        ],
      },
      {
        id: 'motor', kind: 'motor',
        dot: { x: 48, y: 63 }, label: { x: 54, y: 83, align: 'bottom' },
        main: { 'en-sa': 'Specialized 1.2 SL System', 'ar-sa': 'Specialized 1.2 SL System' },
        part: { 'en-sa': 'Motor', 'ar-sa': 'المحرّك' },
        note: {
          'en-sa': 'The motor assists your pedalling, which makes climbs and loads easier. Here: Specialized 1.2 SL System.',
          'ar-sa': 'المحرّك يساعدك على التبديل، فيخفّف الجهد في الصعود ومع الحمولة. هنا Specialized 1.2 SL System.',
        },
        sources: [c('Motor', 'Specialized 1.2 SL System')],
      },
      {
        id: 'frame', kind: 'frame',
        dot: { x: 40, y: 50 }, label: { x: 22.5, y: 44, align: 'left' },
        main: { 'en-sa': 'Vado SL · step-through', 'ar-sa': 'Vado SL · هيكل منخفض' },
        part: { 'en-sa': 'Frame', 'ar-sa': 'الهيكل' },
        note: {
          'en-sa': 'A step-through frame has no high top tube, so getting on and off is easy.',
          'ar-sa': 'الهيكل المنخفض (Step-through) بلا أنبوب علوي مرتفع، فيسهل الصعود إلى الدراجة والنزول منها.',
        },
        sources: [c('Frame', '2025 Vado SL Step-through')],
      },
      {
        id: 'derailleur', kind: 'drivetrain',
        dot: { x: 23, y: 81 }, label: { x: 22.5, y: 70, align: 'left' },
        main: { 'en-sa': 'Shimano Cues · 11 speeds', 'ar-sa': 'Shimano Cues · 11 سرعة' },
        part: { 'en-sa': 'Rear derailleur', 'ar-sa': 'المُبدّل الخلفي' },
        note: {
          'en-sa': 'The rear derailleur moves the chain across the 11-50 cassette: 11 speeds.',
          'ar-sa': 'المُبدّل الخلفي ينقل السلسلة بين تروس الكاسيت 11-50: إحدى عشرة سرعة.',
        },
        sources: [
          e('Rear derailleur brand', 'Shimano'),
          e('Cassette speeds', '11'),
          e('Cassette teeth', '11/50'),
          c('Rear Derailleur', 'Shimano Cues 11-speed, RD-U8000'),
        ],
      },
    ],
  },
];

/** Textes d'interface du composant, déjà composés (règle des composants client). */
export const PILOT_COPY = {
  'en-sa': {
    toggle: 'Annotations',
    close: 'Close',
    point: 'Point',
    unavailable: 'Photo unavailable',
    hint: 'Tap a number to see the part.',
  },
  'ar-sa': {
    toggle: 'الشروح',
    close: 'إغلاق',
    point: 'النقطة',
    unavailable: 'الصورة غير متاحة',
    hint: 'المس رقمًا لترى القطعة.',
  },
} as const satisfies Record<Locale, { toggle: string; close: string; point: string; unavailable: string; hint: string }>;

export type PilotCopy = (typeof PILOT_COPY)[Locale];

export function pilotBike(key: string): PilotBike | null {
  return PILOT_BIKES.find((bike) => bike.key === key) ?? null;
}

/** Le pilote ne s'applique que si l'API sert exactement le vélo ET la photo annotés. */
export function pilotFor(build: Build, key: string): PilotBike | null {
  const bike = pilotBike(key);
  if (!bike) return null;
  const head = build.images[0];
  const sameBike =
    build.brand.slug === bike.brand &&
    build.slug === bike.slug &&
    build.model_name === bike.modelName &&
    build.year === bike.year &&
    build.category?.key === bike.category;
  const samePhoto = head?.id === bike.media.id && head.sizes.detail.w === bike.media.w && head.sizes.detail.h === bike.media.h;
  return sameBike && samePhoto ? bike : null;
}
