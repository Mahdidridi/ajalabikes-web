import Image from 'next/image';
import type { HeroBike, HeroPair } from '@/lib/home-hero';
import { sizeCatalogue } from '@/lib/images';

/**
 * Les deux vrais vélos face à face de l'accueil, deux flèches entre eux — décision du fondateur du 21 octobre 2026 (la
 * paire, ses photos, son cadrage et l'exception du miroir : `src/lib/home-hero.ts`).
 *
 * `dir="ltr"` : la paire ne se retourne pas avec la page arabe — la photo de gauche montre son côté transmission, celle
 * de droite est affichée en miroir pour lui faire face ; échangées, les deux vélos se tourneraient le dos.
 *
 * Entièrement décorative (`aria-hidden`, photos en `alt` vide) : le titre de la page dit déjà ce qu'elle montre. Aucun crédit
 * sous les vélos (décision du fondateur du 21 octobre 2026, au soir) : la provenance des photos est au pied de page. Les deux
 * photos sont chargées d'emblée (`priority`) : sous les boutons, elles sont dans le premier écran sur ordinateur comme sur
 * téléphone, et elles sont la plus grande chose de la page.
 */
export function HomeHeroPair({ pair }: { pair: HeroPair }) {
  const [left, right] = pair.bikes;

  return (
    // En thème sombre, un halo clair derrière les vélos (`globals.css`, `.hero-pair-stage`) ; la paire finit sur la bande des
    // marques, les roues posées sur sa ligne.
    <div data-hero-pair aria-hidden="true" dir="ltr" className="hero-pair-stage mx-auto flex w-full max-w-245 items-end justify-center">
      <HeroBikePhoto bike={left} />
      <HeroArrows />
      <HeroBikePhoto bike={right} />
    </div>
  );
}

/**
 * Une photo cadrée sur son vélo : le cadre a les proportions du vélo (`frame.ratio`), la photo y est posée plus grande et
 * décalée de ses marges transparentes — les deux roues tombent ainsi sur la même ligne. Le miroir s'applique au cadre :
 * le vélo, qui le remplit exactement, reste à sa place.
 */
function HeroBikePhoto({ bike }: { bike: HeroBike }) {
  const { media, frame, mirrored } = bike;

  return (
    <div
      data-hero-bike
      className={`relative w-[44%] overflow-hidden ${mirrored ? '-scale-x-100' : ''}`}
      style={{ aspectRatio: frame.ratio }}
    >
      <Image
        src={sizeCatalogue(media)}
        alt=""
        // Dimensions de l'API : la place est réservée avant le chargement.
        width={media.sizes.detail.w}
        height={media.sizes.detail.h}
        sizes="(min-width: 1024px) 480px, 50vw"
        priority
        className="absolute h-auto max-w-none"
        style={{ width: frame.width, left: frame.left, top: frame.top }}
      />
    </div>
  );
}

/**
 * Deux flèches opposées, « on compare » : le jaune du logo (mesuré sur le logo, `#F8C848`), plus soutenu à la pointe
 * (`#F2B705`) pour rester lisible sur fond blanc. Décoratives.
 */
function HeroArrows() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 70"
      className="mt-[4%] w-[10%] shrink-0 self-start overflow-visible"
    >
      <defs>
        <linearGradient id="hero-arrow-left" gradientUnits="userSpaceOnUse" x1="104" x2="22" y1="0" y2="0">
          <stop offset="0" stopColor="#F8C848" stopOpacity="0.15" />
          <stop offset="1" stopColor="#F2B705" />
        </linearGradient>
        <linearGradient id="hero-arrow-right" gradientUnits="userSpaceOnUse" x1="16" x2="98" y1="0" y2="0">
          <stop offset="0" stopColor="#F8C848" stopOpacity="0.15" />
          <stop offset="1" stopColor="#F2B705" />
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M104 18 H22" stroke="url(#hero-arrow-left)" />
        <path d="M34 6 L18 18 L34 30" stroke="#F2B705" />
        <path d="M16 52 H98" stroke="url(#hero-arrow-right)" />
        <path d="M86 40 L102 52 L86 64" stroke="#F2B705" />
      </g>
    </svg>
  );
}
