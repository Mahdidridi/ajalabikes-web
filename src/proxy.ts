import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Une seule forme canonique par adresse — minuscules (decision du 5 septembre
 * 2026, CLAUDE.md racine, Routes, point 6).
 *
 * Google traite les URL comme SENSIBLES A LA CASSE : `/Trek` et `/trek` sont
 * deux adresses, donc deux pages en concurrence pour le meme contenu. On n'en
 * sert qu'une.
 *
 * `proxy` et non `middleware` : le fichier `middleware.ts` est DEPRECIE depuis
 * Next 16, renomme `proxy.ts` (meme API, meme comportement). Voir
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
 *
 * Deux limites volontaires :
 *
 * 1. **Le chemin seulement, jamais la query.** `?bikes=trek/marlin-7` porte des
 *    slugs deja minuscules, et le `?q=` de la future recherche portera du texte
 *    saisi par l'utilisateur — le mettre en minuscules changerait sa requete.
 * 2. **Le slash final est laisse a Next** (`trailingSlash: false` par defaut),
 *    SAUF quand on redirige deja pour la casse : dans ce cas on rend la forme
 *    finale d'un coup, sinon `/EN-SA/Bikes/` couterait deux sauts.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const minuscules = pathname.toLowerCase();

  // Rien a corriger : on laisse Next faire son travail, slash final compris.
  if (minuscules === pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  // La forme FINALE en une seule redirection — jamais une chaine.
  url.pathname =
    minuscules.length > 1 && minuscules.endsWith('/')
      ? minuscules.slice(0, -1)
      : minuscules;

  return NextResponse.redirect(url, 308);
}

export const config = {
  /**
   * Tout sauf les routes d'API, les fichiers generes par Next et les fichiers
   * statiques (reconnus a leur extension). Sans exclusion, une redirection de
   * casse pourrait empecher une feuille de style ou une image de se charger.
   */
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
