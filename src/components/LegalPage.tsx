import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { latinRuns } from '@/components/hotspots/bidi';
import { JsonLd } from '@/components/JsonLd';
import type { Locale } from '@/lib/api';
import { legalPageJsonLd } from '@/lib/jsonld';
import { GA_COOKIES, GA_OPT_OUT_URL, LEGAL_FACTS, type LegalPageKey } from '@/lib/legal';
import { LEGAL_COPY, type LegalBlock } from '@/lib/legal-copy';
import { seoFor } from '@/lib/seo';

/**
 * Une page légale (web #16) : titre, sections, date de mise à jour — Server Component, aucun JavaScript. Les textes
 * viennent de `LEGAL_COPY`, les faits de `LEGAL_FACTS` ; un fait manquant s'affiche marqué (`data-legal-missing`), jamais
 * remplacé par une valeur devinée. En arabe, chaque suite latine (« Darraja Bikes », « Google Analytics 4 ») passe par
 * `<bdi>` (`latinRuns`, le découpage des notes dessinées) : sans lui, un signe en fin de nom s'affiche du mauvais côté.
 */
const COPY = {
  'ar-sa': { missing: 'يُستكمل', updated: 'آخر تحديث:' },
  'en-sa': { missing: 'to be completed', updated: 'Last updated:' },
} as const satisfies Record<Locale, { missing: string; updated: string }>;

const TOKEN = /\{([a-z]+(?::[a-z0-9-]+)?)\}/g;
const LINK = 'text-accent underline underline-offset-4 hover:text-foreground';

function Missing({ field, locale }: { field: string; locale: Locale }) {
  return (
    <mark data-legal-missing={field} className="rounded-sm bg-tone-butter px-1 text-tone-ink">
      [{COPY[locale].missing}]
    </mark>
  );
}

/** Un fait de `LEGAL_FACTS` : sa valeur, ou la marque « à compléter ». */
function fact(value: string | null | undefined, field: string, locale: Locale): ReactNode {
  return value ? <bdi>{value}</bdi> : <Missing field={field} locale={locale} />;
}

function token(name: string, locale: Locale): ReactNode {
  const [kind, arg] = name.split(':');
  switch (kind) {
    case 'email': {
      const email = LEGAL_FACTS.contactEmail;
      return email ? (
        <bdi>
          <a href={`mailto:${email}`} className={LINK}>
            {email}
          </a>
        </bdi>
      ) : (
        <Missing field="contactEmail" locale={locale} />
      );
    }
    case 'publisher':
      return fact(LEGAL_FACTS.publisher, 'publisher', locale);
    case 'retention':
      return fact(LEGAL_FACTS.logRetention?.[locale], 'logRetention', locale);
    case 'page': {
      const page = arg as LegalPageKey;
      return (
        <Link href={`/${locale}/${page}`} className={LINK}>
          {LEGAL_COPY[page][locale].title}
        </Link>
      );
    }
    case 'cookie':
      return (
        <bdi>
          <code className="font-mono text-[0.9em]">{GA_COOKIES[Number(arg)]}</code>
        </bdi>
      );
    case 'optout':
      return (
        <bdi>
          <a href={GA_OPT_OUT_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
            {GA_OPT_OUT_URL.replace(/^https:\/\//, '')}
          </a>
        </bdi>
      );
  }
  // Un jeton inconnu est une faute de frappe dans `LEGAL_COPY` : la construction échoue plutôt que d'afficher « {…} ».
  throw new Error(`Jeton inconnu dans une page légale : {${name}}`);
}

/** Un texte de `LEGAL_COPY` : jetons remplacés, suites latines isolées en arabe. */
function rich(text: string, locale: Locale): ReactNode[] {
  const nodes: ReactNode[] = [];
  const plain = (part: string) => {
    if (locale !== 'ar-sa') nodes.push(<Fragment key={nodes.length}>{part}</Fragment>);
    else
      for (const run of latinRuns(part))
        nodes.push(run.latin ? <bdi key={nodes.length}>{run.text}</bdi> : <Fragment key={nodes.length}>{run.text}</Fragment>);
  };
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    plain(text.slice(last, match.index));
    nodes.push(<Fragment key={nodes.length}>{token(match[1], locale)}</Fragment>);
    last = (match.index ?? 0) + match[0].length;
  }
  plain(text.slice(last));
  return nodes;
}

function Block({ block, locale }: { block: LegalBlock; locale: Locale }) {
  if ('p' in block) return <p className="wrap-break-word">{rich(block.p, locale)}</p>;

  return (
    <ul className="flex list-disc flex-col gap-1.5 ps-6">
      {block.ul.map((item, i) => (
        <li key={i} className="wrap-break-word">
          {rich(item, locale)}
        </li>
      ))}
    </ul>
  );
}

/** Les métadonnées d'une page légale : canonical, hreflang et titre par le helper SEO, comme toute page. */
export function legalMetadata(locale: Locale, page: LegalPageKey): Metadata {
  const t = LEGAL_COPY[page][locale];

  return seoFor({ locale, path: `/${page}`, title: t.title, description: t.description });
}

export function LegalPage({ locale, page }: { locale: Locale; page: LegalPageKey }) {
  const t = LEGAL_COPY[page][locale];
  const jsonLd = legalPageJsonLd(locale, {
    type: page === 'contact' ? 'ContactPage' : 'WebPage',
    name: t.title,
    description: t.description,
    path: `/${page}`,
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <article className="flex flex-col gap-8 text-base/7" data-legal-page={page}>
        <h1 className="text-3xl font-bold tracking-tight text-balance">{t.title}</h1>
        {t.sections.map((section, i) => (
          <section key={i} className="flex flex-col gap-3">
            {section.title ? <h2 className="text-xl font-semibold">{rich(section.title, locale)}</h2> : null}
            {section.blocks.map((block, j) => (
              <Block key={j} block={block} locale={locale} />
            ))}
          </section>
        ))}
        <p className="text-sm text-muted">
          {COPY[locale].updated} {fact(LEGAL_FACTS.updatedAt?.[locale], 'updatedAt', locale)}
        </p>
      </article>
    </main>
  );
}
