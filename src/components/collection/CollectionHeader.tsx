/**
 * L'en-tête d'une page de collection — marque ou catégorie : le type de page
 * en surtitre, le NOM tel que l'API le rend en h1, le total du filtre en
 * compteur. Le compteur compte tous les vélos de la collection, pas les
 * cartes de la page.
 */
export function CollectionHeader({
  eyebrow,
  title,
  total,
  results,
}: {
  eyebrow: string;
  title: string;
  total: number;
  results: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-extrabold text-balance sm:text-4xl ltr:tracking-tight">
          {title}
        </h1>
      </div>
      <p className="font-mono text-sm text-muted">
        {total} {results}
      </p>
    </header>
  );
}
