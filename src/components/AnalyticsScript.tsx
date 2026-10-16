import { analyticsBootstrap } from '@/lib/analytics';

/**
 * La balise Google Analytics 4 (décision du fondateur du 16 octobre 2026, `src/lib/analytics.ts`). Un script en ligne
 * rendu par le serveur dans le `<head>`, comme `ThemeScript` : il ne parle à Google que sur darrajabikes.com et y
 * charge gtag.js en asynchrone — rien ne bloque l'affichage.
 */
export function AnalyticsScript() {
  return <script data-analytics="ga4" dangerouslySetInnerHTML={{ __html: analyticsBootstrap() }} />;
}
