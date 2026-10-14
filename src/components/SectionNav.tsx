'use client';

import { useEffect, useRef, useState } from 'react';

export type SectionNavItem = { href: `#${string}`; label: string };

/**
 * La barre d'ancres de la fiche vélo — décision du fondateur du 14 octobre 2026 (web #65).
 *
 * Elle vient SOUS la photo (annotée ou non) et reste collée au bord haut pendant la lecture. Un clic fait glisser la page
 * jusqu'au bloc (`scroll-behavior: smooth` dans `globals.css` ; les sections gardent `scroll-mt-16`) et le bloc courant est
 * souligné. Ce soulignement, et lui seul, fait de la barre un Client Component : sans JavaScript, elle reste une liste de
 * liens qui fonctionne.
 *
 * SEULEMENT DES ANCRES, jamais un autre lien : les tests des blocs parcourent `main nav a` et attendent un `h2` sous chaque
 * cible. La barre tient sur UNE ligne et défile en largeur dans sa propre boîte quand l'écran est étroit : la page, elle, ne
 * s'élargit jamais (règle du 11 octobre 2026), et elle reste moins haute que les 64 px de `scroll-mt-16`, pour qu'un saut
 * d'ancre pose toujours le titre sous la barre.
 */
export function SectionNav({ items }: { items: readonly SectionNavItem[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  // La hauteur visible de chaque bloc dans la bande de lecture, mise à jour entrée par entrée.
  const visible = useRef(new Map<string, number>());
  const key = items.map((item) => item.href).join(' ');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const targets = key
      .split(' ')
      .map((href) => document.getElementById(href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return undefined;

    // Le bloc courant est celui qui occupe le plus la bande de lecture : sous la barre (64 px), au-dessus du tiers bas
    // de l'écran. La hauteur visible, pas le ratio : un bloc long (les composants) ne doit pas perdre contre un bloc court
    // entièrement visible plus bas.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.current.set(entry.target.id, entry.isIntersecting ? entry.intersectionRect.height : 0);
        }
        let best: string | null = null;
        let bestHeight = 0;
        for (const [id, height] of visible.current) {
          if (height > bestHeight) {
            best = id;
            bestHeight = height;
          }
        }
        setCurrent(best === null ? null : `#${best}`);
      },
      { rootMargin: '-64px 0px -34% 0px', threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1] },
    );
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [key]);

  return (
    <nav className="sticky top-0 z-10 -mx-6 flex gap-x-6 overflow-x-auto border-b border-border bg-background px-6 text-sm font-medium whitespace-nowrap">
      {items.map((item) => {
        const active = current === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? 'true' : undefined}
            className={`-mb-px shrink-0 border-b-2 py-3 transition ${
              active ? 'border-accent text-foreground' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
