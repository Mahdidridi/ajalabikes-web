import type { Locale } from '@/lib/api';

/**
 * Le mot générique « vélo », dans la langue de la page — et son accord avec
 * un nombre.
 *
 * Décision du 4 septembre 2026, d'après deux remesures qui ont annulé celle du
 * 3 septembre (`notes/vocabulaire-verification-2026-09-04.md`) : le mot est
 * « دراجة / دراجات ». « سيكل » a été retiré du site.
 *
 * Ce que les mesures ont montré, dans l'ordre où ça compte :
 * — « سيكل » ne veut pas d'abord dire vélo. Tapé nu en Arabie, Google propose
 *   six médicaments sur dix (سيكلوف, سيكلوبيروكس) et, en tête des suites,
 *   « سيكل الدورة الشهرية » — le cycle menstruel. Le mot transcrit l'anglais
 *   « cycle » et en importe tous les sens.
 * — Quand il désigne un vélo, c'est un vélo d'enfant : six suites sur dix sont
 *   اطفال, رامبو, كوبرا, بنات, مقاس 20, ثلاث كفرات. Aucune n'est adulte.
 * — Sur « أفضل … », les deux mots divergent : سيكل donne « رامبو ولا كوبرا »
 *   et le vélo d'appartement ; دراجة donne هجين, للمسافات الطويلة, قابلة للطي —
 *   le vocabulaire de qui choisit vraiment un vélo, c'est-à-dire notre trafic.
 * — Dix-sept boutiques du Golfe sur dix-sept écrivent دراجة dans leur structure.
 *
 * Où le générique doit être COMPLET : partout où le texte est isolé dans un
 * résultat de recherche — H1 et <title> de catalogue et de catégorie, fil
 * d'Ariane du JSON-LD. Là c'est « دراجات هوائية », parce que « دراجات » nu au
 * pluriel appelle la moto (Harley, BMW, Honda en autocomplétion saoudienne).
 * Ici, dans un compteur, le contexte est déjà posé par la page : « دراجة » seul
 * suffit, et c'est ce qu'écrivent les boutiques.
 *
 * L'accord suit les catégories CLDR d'`Intl.PluralRules` — la règle arabe du
 * nombre, pas une liste écrite à la main : `few` (3 à 10, 103 à 110…) prend
 * le pluriel « دراجات », `many` (11 à 99) le singulier accusatif « دراجةً », et
 * le reste (0, 1, 2, 100, 196, 634…) « دراجة », comme on écrit un compteur
 * chiffré. Ce n'est pas un calcul métier : le nombre vient de l'API, seul le
 * mot qui le suit s'accorde.
 */
type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const RULES: Record<Locale, Intl.PluralRules> = {
  'ar-sa': new Intl.PluralRules('ar'),
  'en-sa': new Intl.PluralRules('en'),
};

const BIKE: Record<Locale, Forms> = {
  'ar-sa': { few: 'دراجات', many: 'دراجةً', other: 'دراجة' },
  'en-sa': { one: 'bike', other: 'bikes' },
};

/** « مقاس » : 3 à 10 → « مقاسات », 11 à 99 → « مقاسًا » (singulier accusatif), le reste → « مقاس ». */
const SIZE: Record<Locale, Forms> = {
  'ar-sa': { few: 'مقاسات', many: 'مقاسًا', other: 'مقاس' },
  'en-sa': { one: 'size', other: 'sizes' },
};

function counted(locale: Locale, n: number, forms: Forms): string {
  return `${n} ${forms[RULES[locale].select(n)] ?? forms.other}`;
}

/** « 196 دراجة », « 4 دراجات », « 1 bike », « 137 bikes » : un total et son mot, accordés. */
export function bikesCount(locale: Locale, n: number): string {
  return counted(locale, n, BIKE[locale]);
}

/** « 5 مقاسات », « 1 مقاس », « 5 sizes » : les tailles d'une fiche, comptées et accordées. */
export function sizesCount(locale: Locale, n: number): string {
  return counted(locale, n, SIZE[locale]);
}
