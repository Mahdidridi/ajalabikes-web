'use client';

/**
 * Bascule clair / sombre.
 *
 * AUCUN état React : le thème vit dans `data-theme` sur <html> (posé avant le
 * premier rendu par le script du layout) et les deux icônes sont dans le DOM,
 * le CSS n'affichant que la bonne. Le serveur rend donc exactement ce que le
 * client hydrate — pas de désaccord d'hydratation, pas de clignotement.
 */
export function ThemeToggle({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const root = document.documentElement;
        const suivant = root.dataset.theme === 'dark' ? 'light' : 'dark';
        root.dataset.theme = suivant;
        try {
          localStorage.setItem('theme', suivant);
        } catch {
          /* stockage refusé (navigation privée) : la bascule vaut pour la page */
        }
      }}
      className="rounded-lg border border-border p-2 text-muted transition hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* Lune, proposée en thème clair. */}
      <svg
        className="size-4 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* Soleil, proposé en thème sombre. */}
      <svg
        className="hidden size-4 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </button>
  );
}
