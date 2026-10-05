import type { FullConfig } from '@playwright/test';
import { requiredApiBaseUrl, requiredSecret } from './helpers/environment';

export async function resetTestCache(baseURL: string, secret: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(new URL('/api/revalidate', baseURL), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['all'], reason: 'test e2e : initialisation' }),
    });
  } catch {
    throw new Error('Initialisation du cache impossible : verifier le Next teste ; aucune redirection autorisee.');
  }
  if (response.status !== 200) {
    throw new Error(`Initialisation du cache refusee (HTTP ${response.status}). Verifier REVALIDATE_SECRET sur le Next teste.`);
  }
  let result: unknown;
  try { result = await response.json(); } catch { throw new Error('Reponse de revalidation non JSON.'); }
  if (!result || typeof result !== 'object' || !('revalidated' in result) ||
      !Array.isArray(result.revalidated) || result.revalidated.length !== 1 || result.revalidated[0] !== 'all') {
    throw new Error('La revalidation initiale doit confirmer exactement le tag all.');
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  // Verifier toute la configuration avant le premier POST, meme si une spec est filtree.
  requiredApiBaseUrl();
  const secret = requiredSecret();
  if (config.workers !== 1) throw new Error('La revalidation partagee impose workers=1 ; retirer --workers.');
  const targets = new Set(config.projects.map((project) => project.use.baseURL));
  const baseURL = [...targets][0];
  if (targets.size !== 1 || !baseURL) throw new Error('Les projets doivent partager le meme baseURL Next explicite.');
  await resetTestCache(baseURL, secret);
}
