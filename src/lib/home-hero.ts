import type { Media } from '@/lib/images';

/**
 * Les deux vrais vélos face à face de l'accueil — décision du fondateur du 21 octobre 2026, d'après le hero de 99 Spokes
 * (deux vélos nez à nez, deux flèches de comparaison entre eux) : dire « ici on compare » avant toute lecture.
 *
 * Le fondateur a voulu de VRAIS vélos du catalogue, « sans la marque ». Une photo de marque ne se retouche pas (règle
 * « Images » du CLAUDE.md racine) : les photos sont donc choisies, sans retouche, parmi les 1 099 photos des 116 vélos de
 * route en ligne ce jour-là, pour leur logo ton sur ton, illisible à cette taille. Chaque photo garde son crédit (`©`),
 * comme dans la galerie des fiches.
 *
 * EXCEPTION À LA RÈGLE « image non modifiée », décidée par le fondateur le 21 octobre 2026 pour l'accueil seulement :
 * aucune de ces galeries ne publie la vue du côté gauche, la photo de DROITE est donc AFFICHÉE en miroir (CSS ; le
 * fichier servi par l'API reste intact). Il avait le choix entre « côte à côte, photos intactes » et « face à face » : il
 * a choisi face à face.
 *
 * Trois paires de même couleur (sa demande du même soir), une seule affichée : `ACTIVE_HERO_PAIR`. La paire est un CHOIX
 * ÉDITORIAL, pas une règle métier — une paire qui changerait toute seule (toutes les 3 à 5 semaines, évoqué par le
 * fondateur) serait une règle : elle vivrait dans Laravel.
 *
 * `frame` cadre chaque photo sur son vélo : les conversions de l'API gardent des marges transparentes (Trek 22 % en haut,
 * Scott 39 %), qui décaleraient les roues des deux vélos. Mesuré le 21 octobre 2026 sur l'alpha de `detail_2x`, identique
 * sur les quatre conversions à 0,3 % près : `ratio` = largeur / hauteur du vélo, `width` = largeur de la photo rapportée à
 * celle du vélo, `left` et `top` = décalage de la photo. Ce sont des réglages d'affichage, pas des données : changer de
 * photo = les remesurer.
 *
 * Changer de paire affichée = `ACTIVE_HERO_PAIR`. Ajouter ou changer une paire = ce fichier, `tests/e2e/home-hero.spec.ts`
 * et la section « Accueil » du CLAUDE.md du dépôt, dans le même commit.
 */
export type HeroFrame = { readonly ratio: string; readonly width: string; readonly left: string; readonly top: string };

type HeroBikeEntry = { readonly bike: `${string}/${string}`; readonly media: number; readonly frame: HeroFrame };

export type HeroPairEntry = { readonly key: string; readonly bikes: readonly [HeroBikeEntry, HeroBikeEntry] };

export const HERO_PAIRS = [
  {
    key: 'noir',
    bikes: [
      { bike: 'trek/madone-sl-5-gen-8', media: 3598, frame: { ratio: '1578 / 966', width: '101.39%', left: '-0.63%', top: '-22.15%' } },
      { bike: 'canyon/endurace-cf-7', media: 5535, frame: { ratio: '799 / 480', width: '110.14%', left: '-5.13%', top: '-1.25%' } },
    ],
  },
  {
    key: 'gris',
    bikes: [
      { bike: 'scott/foil-rc-ultimate', media: 5713, frame: { ratio: '1524 / 897', width: '104.99%', left: '-2.49%', top: '-39.13%' } },
      { bike: 'scott/addict-rc-team', media: 5718, frame: { ratio: '1524 / 903', width: '104.99%', left: '-2.49%', top: '-39.53%' } },
    ],
  },
  {
    key: 'blanc',
    bikes: [
      { bike: 'trek/madone-sl-5-gen-8', media: 3608, frame: { ratio: '1578 / 963', width: '101.39%', left: '-0.63%', top: '-22.53%' } },
      { bike: 'trek/madone-sl-7-gen-8', media: 3363, frame: { ratio: '1578 / 959', width: '101.39%', left: '-0.63%', top: '-23.04%' } },
    ],
  },
] as const satisfies readonly HeroPairEntry[];

/**
 * La paire affichée, dans les deux thèmes : la blanche (Trek Madone SL 5 Gen 8 face à Trek Madone SL 7 Gen 8) — choix du
 * fondateur du 21 octobre 2026 sur les planches claire et sombre des trois paires, « la meilleure dans les deux thèmes ».
 */
export const ACTIVE_HERO_PAIR: (typeof HERO_PAIRS)[number]['key'] = 'blanc';

export type HeroBike = { readonly media: Media; readonly frame: HeroFrame; readonly mirrored: boolean };

export type HeroPair = { readonly bikes: readonly [HeroBike, HeroBike]; readonly credits: readonly string[] };

/**
 * La paire prête à afficher, ou `null`. `galleries` = les photos que l'API sert pour chacun des deux vélos, dans l'ordre
 * de la paire (`null` = vélo absent ou API en panne). Chaque vélo doit être servi AVEC sa photo et un crédit : sans
 * crédit, pas de photo (règle « Images »). Sinon `null`, et l'accueil s'affiche comme avant — jamais une erreur.
 * La photo de droite est en miroir (voir plus haut) ; une maison créditée deux fois ne s'écrit qu'une fois.
 */
export function heroPair(
  entry: HeroPairEntry,
  galleries: readonly [readonly Media[] | null, readonly Media[] | null],
): HeroPair | null {
  const bikes = entry.bikes.map(({ media: id, frame }, i) => {
    const media = galleries[i]?.find((m) => m.id === id);
    return media?.attribution ? { media, frame, mirrored: i === 1 } : null;
  });
  const [left, right] = bikes;
  if (!left || !right) return null;

  return { bikes: [left, right], credits: [...new Set([left.media.attribution!, right.media.attribution!])] };
}
