import Link from 'next/link';
import type { Locale } from '@/lib/api';
import { BrandLogo } from './BrandLogo';

/**
 * Le pied de page, présent sur toutes les pages. Bloc Tailwind Plus « Simple
 * centered » (Marketing › Footers), adapté : la rangée de liens du site, puis
 * le logo et sa signature, puis la provenance des données et le copyright.
 * Sans icônes sociales — aucun compte n'existe, on n'en invente pas.
 *
 * Pas de bascule de langue ici — elle vit dans la navbar, déjà visible
 * partout, et un second lien identique serait ambigu. Aucun compteur non
 * plus : un chiffre appartient aux pages, pas au cadre.
 */
const COPY = {
  'ar-sa': {
    nav: 'روابط الموقع',
    bikes: 'الدراجات',
    compare: 'قارن',
    finder: 'دليل اختيار الدراجة',
    // La signature de la marque : elle ne suit pas le vocabulaire mesuré.
    tagline: 'منصة عربية لاكتشاف الدراجات ومقارنتها',
    sources: 'المواصفات من المواقع الرسمية للشركات المصنعة.',
  },
  'en-sa': {
    nav: 'Site links',
    bikes: 'Bikes',
    compare: 'Compare',
    finder: 'Bike finder',
    tagline: "The Gulf's bike comparison platform",
    sources: "Specifications from manufacturers' official websites.",
  },
} as const;

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const liens = [
    { label: t.bikes, path: 'bikes' },
    { label: t.compare, path: 'compare' },
    { label: t.finder, path: 'finder' },
  ];

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6">
        <nav aria-label={t.nav} className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm/6">
          {liens.map((lien) => (
            <Link
              key={lien.path}
              href={`/${locale}/${lien.path}`}
              className="rounded-sm text-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-3">
          {/*
           * Le logo complet (décision du 15 octobre 2026) : le mot dessiné et « DARRAJA BIKES »
           * dessous — le même duo que la navbar, dans l'image. Sous le premier écran : `lazy`,
           * l'encre de l'autre thème n'est jamais téléchargée.
           */}
          <BrandLogo
            shape="lockup"
            alt="درّاجة Darraja Bikes"
            sizes="176px"
            loading="lazy"
            className="h-auto w-44"
          />
          <p className="text-sm text-muted">{t.tagline}</p>
        </div>

        <div className="flex flex-col gap-1 text-xs text-muted">
          <p>{t.sources}</p>
          {/* Rendu côté serveur, à la construction : l'année n'est pas un calcul métier. */}
          <p>© {new Date().getFullYear()} Darraja Bikes</p>
        </div>
      </div>
    </footer>
  );
}
