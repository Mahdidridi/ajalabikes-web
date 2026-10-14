import type { Locale } from '@/lib/api';

/**
 * Libellés du dessin de géométrie et du glossaire, partagés par le comparateur et la fiche (web #66). Ils ne décrivent
 * aucune donnée : tout ce qui vient de l'API arrive déjà traduit. Déplacés tels quels depuis la page de comparaison le
 * 14 octobre 2026, sans changer un mot — les textes arabes y étaient déjà en ligne.
 */
export const GEOMETRY_COPY = {
  'ar-sa': {
    dash: '—',
    title: 'الإطارات متراكبة',
    drawn: 'الإطارات المرسومة: {bikes}.',
    undrawable: '{bike}: لم يُرسم لأن {missing} غير منشورة.',
    highlighted: 'القياس المميَّز: {label}.',
    nothingToDraw: 'لا يمكن رسم أي إطار بالقياسات المنشورة.',
    listSeparator: '، ',
    size: 'مقاس {label}',
    explain: 'شرح {label}',
    highlight: 'إبراز {label} في الرسم',
    notPublished: 'غير منشور',
    doubtful: 'قيمة منشورة مشكوك فيها',
    effect: 'الأثر:',
    caveat: 'تحفُّظ:',
    sourceLabels: 'تسميات الشركة المصنِّعة:',
    related: 'قياسات مرتبطة:',
  },
  'en-sa': {
    dash: '—',
    title: 'Overlaid frames',
    drawn: 'Frames drawn: {bikes}.',
    undrawable: '{bike} is not drawn: {missing} not published.',
    highlighted: 'Highlighted measurement: {label}.',
    nothingToDraw: 'No frame can be drawn from the published measurements.',
    listSeparator: ', ',
    size: 'Size for {label}',
    explain: 'Explain {label}',
    highlight: 'Highlight {label} on the drawing',
    notPublished: 'Not published',
    doubtful: 'Published value looks wrong',
    effect: 'Effect:',
    caveat: 'Caveat:',
    sourceLabels: 'Manufacturer labels:',
    related: 'Related measurements:',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type GeometryCopy = (typeof GEOMETRY_COPY)[Locale];
