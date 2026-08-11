import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
