import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Une seule forme canonique par adresse — minuscules, sans slash final
 * (decision du 5 septembre 2026, CLAUDE.md racine, Routes, point 6).
 *
 * Google traite les URL comme SENSIBLES A LA CASSE : `/Trek` et `/trek` sont
 * deux adresses, donc deux pages en concurrence pour le meme contenu. On n'en
 * sert qu'une.
 *
 * `proxy` et non `middleware` : le fichier `middleware.ts` est DEPRECIE depuis
 * Next 16, renomme `proxy.ts` (meme API, meme comportement). Voir
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
 *
 * Quatre faits, tous verifies par `tests/e2e/redirects.spec.ts` :
 *
 * 1. **Le chemin seulement, jamais la query.** `?bikes=trek/marlin-7` porte des
 *    slugs deja minuscules, et le `?q=` de la future recherche portera du texte
 *    saisi par l'utilisateur — le mettre en minuscules changerait sa requete.
 *    Limite connue : l'adaptateur de Next relit la `Location` de tout proxy
 *    par `NextURL` et la re-serialise par `URLSearchParams` (`adapter.js`,
 *    `getRelativeURL`) — « / » ressort en « %2F », « , » en « %2C ». La VALEUR
 *    est identique une fois decodee, la casse est preservee ; seul
 *    `skipProxyUrlNormalize` l'eviterait, au prix d'une `Location` absolue au
 *    schema interne (http derriere nginx) : un saut de plus, pour du cosmetique.
 * 2. **Le slash final est retire ICI, pas par Next.** Sa redirection native se
 *    declenche AVANT le proxy : `/EN-SA/Bikes/` coutait deux sauts (308 vers
 *    `/EN-SA/Bikes`, puis 308 vers `/en-sa/bikes` — constate le 8 septembre
 *    2026 sur le serveur de production local). `skipTrailingSlashRedirect` dans
 *    `next.config.ts` la desactive, et la forme finale est rendue d'un coup.
 * 3. **`new URL(request.url)` et non `request.nextUrl.clone()`.** NextURL
 *    memorise le slash final de la requete et le REMET en serialisant la
 *    `Location` : `/en-sa/bikes/` etait redirige vers… `/en-sa/bikes/`. L'URL
 *    standard n'a pas cette memoire.
 * 4. **Meme origine que la requete** : Next rend la `Location` relative, ni
 *    schema ni hote internes exposes.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const canonique = canonicalPathname(pathname);

  // Rien a corriger : on laisse Next faire son travail.
  if (canonique === pathname) {
    return NextResponse.next();
  }

  const url = new URL(request.url);
  url.pathname = canonique;

  return NextResponse.redirect(url, 308);
}

/** Minuscules, sans slash final — la racine `/` reste `/`. */
function canonicalPathname(pathname: string): string {
  const minuscules = pathname.toLowerCase();

  return minuscules.length > 1 ? minuscules.replace(/\/+$/, '') : minuscules;
}

export const config = {
  /**
   * Tout sauf les routes d'API, les fichiers generes par Next et les fichiers
   * statiques (reconnus a leur extension). Sans exclusion, une redirection de
   * casse pourrait empecher une feuille de style ou une image de se charger.
   */
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
