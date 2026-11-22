import express from 'express';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createHandshakeServer } from '../src/adapters/express.js';
import { createHandshakeClient } from '../src/core/client.js';

let server: Server | undefined;
async function start(handler: express.RequestHandler) {
  const app = express(); app.use(handler);
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => { if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); server = undefined; });

describe('Express adapter', () => {
  it('returns documented public metadata and permits only exact allowlisted origins', async () => {
    const base = await start(createHandshakeServer({ apiVersion: '1.2.3', environment: 'test', allowedOrigins: ['http://allowed.test'] }));
    const response = await fetch(`${base}/__api_handshake`, { headers: { Origin: 'http://allowed.test' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://allowed.test');
    expect(await response.json()).toEqual({ protocolVersion: 1, apiVersion: '1.2.3', environment: 'test', credentialsSupported: false });
    const denied = await fetch(`${base}/__api_handshake`, { headers: { Origin: 'http://evil.test' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers preflight for allowlisted origins and supports an end-to-end local client', async () => {
    const base = await start(createHandshakeServer({ apiVersion: '1.0.0', allowedOrigins: ['http://localhost:5173'], credentials: true, allowedHeaders: ['content-type'] }));
    const preflight = await fetch(`${base}/__api_handshake`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-credentials')).toBe('true');
    const result = await createHandshakeClient({ baseURL: base, expectedVersion: '1.0.0' }).check();
    expect(result.connected).toBe(true);
  });
});
