import { Aref_Ruqaa, Caveat } from 'next/font/google';

/**
 * Polices manuscrites des notes dessinées (web #49) — décision du fondateur du 10 octobre 2026 : la ligne principale
 * de chaque note en manuscrit, Caveat pour le latin, Aref Ruqaa pour l'arabe (le Ruqaa est l'écriture manuscrite de
 * tous les jours).
 *
 * `preload: false` depuis la généralisation (web #52, 12 octobre 2026) : la fiche importe ces polices, annotée ou non,
 * et un préchargement les ferait télécharger sur toutes les fiches, dans les deux alphabets, en concurrence avec la
 * photo de tête. Sans lui, le navigateur ne télécharge une police que si une note l'emploie : une fiche sans notes ne
 * télécharge rien, une fiche anglaise ne télécharge pas l'arabe.
 *
 * Chaque variable porte aussi la police de secours que Next ajoute (« Caveat Fallback » = Arial, sans plage de
 * caractères) : l'ordre des piles de l'arabe est réglé dans `AnnotatedPhoto.module.css`.
 */
const handLatin = Caveat({ subsets: ['latin'], variable: '--font-hand-latin', display: 'swap', preload: false });
const handArabic = Aref_Ruqaa({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-hand-arabic',
  display: 'swap',
  preload: false,
});

export const handFontsClassName = `${handLatin.variable} ${handArabic.variable}`;
