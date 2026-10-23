import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { globalNotFound: true },

  /**
   * La racine n'existe pas : tout vit sous une locale, et le layout racine —
   * qui porte <html dir> — vit sous `[locale]`. L'arabe est la marque, il est
   * donc la destination.
   *
   * En 308 depuis le 7 septembre 2026 : les URL sont figees (decision du
   * 5 septembre), le 307 ne se justifiait que par leur caractere mouvant.
   * Jamais de negociation de langue par IP ici — Googlebot crawle depuis les
   * Etats-Unis sans `Accept-Language`, il doit voir la meme racine que tout
   * le monde.
   */
  async redirects() {
    return [{ source: '/', destination: '/ar-sa', permanent: true }];
  },

  /**
   * Le slash final est retire par `src/proxy.ts`, en meme temps que la casse
   * et en un seul saut. La redirection native de Next se declenchait AVANT le
   * proxy : `/EN-SA/Bikes/` coutait deux 308 (constate le 8 septembre 2026).
   * Option documentee pour exactement ce cas (`proxy.md`, Advanced Proxy flags).
   */
  skipTrailingSlashRedirect: true,

  /**
   * Il y avait ici, tant que le verrou d'indexation tenait (decision du 28 aout
   * 2026), l'en-tete `X-Robots-Tag: noindex, nofollow` sur TOUTE route — il
   * doublait le <meta name="robots"> du layout et couvrait ce qui n'a pas de
   * <head> (robots.txt, 404, redirections). Retire avec le verrou
   * (`INDEXING_LOCKED`, `src/lib/seo.ts`) : chaque page dit elle-meme si elle
   * s'indexe. Un en-tete global ne peut que fermer, jamais ouvrir.
   *
   * Retour arriere d'urgence : remettre en tete du tableau
   * `{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }`
   * et repasser `INDEXING_LOCKED` a `true`, ensemble. `tests/e2e/indexation.spec.ts`
   * garde l'absence de cet en-tete : le remettre seul desindexerait tout le site.
   */
  async headers() {
    return [
      {
        /**
         * Illustrations des tuiles du bikefinder (`public/finder-art`, decision du
         * 9 octobre 2026). Next sert `public/` en `max-age=0` faute de savoir si un
         * fichier change ; ceux-ci portent leur version dans le nom (`road-480-v1.webp`) :
         * remplacer une image change son adresse, le cache peut donc etre immuable.
         */
        source: '/finder-art/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        /**
         * Le logo (`public/brand`, decision du 15 octobre 2026) : meme regle, la
         * version est dans le nom (`wordmark-black-240-v1.webp`).
         */
        source: '/brand/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  images: {
    /**
     * Les conversions sont generees par Laravel et servies par le CDN. Sans ce
     * loader, `next/image` les reoptimiserait : cout et latence doubles pour un
     * resultat identique. Voir `src/lib/imageLoader.ts`.
     */
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',

    /**
     * Les largeurs que Next a le droit de demander au loader — exactement les
     * quatre conversions produites par Laravel, et rien d'autre.
     *
     * Sans cette declaration, Next arrondit toute largeur a sa propre echelle
     * (640, 750, 828, 1080, 1920...). Une photo posee a 800 px se voyait ainsi
     * demandee en 1080, le loader remontait a la taille superieure, et la
     * grande image comme sa vignette etaient servies en `detail_2x` : 1600 px
     * pour une vignette de 64 px de haut. Verifie dans le HTML rendu.
     *
     * `imageSizes` sert les images a taille fixe, `deviceSizes` les images
     * responsives. Toutes doivent etre croissantes, et `imageSizes` reste sous
     * la plus petite de `deviceSizes`.
     */
    imageSizes: [200, 400],
    deviceSizes: [800, 1600],
  },
};

export default nextConfig;
