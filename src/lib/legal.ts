import type { Locale } from '@/lib/api';
import { GA_MEASUREMENT_ID } from '@/lib/analytics';

/**
 * Les pages légales (web #16, plan de levée du noindex du 16 octobre 2026) : confidentialité, droits des images et retrait,
 * contact et informations légales, conditions d'utilisation. Textes rédigés par Claude le 19 octobre 2026, relus par le
 * fondateur (page de relecture privée) ; aucun avis juridique — une relecture par un avocat saoudien reste souhaitable.
 *
 * Les FAITS que seul le fondateur peut donner vivent ici, et seulement ici. `null` = pas encore donné : la page affiche
 * une marque visible (`data-legal-missing`) et `tests/e2e/legal-pages.spec.ts` échoue — voulu : aucune de ces pages ne
 * part en ligne avec un blanc.
 */
export const LEGAL_PAGES = ['privacy', 'image-rights', 'contact', 'terms'] as const;
export type LegalPageKey = (typeof LEGAL_PAGES)[number];

type PerLocale = Record<Locale, string>;

export const LEGAL_FACTS: {
  /**
   * Le responsable de la publication, tel qu'il doit être écrit. Décision du fondateur du 21 octobre 2026 : ni son nom ni son
   * pays ne sont publiés — l'équipe du site (« فريق Darraja Bikes » / « the Darraja Bikes team »), et l'adresse de contact.
   */
  publisher: string | null;
  /** L'adresse de contact publiée — jamais l'adresse personnelle du fondateur sans son accord explicite. */
  contactEmail: string | null;
  /** La durée de conservation des journaux du serveur, dans chaque langue (« 14 jours » / « 14 days »). */
  logRetention: PerLocale | null;
  /** La date de « dernière mise à jour », dans chaque langue. */
  updatedAt: PerLocale | null;
} = {
  publisher: 'Darraja Bikes',
  contactEmail: 'contact@darrajabikes.com',
  // `maxage 60` dans /etc/logrotate.d/nginx, appliqué par le fondateur le 21 octobre 2026 (vérifié sur le serveur) :
  // aucun journal d'erreurs n'est gardé plus de 60 jours — « deux mois au plus », sa formulation du 19 octobre.
  logRetention: { 'ar-sa': 'شهرين على الأكثر', 'en-sa': 'two months at most' },
  // Le jour de la mise en ligne des quatre pages, sur l'« OK » du fondateur à la relecture v4 (22 octobre 2026). Même
  // forme que les dates servies par l'API sur la fiche (« 1 أكتوبر 2026 » / « October 1, 2026 »). À changer avec le texte.
  updatedAt: { 'ar-sa': '22 أكتوبر 2026', 'en-sa': 'October 22, 2026' },
};

/**
 * Le cookie de session de Google Analytics 4 : `_ga_` suivi de l'identifiant de mesure sans son « G- » (aide Google,
 * « [GA4] Cookie usage on websites », vérifiée le 19 octobre 2026). Dérivé de l'identifiant pour suivre un changement
 * de propriété (`src/lib/analytics.ts`).
 */
export const GA_COOKIES = ['_ga', `_ga_${GA_MEASUREMENT_ID.replace(/^G-/, '')}`] as const;

/** Le module de désactivation de Google Analytics, cité par la page Confidentialité. */
export const GA_OPT_OUT_URL = 'https://tools.google.com/dlpage/gaoptout';
