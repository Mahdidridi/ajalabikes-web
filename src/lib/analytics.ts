/**
 * Google Analytics 4 — décision du fondateur du 16 octobre 2026 : mesurer l'audience du site avant et après la levée du
 * noindex du 21 octobre. Propriété « darrajabikes.com » du compte « Darraja Bikes », créée par le fondateur ce jour-là ;
 * mesures améliorées activées dans Analytics (pages vues, y compris les navigations de l'application, défilement, clics
 * sortants vers les marques). L'ID de mesure est public : il figure dans chaque page servie.
 *
 * La balise ne parle à Google QUE sur l'hôte de production. En local, pendant les tests e2e (des centaines de visites
 * qui fausseraient les chiffres) ou sur tout autre hôte, elle s'arrête avant de créer la moindre file de mesure. Pas de
 * variable d'environnement : rien à configurer sur le serveur, et un build local ne peut pas mesurer par erreur.
 *
 * Pas de bandeau de consentement pour l'instant (choix du fondateur du 16 octobre 2026) : la page « Confidentialité »
 * doit dire que le site dépose les cookies d'Analytics ; le bandeau reste une décision à prendre.
 */
export const GA_MEASUREMENT_ID = 'G-PNW83E7CDS';
export const GA_HOSTNAME = 'darrajabikes.com';

/**
 * Le script en ligne, tel qu'il est servi dans le `<head>` : le chargement standard de gtag.js (file `dataLayer`,
 * `js`, `config` qui envoie la page vue, chargeur asynchrone), précédé du garde de l'hôte. Paramétrable pour les tests
 * seulement, qui l'exécutent sur leur propre hôte avec un chargeur simulé.
 */
export function analyticsBootstrap(id: string = GA_MEASUREMENT_ID, host: string = GA_HOSTNAME): string {
  return (
    '(function(id,host){' +
    'if(location.hostname!==host)return;' +
    'var w=window;w.dataLayer=w.dataLayer||[];' +
    'w.gtag=function(){w.dataLayer.push(arguments)};' +
    "w.gtag('js',new Date());w.gtag('config',id);" +
    "var s=document.createElement('script');s.async=true;" +
    "s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);" +
    'document.head.appendChild(s)' +
    `})(${JSON.stringify(id)},${JSON.stringify(host)})`
  );
}
