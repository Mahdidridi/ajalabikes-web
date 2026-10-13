/**
 * La scène des notes dessinées, `scene-v1`, partagée avec l'API (`MarginLayout`, qui y place les notes) : 100 unités de
 * large ; la photo occupe x ∈ [PHOTO_LEFT, PHOTO_LEFT + PHOTO_WIDTH] avec une marge MARGIN_Y en haut et en bas ; hauteur
 * 2 × MARGIN_Y + PHOTO_WIDTH × h / w. Les photos du catalogue touchent presque les bords : les notes vivent dans ces
 * marges, jamais sur le vélo. Géométrie de MISE EN PAGE, pas une règle métier.
 *
 * Changer une constante change la scène des deux côtés, sous un autre nom : `MarginLayout::SCENE` et `SCENE` ensemble.
 * Une scène inconnue n'est jamais dessinée (`headAnnotation`). Module sans dépendance : les specs l'importent.
 */
export const SCENE = 'scene-v1';
export const PHOTO_LEFT = 24;
export const PHOTO_WIDTH = 52;
export const MARGIN_Y = 10;
