'use client';

import { useEffect, useRef, useState } from 'react';

export type SectionNavItem = { href: `#${string}`; label: string };

/** La ligne de lecture : juste sous la barre, là où `scroll-mt-16` (64 px) pose le titre d'un bloc après un saut d'ancre. */
const READING_LINE = 66;

/**
 * La barre d'ancres de la fiche vélo — décision du fondateur du 14 octobre 2026 (web #65).
 *
 * Elle vient SOUS la photo (annotée ou non) et reste collée au bord haut pendant la lecture. Un clic fait glisser la page
 * jusqu'au bloc (`scroll-behavior: smooth` dans `globals.css` ; les sections gardent `scroll-mt-16`) et le bloc courant est
 * souligné. Ce soulignement, et lui seul, fait de la barre un Client Component : sans JavaScript, elle reste une liste de
 * liens qui fonctionne.
 *
 * LE BLOC COURANT est le dernier dont le titre est passé sous la barre (sa section commence au-dessus de la ligne de
 * lecture), et le dernier bloc quand la page est au bout. Relevé en production le 14 octobre 2026 : « le bloc le plus
 * visible » soulignait le bloc SUIVANT sur une fiche à géométrie courte (Scale 600, une taille) suivie d'un bloc de vélos
 * proches plus haut qu'elle. Un clic sur la barre ÉPINGLE le bloc choisi jusqu'au prochain geste de lecture (molette,
 * toucher, clavier) : le dernier bloc d'une page courte ne monte pas toujours jusqu'à la barre, il reste pourtant celui
 * que l'on a demandé.
 *
 * SEULEMENT DES ANCRES, jamais un autre lien : les tests des blocs parcourent `main nav a` et attendent un `h2` sous chaque
 * cible. La barre tient sur UNE ligne et défile en largeur dans sa propre boîte quand l'écran est étroit : la page, elle, ne
 * s'élargit jamais (règle du 11 octobre 2026), et elle reste moins haute que les 64 px de `scroll-mt-16`, pour qu'un saut
 * d'ancre pose toujours le titre sous la barre.
 */
export function SectionNav({ items }: { items: readonly SectionNavItem[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  // Le bloc épinglé par un clic ; levé au premier geste de lecture.
  const pinned = useRef<string | null>(null);
  const key = items.map((item) => item.href).join(' ');

  useEffect(() => {
    const targets = key
      .split(' ')
      .map((href) => document.getElementById(href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      if (pinned.current !== null) return;
      let best: string | null = null;
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= READING_LINE) best = target.id;
      }
      // Au bout de la page, le dernier bloc est celui qu'on lit, même s'il n'a pas pu monter jusqu'à la barre — sauf si un
      // bloc vient d'être posé sous la barre par un saut d'ancre.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const aligned = targets.some((target) => Math.abs(target.getBoundingClientRect().top - 64) <= 2);
      if (atBottom && !aligned) best = targets[targets.length - 1].id;
      setCurrent(best === null ? null : `#${best}`);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    const release = () => {
      if (pinned.current === null) return;
      pinned.current = null;
      schedule();
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchstart', release, { passive: true });
    window.addEventListener('keydown', release);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchstart', release);
      window.removeEventListener('keydown', release);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
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
            onClick={() => {
              pinned.current = item.href;
              setCurrent(item.href);
            }}
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
