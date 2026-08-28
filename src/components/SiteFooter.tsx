import type { Locale } from '@/lib/api';

/**
 * Le pied de page, présent sur toutes les pages : la marque, sa signature, et
 * la provenance des données. Pas de bascule de langue ici — elle vit dans la
 * navbar, déjà visible partout, et un second lien identique serait ambigu.
 * Aucun compteur non plus : un chiffre appartient aux pages, pas au cadre.
 */
const COPY = {
  'ar-sa': {
    tagline: 'منصة عربية لاكتشاف الدراجات ومقارنتها',
    sources: 'المواصفات من المواقع الرسمية للشركات المصنعة.',
  },
  'en-sa': {
    tagline: "The Gulf's bike comparison platform",
    sources: "Specifications from manufacturers' official websites.",
  },
} as const;

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = COPY[locale];

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-1.5 px-4 py-8 sm:px-6">
        {/* Le même duo que la navbar : le nom arabe EST la marque. */}
        <p className="flex items-baseline gap-1.5">
          <span className="text-base font-extrabold tracking-tight">درّاجة</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
            Darraja Bikes
          </span>
        </p>
        <p className="text-sm text-muted">{t.tagline}</p>
        <p className="text-xs text-muted">{t.sources}</p>
      </div>
    </footer>
  );
}
