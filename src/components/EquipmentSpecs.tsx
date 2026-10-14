/** @jsxImportSource react */
import type { EquipmentSpecs as Spec, Locale } from '@/lib/api';

/**
 * Libellés d'interface seulement. Couverture, date, libellés des valeurs, statuts, conditions et preuves arrivent déjà
 * rédigés par Laravel dans la langue de la page. Arabe validé tel quel par le fondateur le 14 octobre 2026 (web #36).
 */
const COPY = {
  'ar-sa': {
    title: 'التجهيزات',
    checked: 'تاريخ التحقق: {date}',
    source: 'صفحة الشركة المصنّعة',
    shared: 'القيم المنشورة لـ: {conditions}',
    sourceText: 'نص المصدر',
    open: '«',
    close: '»',
  },
  'en-sa': {
    title: 'Equipment',
    checked: 'Checked: {date}',
    source: 'Manufacturer page',
    shared: 'Values published for: {conditions}',
    sourceText: 'Source text',
    open: '“',
    close: '”',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/**
 * La seule règle d'affichage : le bloc ET son ancre dans la barre de la fiche n'existent que pour une publication
 * `current` qui porte au moins une valeur. `stale`, `unavailable` ou aucune valeur : ni titre, ni ancre.
 */
export function hasEquipment(data: Spec | null | undefined): data is Spec {
  return !!data && data.state === 'current' && data.items.length > 0;
}

/** Le titre du bloc, repris par la barre d'ancres de la fiche : un seul libellé pour les deux. */
export function equipmentTitle(locale: Locale): string {
  return COPY[locale].title;
}

/**
 * Les équipements publiés par le constructeur (web #36) : chaque valeur avec sa preuve, telle que l'API la sert.
 *
 * SERVER COMPONENT, ZÉRO JAVASCRIPT : les preuves se replient dans des `<details>` natifs. RIEN N'EST CALCULÉ ICI : ni
 * conversion, ni arrondi, ni choix entre deux candidats (une valeur ambiguë ou en conflit garde les candidats servis, avec
 * son badge). Seul le filet entre deux rôles est décidé ici — pure mise en page, la donnée arrive groupée par rôle.
 *
 * L'UNITÉ D'ORIGINE SUIT L'EXTRAIT (décision du 14 octobre 2026) : le poids Canyon a pour preuve « 15.74 » en livres ;
 * sans l'unité, « 7.14 kg » à côté de « 15.74 » passerait pour une erreur. La valeur brute reste visible à côté de la
 * valeur normalisée (règle des unités du projet).
 *
 * `excerpt` est du texte brut (« < », « & » possibles) : React l'échappe ; jamais `dangerouslySetInnerHTML`.
 */
export function EquipmentSpecs({ data, locale }: { data: Spec; locale: Locale }) {
  if (!hasEquipment(data)) return null;

  const t = COPY[locale];

  return (
    <section id="equipment" className="flex flex-col gap-4 scroll-mt-16">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60">{t.title}</h2>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted">
        {data.coverage && <span>{data.coverage.label}</span>}
        {data.checked_at_formatted && <span>{t.checked.replace('{date}', data.checked_at_formatted)}</span>}
        {data.source_url && (
          <a
            href={data.source_url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="rounded-sm underline underline-offset-4 transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.source}
          </a>
        )}
      </div>

      {/* Une condition commune à toutes les valeurs (Canyon : « taille M ») : une fois, ici, jamais par ligne. */}
      {data.shared_conditions_formatted && (
        <p data-equipment-shared className="text-sm">
          {t.shared.replace('{conditions}', data.shared_conditions_formatted)}
        </p>
      )}

      <dl className="grid gap-x-8 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
        {data.items.map((item, i) => {
          const newRole = i > 0 && item.role !== data.items[i - 1].role;
          const flagged = item.status === 'ambiguous' || item.status === 'conflict';

          return (
            <div
              key={`${item.property}-${i}`}
              data-equipment-row
              {...(newRole && { 'data-new-role': '' })}
              className={`col-span-full grid gap-y-1 py-2 sm:grid-cols-subgrid ${newRole ? 'border-t border-border' : ''}`}
            >
              <dt className="text-sm font-semibold">{item.label}</dt>
              <dd className="flex min-w-0 flex-col gap-1 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <bdi className="wrap-break-word">{item.value_formatted}</bdi>
                  {item.precision_label && <span className="text-muted">· {item.precision_label}</span>}
                  {flagged && (
                    <span
                      data-equipment-status
                      className="rounded-sm border border-amber-700/40 px-1.5 text-xs text-amber-800 dark:border-amber-500/40 dark:text-amber-500"
                    >
                      {item.status_label}
                    </span>
                  )}
                </span>
                {item.conditions_formatted && (
                  <span data-equipment-conditions className="text-xs text-muted">
                    {item.conditions_formatted}
                  </span>
                )}
                <details className="text-xs text-muted">
                  <summary className="w-fit cursor-pointer transition hover:text-foreground">{t.sourceText}</summary>
                  <ul className="mt-1 flex flex-col gap-1">
                    {item.evidence.map((ev, j) => (
                      <li key={j} data-equipment-evidence className="wrap-break-word">
                        {t.open}
                        <bdi>{ev.excerpt}</bdi>
                        {t.close}
                        {ev.unit_original && <> {ev.unit_original}</>}
                        {ev.category_original && (
                          <>
                            {' — '}
                            <bdi>{ev.category_original}</bdi>
                          </>
                        )}
                        {ev.observed_at_formatted && <> · {ev.observed_at_formatted}</>}
                      </li>
                    ))}
                  </ul>
                </details>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
