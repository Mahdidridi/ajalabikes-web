import { once } from 'node:events';
import { createServer, type RequestListener } from 'node:http';
import { expect, test, type FullConfig } from '@playwright/test';
import globalSetup, { resetTestCache } from './global-setup';

async function withEndpoint(handler: RequestListener, check: (url: string) => Promise<void>) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Port de test absent');
  try {
    await check(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('le setup purge une seule fois le Next cible avant les attentes vivantes', async () => {
  const calls: { method?: string; path?: string; authorization?: string; body: unknown }[] = [];
  await withEndpoint(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    calls.push({ method: request.method, path: request.url, authorization: request.headers.authorization, body: JSON.parse(body) });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ revalidated: ['all'] }));
  }, async (url) => {
    await resetTestCache(url, 'secret-fictif');
    expect(calls).toEqual([{
      method: 'POST', path: '/api/revalidate', authorization: 'Bearer secret-fictif',
      body: { tags: ['all'], reason: 'test e2e : initialisation' },
    }]);
  });
});

for (const status of [401, 500, 308]) {
  test(`le setup refuse HTTP ${status} sans suivre Location ni exposer le secret`, async () => {
    let calls = 0;
    await withEndpoint((request, response) => {
      calls++;
      response.writeHead(status, { Location: '/autre' }).end(request.headers.authorization);
    }, async (url) => {
      const error = await resetTestCache(url, 'SECRET_SENTINEL').catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain('SECRET_SENTINEL');
      expect(String(error)).not.toContain('Authorization');
      expect(error).not.toHaveProperty('cause');
      expect(calls).toBe(1);
    });
  });
}

test('le setup exige la confirmation du tag all, sans publier le corps recu', async () => {
  await withEndpoint((_request, response) => {
    response.end(JSON.stringify({ revalidated: ['catalog'], debug: 'SECRET_SENTINEL' }));
  }, async (url) => {
    await expect(resetTestCache(url, 'SECRET_SENTINEL')).rejects.toThrow('exactement le tag all');
  });
});

test('le setup masque une panne transport authentifiee', async () => {
  await withEndpoint((request) => request.socket.destroy(), async (url) => {
    const error = await resetTestCache(url, 'SECRET_SENTINEL').catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain('Initialisation du cache impossible');
    expect(String(error)).not.toContain('SECRET_SENTINEL');
    expect(error).not.toHaveProperty('cause');
  });
});

test('la configuration est validee avant tout POST, y compris workers et les projets', async () => {
  const previousApi = process.env.API_BASE_URL;
  const previousSecret = process.env.REVALIDATE_SECRET;
  let calls = 0;
  try {
    await withEndpoint((request, response) => {
      calls++;
      expect(request.headers.authorization).toBe('Bearer secret-fictif');
      response.end(JSON.stringify({ revalidated: ['all'] }));
    }, async (url) => {
      const config = (workers = 1, secondURL = url) => ({
        workers, projects: [{ use: { baseURL: url } }, { use: { baseURL: secondURL } }],
      }) as FullConfig;
      delete process.env.API_BASE_URL;
      process.env.REVALIDATE_SECRET = 'secret-fictif';
      await expect(globalSetup(config())).rejects.toThrow('API_BASE_URL est requis');
      process.env.API_BASE_URL = 'https://api.example.test/api';
      delete process.env.REVALIDATE_SECRET;
      await expect(globalSetup(config())).rejects.toThrow('REVALIDATE_SECRET est requis');
      process.env.REVALIDATE_SECRET = '  secret-fictif\r\n';
      await expect(globalSetup(config(2))).rejects.toThrow('workers=1');
      await expect(globalSetup(config(1, `${url}/different`))).rejects.toThrow('meme baseURL');
      expect(calls).toBe(0);
      await globalSetup(config());
      expect(calls).toBe(1);
    });
  } finally {
    if (previousApi === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = previousApi;
    if (previousSecret === undefined) delete process.env.REVALIDATE_SECRET;
    else process.env.REVALIDATE_SECRET = previousSecret;
  }
});
