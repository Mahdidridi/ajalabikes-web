export function requiredApiBaseUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const value = env.API_BASE_URL?.trim();
  if (!value) {
    throw new Error('API_BASE_URL est requis : export API_BASE_URL="<URL API du Next teste>" ' +
      '(PowerShell : $env:API_BASE_URL = "<URL API du Next teste>").');
  }
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('API_BASE_URL doit etre une URL HTTP(S) absolue.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API_BASE_URL doit etre une URL HTTP(S) sans identifiants, query ni fragment.');
  }
  return value.replace(/\/+$/, '');
}

export function requiredSecret(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const secret = env.REVALIDATE_SECRET;
  if (!secret?.trim()) {
    throw new Error(
      'REVALIDATE_SECRET est requis pour les tests de revalidation. ' +
      'Exporter le secret du serveur teste : export REVALIDATE_SECRET="<secret du serveur teste>" ' +
      '(PowerShell : $env:REVALIDATE_SECRET = "<secret du serveur teste>").',
    );
  }
  return secret.trim();
}
