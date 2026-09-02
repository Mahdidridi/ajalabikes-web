import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

/**
 * Recepteur du webhook d'invalidation (contrat du 2 septembre 2026, § 2).
 *
 * L'API appelle `POST /api/revalidate` avec `Authorization: Bearer {secret}`
 * et `{ "tags": [...], "reason": "..." }` a la fin d'un import. Chaque tag
 * expire IMMEDIATEMENT les entrees qui le portent — reponses d'API et pages
 * rendues : la requete suivante re-rend, puis le cache reprend. Pas de
 * « stale-while-revalidate » ici : quand l'API dit que la donnee a change,
 * aucun visiteur ne doit plus voir l'ancienne. Le pseudo-tag `all` purge tout
 * le site.
 *
 * Chaque appel ecrit UNE ligne de journal — statut, tags, raison, duree.
 * Sans elle, « pourquoi cette page est perimee » est indebuggable.
 */
const ALL = 'all';

export async function POST(request: NextRequest) {
  const debut = Date.now();
  const journal = (status: number, tags: string[], reason: string | null, error?: string) => {
    const ligne = { status, tags, reason, ms: Date.now() - debut, ...(error ? { error } : {}) };
    console.info('[revalidate]', JSON.stringify(ligne));
  };

  if (!autorise(request.headers.get('authorization'))) {
    journal(401, [], null, 'unauthorized');

    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const corps = await lireCorps(request);
  const tags = lireTags(corps);
  const reason = typeof corps.reason === 'string' ? corps.reason : null;

  if (!tags) {
    journal(422, [], reason, 'tags required');

    return Response.json({ error: 'tags required' }, { status: 422 });
  }

  for (const tag of tags) {
    if (tag === ALL) revalidatePath('/', 'layout');
    else revalidateTag(tag, { expire: 0 });
  }

  journal(200, tags, reason);

  return Response.json({ revalidated: tags, reason, at: new Date().toISOString() });
}

/**
 * Comparaison en temps constant. Les deux valeurs passent par SHA-256 :
 * `timingSafeEqual` exige deux tampons de meme longueur, et la longueur du
 * secret n'a rien a reveler. Un secret non configure refuse tout.
 */
function autorise(authorization: string | null): boolean {
  const attendu = process.env.REVALIDATE_SECRET;
  if (!attendu || !authorization?.startsWith('Bearer ')) return false;

  const empreinte = (valeur: string) => createHash('sha256').update(valeur).digest();

  return timingSafeEqual(empreinte(authorization.slice('Bearer '.length)), empreinte(attendu));
}

type Corps = { tags?: unknown; reason?: unknown };

/** Un corps illisible, ou qui n'est pas un objet, vaut un corps vide. */
async function lireCorps(request: NextRequest): Promise<Corps> {
  const json: unknown = await request.json().catch(() => null);

  return json !== null && typeof json === 'object' && !Array.isArray(json) ? (json as Corps) : {};
}

/** Les tags, ou `null` s'ils manquent, sont vides ou ne sont pas des chaines. */
function lireTags({ tags }: Corps): string[] | null {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  if (!tags.every((tag): tag is string => typeof tag === 'string' && tag.length > 0)) return null;

  return tags;
}
