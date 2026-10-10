'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/api';
import type { PilotBike } from '@/lib/hotspot-pilot';

/**
 * Sélecteur de la couleur d'accent des notes — pages d'APERÇU seulement, jamais en ligne (demande du
 * fondateur du 10 octobre 2026 : « avoir la main » sur la couleur). Il écrit `--hotspot-accent` et le
 * mode (surlignage ou trait) sur <html> ; la couleur retenue deviendra la valeur de la variable dans
 * `globals.css`. Aucune persistance.
 */
type Mode = 'highlight' | 'line';

const CATEGORY_TONE: Record<PilotBike['category'], string> = {
  road: 'var(--tone-lavender)',
  gravel: 'var(--tone-sky)',
  cross_country: 'var(--tone-sage)',
  e_city: 'var(--tone-peach)',
};

const LABELS = {
  'en-sa': {
    title: 'Accent colour (preview only)',
    yellow: 'Yellow',
    black: 'Black',
    category: 'Category tint',
    custom: 'Custom',
    highlight: 'Highlight',
    line: 'Underline',
  },
  'ar-sa': {
    title: 'لون الإبراز (للمعاينة فقط)',
    yellow: 'أصفر',
    black: 'أسود',
    category: 'لون الفئة',
    custom: 'لون آخر',
    highlight: 'إبراز',
    line: 'خط سفلي',
  },
} as const satisfies Record<Locale, Record<string, string>>;

const swatch = 'inline-block size-3 rounded-full border border-neutral-400 align-middle';
const chip =
  'inline-flex min-h-11 items-center gap-1.5 rounded border border-neutral-300 px-2 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-100';

export function AccentPicker({ category, locale }: { category: PilotBike['category']; locale: Locale }) {
  const t = LABELS[locale];
  const [mode, setMode] = useState<Mode>('highlight');
  const [custom, setCustom] = useState('#f6d77c');

  const apply = (color: string, nextMode: Mode) => {
    const root = document.documentElement;
    root.style.setProperty('--hotspot-accent', color);
    root.dataset.hotspotAccentMode = nextMode;
    setMode(nextMode);
  };

  return (
    <div
      data-accent-picker
      dir={locale.startsWith('ar') ? 'rtl' : 'ltr'}
      className="mx-auto flex w-full max-w-[1264px] flex-wrap items-center gap-2 px-6 pt-4 font-mono text-xs"
    >
      <span className="opacity-70">{t.title}</span>
      <button type="button" data-preset="butter" className={chip} onClick={() => apply('var(--tone-butter)', 'highlight')}>
        <span className={swatch} style={{ background: 'var(--tone-butter)' }} />
        {t.yellow}
      </button>
      <button type="button" data-preset="ink" className={chip} onClick={() => apply('var(--tone-ink)', 'line')}>
        <span className={swatch} style={{ background: 'var(--tone-ink)' }} />
        {t.black}
      </button>
      <button type="button" data-preset="category" className={chip} onClick={() => apply(CATEGORY_TONE[category], 'highlight')}>
        <span className={swatch} style={{ background: CATEGORY_TONE[category] }} />
        {t.category}
      </button>
      <label className={chip}>
        <input
          type="color"
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            apply(event.target.value, mode);
          }}
          className="size-5 cursor-pointer border-0 bg-transparent p-0"
        />
        {t.custom}
      </label>
      <fieldset className="inline-flex gap-1">
        {(['highlight', 'line'] as const).map((value) => (
          <label key={value} className={chip}>
            <input
              type="radio"
              name="hotspot-accent-mode"
              checked={mode === value}
              onChange={() => {
                document.documentElement.dataset.hotspotAccentMode = value;
                setMode(value);
              }}
            />
            {value === 'highlight' ? t.highlight : t.line}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
