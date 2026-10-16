/**
 * La comparaison d'exemple de la page Comparer — décision du fondateur du 16 octobre 2026. La page nue (aucun `bikes`
 * dans l'adresse) ouvre une vraie comparaison au lieu d'un tableau vide : elle montre d'emblée ce que fait le
 * comparateur, dessin de géométrie compris.
 *
 * La paire est un CHOIX ÉDITORIAL du fondateur, pas une règle métier : deux semi-rigides d'entrée de gamme, même
 * catégorie (cross-country), le même prix constructeur à un cent près (999,99 $ et 1 000 $ US), même millésime (2027),
 * mêmes roues de 29" en taille M — la question classique du premier VTT. Choisie le 16 octobre 2026 parmi trois paires vérifiées
 * ce jour-là contre l'API (les deux autres : Trek Marlin 7 Gen 3 / Scott Scale 970, Trek Fuel EX 8 Gen 7 / Canyon
 * Spectral CF 7).
 *
 * La taille est posée pour les deux vélos et affichée dans leurs sélecteurs : sans taille, l'API ne sert pas la
 * géométrie (`requires_sizes`), donc pas de dessin. M existe chez les deux.
 *
 * Changer de paire = ce fichier, `tests/e2e/compare-example.spec.ts` et la section « Comparateur » du CLAUDE.md, dans le
 * même commit. Une paire choisie automatiquement (la plus comparée, par pays…) serait une règle : elle vivrait dans
 * Laravel.
 */
export const EXAMPLE_COMPARISON = {
  bikes: ['trek/marlin-6-gen-3', 'giant/talon-1'],
  sizes: ['M', 'M'],
} as const;

/**
 * L'exemple ne s'ouvre que sur la page nue — une sélection dans l'adresse, même vide (`?bikes=`), l'emporte — et
 * seulement si le catalogue sert encore les deux vélos : sinon, la page vide d'avant, jamais une erreur.
 */
export function exampleSelection(
  params: Readonly<Record<string, string | string[] | undefined>>,
  inCatalogue: (key: string) => boolean,
): { bikes: string[]; sizes: string[] } | null {
  if (params.bikes !== undefined) return null;
  if (!EXAMPLE_COMPARISON.bikes.every((key) => inCatalogue(key))) return null;

  return { bikes: [...EXAMPLE_COMPARISON.bikes], sizes: [...EXAMPLE_COMPARISON.sizes] };
}
