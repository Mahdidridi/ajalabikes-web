'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Bascule ar ↔ en en CONSERVANT la page et ses paramètres : un catalogue
 * filtré ou une comparaison en cours survivent au changement de langue.
 * Client Component : le chemin courant n'est connu que du navigateur.
 */
export function LangSwitch({ locale, label }: { locale: string; label: string }) {
  const pathname = usePathname();
  const search = useSearchParams();

  const autre = locale.startsWith('ar') ? 'en-sa' : 'ar-sa';
  const chemin = `/${autre}${pathname.slice(locale.length + 1)}`;
  const query = search.toString();

  return (
    <Link
      href={query ? `${chemin}?${query}` : chemin}
      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-foreground hover:text-foreground"
    >
      {label}
    </Link>
  );
}
