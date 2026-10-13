/**
 * Une suite latine (marque, modèle, référence) commence par une lettre latine, ou par « ( » collée à une lettre
 * latine, et s'arrête avant l'arabe ou « · ». Les signes qui finissent un nom (« E500+ », « Ponto Go! »,
 * « Precaliber 20" ») en font partie, et le nombre qui l'ouvre aussi (« 300 Series Alpha ») : sans lui, l'arabe
 * l'affichait « Series Alpha 300 » (planche du 11 octobre 2026). Un nombre suivi d'arabe (« 11 سرعة ») reste à l'arabe.
 */
// Un deux-points COLLÉ à la lettre ou au chiffre qui le suit fait partie du nom (Canyon : « Strive:ON », « Spectral:ONfly »,
// « Canyon:ON HB0057 » — sans lui, l'arabe coupait le nom en trois <bdi> et l'affichait « ON:Canyon Strive » ; lot du
// 13 octobre 2026). Celui d'une phrase est suivi d'une espace ou d'arabe : il reste à la phrase, et le nombre qui le suit
// aussi (« (Gravel): 700 »). Une assertion AVANT (« (?=… ») suffit : pas de lookbehind, que Safari avant 16.4 refuse à
// l'analyse du module.
const LATIN_RUN = /(?:\d+(?:[.,]\d+)?\s)?\(?[A-Za-z](?:[A-Za-z0-9.,'’"+!\-/×()&\s]|:(?=[A-Za-z0-9]))*/g;

/** Ponctuation de PHRASE en fin de suite : elle appartient au texte arabe, jamais au nom (« … Madone. »). */
const SENTENCE_END = /[\s.,:;]+$/;

const count = (text: string, char: string) => text.split(char).length - 1;

export interface Run {
  text: string;
  latin: boolean;
}

/**
 * Découpe un texte arabe en suites latines, à isoler par <bdi>, et en texte courant, sans rien perdre.
 *
 * Relecture du 10 octobre 2026 (web #49) : une suite qui avalait le point final rendait « Madone. » avec le point
 * entre le nom et l'arabe, et une parenthèse sans sa jumelle dans le <bdi> se retrouvait du même côté du mot que
 * l'autre. Le point final reste donc à la phrase, et une parenthèse n'entre dans la suite qu'avec sa jumelle.
 */
export function latinRuns(text: string): Run[] {
  const runs: Run[] = [];
  let last = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    let start = match.index ?? 0;
    let run = match[0].replace(SENTENCE_END, '');
    if (run.startsWith('(') && count(run, '(') > count(run, ')')) {
      run = run.slice(1);
      start += 1;
    }
    if (run.endsWith(')') && count(run, ')') > count(run, '(')) run = run.slice(0, -1).replace(SENTENCE_END, '');
    if (start > last) runs.push({ text: text.slice(last, start), latin: false });
    runs.push({ text: run, latin: true });
    last = start + run.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), latin: false });
  return runs;
}
