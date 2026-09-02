import type { Locale } from '@/lib/api';

/**
 * Le mot générique « vélo », dans la langue de la page — et son accord avec
 * un nombre.
 *
 * Décision du 3 septembre 2026, d'après les mesures
 * (`notes/seo-vocabulaire-golfe-2026-09-03.md`) : en arabe du Golfe, le mot
 * est « سيكل » (Arabie 100) — « دراجة هوائية » (11) reste le registre formel,
 * gardé en second dans une phrase ; « دراجة » seule veut dire moto. Dans les
 * titres, H1, descriptions, fils d'Ariane, compteurs et libellés génériques,
 * « سيكل / سياكل » passe donc en tête. La MARQUE, elle, reste « دراجة » /
 * « Darraja Bikes », et sa signature ne change pas (`SITE_NAME_AR`,
 * `SIGNATURE` dans `seo.ts`).
 *
 * L'accord suit les catégories CLDR d'`Intl.PluralRules` — la règle arabe du
 * nombre, pas une liste écrite à la main : `few` (3 à 10, 103 à 110…) prend
 * le pluriel « سياكل », tout le reste (0, 1, 2, 11 à 99, 100, 196, 634…) le
 * singulier « سيكل », comme on écrit un compteur chiffré. Ce n'est pas un
 * calcul métier : le nombre vient de l'API, seul le mot qui le suit s'accorde.
 */
type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const RULES: Record<Locale, Intl.PluralRules> = {
  'ar-sa': new Intl.PluralRules('ar'),
  'en-sa': new Intl.PluralRules('en'),
};

const BIKE: Record<Locale, Forms> = {
  'ar-sa': { few: 'سياكل', other: 'سيكل' },
  'en-sa': { one: 'bike', other: 'bikes' },
};

function counted(locale: Locale, n: number, forms: Forms): string {
  return `${n} ${forms[RULES[locale].select(n)] ?? forms.other}`;
}

/** « 196 سيكل », « 4 سياكل », « 1 bike », « 137 bikes » : un total et son mot, accordés. */
export function bikesCount(locale: Locale, n: number): string {
  return counted(locale, n, BIKE[locale]);
}
