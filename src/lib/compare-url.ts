import type { Locale } from '@/lib/api';

/**
 * L'adresse d'une comparaison, composée AU CLIC — jamais toute faite dans le code de la page.
 *
 * Relevé du 28 octobre 2026 (Search Console, cinq jours après l'ouverture à Google) : 142 000 requêtes de Googlebot en
 * cinq jours, huit sur dix sur des comparaisons libres à trois vélos que personne ne lie. Cause mesurée en production :
 * une comparaison à deux vélos embarquait dans son code 539 adresses à trois vélos — le sélecteur « ajouter un vélo »
 * recevait du serveur une adresse toute faite par vélo du catalogue, sérialisée dans les données de Next même si l'écran
 * ne montre que des boutons — et 32 adresses de taille, pour 3 vrais liens. Google lit ces adresses comme des liens et
 * les visite une à une ; chaque page à trois vélos en porte d'autres à son tour.
 *
 * Décision du fondateur du 28 octobre 2026 : le code d'une page de comparaison ne contient aucune adresse de comparaison
 * hors de ses vrais liens. Le serveur transmet la SÉLECTION (vélos, tailles, filtre) et des noms ; l'adresse se compose
 * ici, par la fonction qui sert aussi aux liens rendus par le serveur — une seule construction, les mêmes adresses
 * qu'avant (`URLSearchParams`), et l'état vit toujours dans l'URL (règle 4). Rien de métier : de la mise en forme
 * d'adresse. Politique robots et `robots.txt` inchangés (décision du 16 octobre 2026). Garde : `tests/e2e/compare.spec.ts`.
 */

/** Une comparaison telle que l'adresse la porte : vélos `marque/slug`, tailles alignées sur les vélos, filtre « différences ». */
export type CompareSelection = {
  bikes: string[];
  sizes: (string | null)[];
  diff: boolean;
};

/** `/{locale}/compare?bikes=…&sizes=…&diff=1` — la page nue pour une sélection vide. */
export function compareHref(locale: Locale, { bikes, sizes, diff }: CompareSelection): string {
  const p = new URLSearchParams();
  if (bikes.length > 0) p.set('bikes', bikes.join(','));
  if (sizes.some(Boolean)) p.set('sizes', sizes.map((s) => s ?? '').join(','));
  if (diff) p.set('diff', '1');
  const qs = p.toString();

  return `/${locale}/compare${qs ? `?${qs}` : ''}`;
}

/** La sélection avec un vélo de plus, sans taille. */
export function withBike(selection: CompareSelection, bike: string): CompareSelection {
  return { ...selection, bikes: [...selection.bikes, bike], sizes: [...selection.sizes, null] };
}

/** La sélection avec la taille d'une colonne. */
export function withSize(selection: CompareSelection, column: number, size: string): CompareSelection {
  return { ...selection, sizes: selection.sizes.map((s, j) => (j === column ? size : s)) };
}

/** La sélection sans une colonne : le vélo et sa taille. */
export function withoutColumn(selection: CompareSelection, column: number): CompareSelection {
  return {
    ...selection,
    bikes: selection.bikes.filter((_, j) => j !== column),
    sizes: selection.sizes.filter((_, j) => j !== column),
  };
}

/** Le filtre « différences seulement » inversé. */
export function toggleDiff(selection: CompareSelection): CompareSelection {
  return { ...selection, diff: !selection.diff };
}
