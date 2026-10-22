import type { Build } from '@/lib/api';

/**
 * Les deux adresses d'un vélo (web #15 ; décision du 5 septembre 2026, `../CLAUDE.md`, « Conventions → Routes ») :
 *
 * - l'adresse MODÈLE `/bikes/{marque}/{slug}` montre toujours le millésime le plus récent ; canonical propre ;
 * - l'adresse MILLÉSIME `/bikes/{marque}/{slug}-{année}` est permanente et rend l'édition de CETTE année ; canonical
 *   vers l'adresse modèle tant qu'elle est l'année en cours, propre ensuite. Aucune redirection, jamais.
 *
 * Un slug qui finit par `-20xx` est toujours une adresse millésime : l'import de l'API refuse qu'un nom de modèle
 * finisse ainsi (`BuildImporter`), et l'API essaie cette lecture en premier (`BuildController::resolveEdition`).
 * La même expression est recopiée ici, sans rien calculer d'autre : l'édition servie, son année et son statut
 * (`year`, `is_current`, `model_path`) viennent de l'API.
 */
const EDITION_SLUG = /^(.+)-20\d{2}$/;

/**
 * Les tags de cache d'une lecture de fiche. L'API invalide une fiche par `build:{marque}:{slug du modèle}` — le même
 * pour toutes ses éditions (`CatalogChanged::buildTag`, `canonical_slug`). Une adresse millésime porte donc AUSSI le
 * tag de son modèle : sans lui, l'import d'une édition laissait la page millésime en cache jusqu'au filet de 24 h.
 * Le tag du slug demandé reste, pour une purge qui le viserait tel quel.
 */
export function buildCacheTags(brand: string, slug: string): string[] {
  const base = EDITION_SLUG.exec(slug)?.[1];
  const tags = [`build:${brand}:${slug}`];

  return base ? [...tags, `build:${brand}:${base}`] : tags;
}

type AddressBuild = Pick<Build, 'slug' | 'year' | 'is_current' | 'model_path'> & {
  brand: Pick<Build['brand'], 'slug'>;
};

/**
 * L'adresse canonique de l'édition COURANTE d'un vélo — celle qu'une carte du catalogue représente : l'adresse modèle,
 * sauf pour un vélo nommé comme sa famille (`model_path` nul, 3 au 14 octobre) dont l'adresse modèle appartient à la
 * famille — alors son adresse millésime, quand l'année est connue. Le sitemap et `resolveBuildAddress` la partagent.
 */
export function currentBuildPath(build: Pick<Build, 'slug' | 'year' | 'model_path'> & {
  brand: Pick<Build['brand'], 'slug'>;
}): string {
  const model = `/bikes/${build.brand.slug}/${build.slug}`;

  return build.model_path === null && build.year !== null ? `${model}-${build.year}` : model;
}

/** Chemins sous la locale (convention de `absoluteUrl`) : `/bikes/trek/fuel-ex-5-gen-7-2026`. */
export type BuildAddress =
  | { kind: 'render'; path: string; canonicalPath: string }
  | { kind: 'redirect'; path: string };

/**
 * Ce que la fiche fait de l'adresse demandée, une fois la réponse de l'API connue.
 *
 * - Adresse modèle de l'édition servie : rendue, canonical propre (inchangé).
 * - Adresse millésime de l'édition servie : rendue ; canonical vers l'adresse modèle si l'édition est courante et que
 *   l'adresse modèle lui appartient (`model_path` non nul), sinon propre. Un vélo nommé comme sa famille n'a que son
 *   adresse millésime (décision du 5 septembre) : elle reste canonique même l'année en cours.
 * - Toute autre adresse (ancien slug que l'API résout par `slug_redirects`, fusion, autre marque) : redirection
 *   permanente vers l'adresse qui montre CETTE édition — l'adresse modèle si elle est courante, la sienne sinon.
 */
export function resolveBuildAddress(requested: { brand: string; slug: string }, build: AddressBuild): BuildAddress {
  const model = `/bikes/${build.brand.slug}/${build.slug}`;
  const edition = build.year === null ? null : `${model}-${build.year}`;
  const own = build.is_current ? currentBuildPath(build) : (edition ?? model);
  const asked = `/bikes/${requested.brand}/${requested.slug}`;

  if (asked === model) return { kind: 'render', path: model, canonicalPath: model };
  if (asked === edition) return { kind: 'render', path: edition, canonicalPath: own };

  return { kind: 'redirect', path: own };
}
