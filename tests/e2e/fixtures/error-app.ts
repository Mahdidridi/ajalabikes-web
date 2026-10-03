import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import { test as base } from '@playwright/test';
import type { CatalogPage } from '../../../src/lib/api';

const EMPTY_CATALOG: CatalogPage = {
  data: [],
  meta: { total: 0, per_page: 24, next_cursor: null, has_more: false },
  facets: { brands: [], categories: [], wheel_sizes: [], price: null },
};

async function listen(server: Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return address.port;
}

async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
}

type ErrorApp = {
  url: string;
  fail: (value: boolean) => void;
};

// Only the upstream HTTP service is simulated. Next routing, SSR and hydration are real.
export const test = base.extend<object, { errorApp: ErrorApp }>({
  errorApp: [async ({}, provide) => {
    let failing = false;
    const api = createServer((request, response) => {
      response.setHeader('Content-Type', 'application/json');
      if (failing) {
        response.writeHead(503).end(JSON.stringify({ message: 'PRIVATE_UPSTREAM_DETAIL' }));
      } else if (new URL(request.url!, 'http://localhost').pathname.endsWith('/builds')) {
        response.end(JSON.stringify(EMPTY_CATALOG));
      } else {
        response.writeHead(404).end(JSON.stringify({ message: 'Not found' }));
      }
    });
    const apiPort = await listen(api);
    const reservation = createServer();
    const webPort = await listen(reservation);
    await close(reservation);
    const url = `http://127.0.0.1:${webPort}`;
    const child = spawn(process.execPath, [
      resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(webPort),
    ], {
      cwd: process.cwd(),
      env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${apiPort}/api`, NEXT_TELEMETRY_DISABLED: '1' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (data) => { output += String(data); });
    child.stderr.on('data', (data) => { output += String(data); });
    const exited = once(child, 'exit');
    try {
      const deadline = Date.now() + 30_000;
      while (true) {
        if (child.exitCode !== null) throw new Error(output);
        try {
          await fetch(`${url}/robots.txt`, { signal: AbortSignal.timeout(1000) });
          break;
        } catch {
          if (Date.now() > deadline) throw new Error(`Next did not start: ${output}`);
          await new Promise((done) => setTimeout(done, 100));
        }
      }
      await provide({ url, fail: (value) => { failing = value; } });
    } finally {
      // This fixture owns exactly this child, never another developer's server.
      if (child.exitCode === null) child.kill();
      await exited;
      await close(api);
    }
  }, { scope: 'worker' }],
  baseURL: async ({ errorApp }, provide) => { await provide(errorApp.url); },
});

export { expect } from '@playwright/test';
