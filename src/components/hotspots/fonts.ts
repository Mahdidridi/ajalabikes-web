import { Aref_Ruqaa, Caveat } from 'next/font/google';

/**
 * Polices manuscrites du pilote de hotspots (web #49) — décision du fondateur du 10 octobre 2026 :
 * la ligne principale de chaque note en manuscrit, Caveat pour le latin, Aref Ruqaa pour l'arabe
 * (le Ruqaa est l'écriture manuscrite de tous les jours). Importées par la seule route d'aperçu :
 * Next ne les précharge que sur cette route, jamais sur les fiches publiques.
 */
const handLatin = Caveat({ subsets: ['latin'], variable: '--font-hand-latin', display: 'swap' });
const handArabic = Aref_Ruqaa({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-hand-arabic', display: 'swap' });

export const handFontsClassName = `${handLatin.variable} ${handArabic.variable}`;
