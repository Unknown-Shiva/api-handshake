import { describe, expect, it, vi } from 'vitest';
import { createHandshakeClient } from '../src/core/client.js';

const jsonResponse = (body: unknown, headers: Record<string, string> = {}, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const validBody = { protocolVersion: 1, apiVersion: '1.0.0', environment: 'test', credentialsSupported: true };

describe('createHandshakeClient', () => {
  it('reports a successful handshake and avoids claiming Node CORS verification', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody, { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true' }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', expectedVersion: '1.0.0', fetch }).check();
    expect(result.connected).toBe(true);
    expect(result.checks.backend.status).toBe('passed');
    expect(result.checks.cors.status).toBe('warning');
    expect(result.checks.apiVersion.status).toBe('passed');
  });

  it('reports backend unavailable without leaking error text', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('secret-token-at-url'));
    const result = await createHandshakeClient({ baseURL: 'http://127.0.0.1:1', fetch }).check();
    expect(result.checks.backend.status).toBe('failed');
    expect(JSON.stringify(result)).not.toContain('secret-token-at-url');
  });

  it('reports request timeout', async () => {
    const fetch: typeof globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', timeout: 5, fetch }).check();
    expect(result.checks.backend.message).toContain('timed out');
  });

  it('reports invalid JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{', { status: 200 }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', fetch }).check();
    expect(result.checks.backend.message).toContain('invalid JSON');
  });

  it('reports exact API version mismatch', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', expectedVersion: '2.0.0', fetch }).check();
    expect(result.connected).toBe(false);
    expect(result.checks.apiVersion.status).toBe('failed');
  });

  it('reports wildcard plus credentials conflict', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody, { 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', credentials: 'include', fetch }).check();
    expect(result.checks.cors.status).toBe('failed');
    expect(result.checks.credentials.status).toBe('passed');
  });

  it('reports missing CORS headers when an SSR origin was configured', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', origin: 'http://localhost:5173', fetch }).check();
    expect(result.checks.cors.status).toBe('failed');
  });

  it('allows exact origin header', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody, { 'access-control-allow-origin': 'http://localhost:5173' }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', origin: 'http://localhost:5173', fetch }).check();
    expect(result.checks.cors.status).toBe('passed');
  });

  it('reports a disallowed origin', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody, { 'access-control-allow-origin': 'http://allowed.test' }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', origin: 'http://blocked.test', fetch }).check();
    expect(result.checks.cors.status).toBe('failed');
  });

  it('detects credential configuration mismatch', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ ...validBody, credentialsSupported: false }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', credentials: 'include', fetch }).check();
    expect(result.checks.credentials.status).toBe('failed');
  });

  it('rejects malformed metadata and never returns payload secrets', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ ...validBody, apiVersion: 3, token: 'top-secret' }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', fetch }).check();
    expect(result.checks.backend.status).toBe('failed');
    expect(JSON.stringify(result)).not.toContain('top-secret');
  });

  it('does not copy arbitrary server-controlled metadata into diagnostics', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ protocolVersion: 1, apiVersion: 'private-token-value', environment: 'db-password-value', credentialsSupported: false }, { 'access-control-allow-origin': 'private-header-value' }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', expectedVersion: '1.0.0', fetch }).check();
    const output = JSON.stringify(result);
    expect(output).not.toContain('private-token-value');
    expect(output).not.toContain('db-password-value');
    expect(output).not.toContain('private-header-value');
  });

  it('includes only safe protocol and status details in verbose mode', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', verbose: true, fetch }).check();
    expect(result.checks.backend.details).toEqual({ protocolVersion: 1, httpStatus: 200 });
  });

  it('does not reflect a rejected origin in diagnostic details', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(validBody, { 'access-control-allow-origin': 'http://trusted.test' }));
    const result = await createHandshakeClient({ baseURL: 'http://localhost:3000', origin: 'http://untrusted.test', fetch }).check();
    expect(result.checks.cors.status).toBe('failed');
    expect(JSON.stringify(result)).not.toContain('untrusted.test');
  });
});
