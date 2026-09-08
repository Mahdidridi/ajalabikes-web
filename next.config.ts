import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
   * Aucune indexation tant que les URL ne sont pas figees (decision du
   * 28 aout 2026). L'en-tete double le <meta name="robots"> du layout : il
   * couvre aussi ce qui n'a pas de <head> (robots.txt, 404, redirections).
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
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
