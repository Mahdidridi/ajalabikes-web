/**
 * Trait de rappel « à la main » du pilote de hotspots (web #49) : une courbe de Bézier quadratique
 * déterministe, légèrement bombée, toujours la même pour les mêmes points — aucun aléa, aucune IA.
 * Géométrie de DESSIN dans le repère de la scène, pas une règle métier.
 */
export interface Pt {
  x: number;
  y: number;
}

export function leaderPath(from: Pt, to: Pt, bend = 0.08): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const cx = mx - (to.y - from.y) * bend;
  const cy = my + (to.x - from.x) * bend;
  const r = (v: number) => Math.round(v * 100) / 100;
  return `M ${r(from.x)} ${r(from.y)} Q ${r(cx)} ${r(cy)} ${r(to.x)} ${r(to.y)}`;
}
