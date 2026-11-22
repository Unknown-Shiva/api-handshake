import { checkCors } from '../diagnostics/cors.js';
import { checkCredentials } from '../diagnostics/credentials.js';
import { checkVersion } from '../diagnostics/version.js';
import { safeErrorCode, skipped } from '../utils/errors.js';
import { HANDSHAKE_PATH, isHandshakeMetadata } from './protocol.js';
import type { DiagnosticCheck, HandshakeClientOptions, HandshakeResult } from './types.js';

function makeURL(base: string | URL, endpoint: string): URL {
  const url = new URL(base);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new TypeError('baseURL must use http or https.');
  if (url.username || url.password) throw new TypeError('baseURL must not contain credentials.');
  if (url.search || url.hash) throw new TypeError('baseURL must not contain a query or fragment.');
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  return url;
}

function initialChecks(): HandshakeResult['checks'] {
  return { backend: skipped('Handshake has not completed.'), cors: skipped('Handshake has not completed.'), apiVersion: skipped('Handshake has not completed.'), credentials: skipped('Handshake has not completed.') };
}

export function createHandshakeClient(options: HandshakeClientOptions) {
  const timeout = options.timeout ?? 5000;
  if (!Number.isFinite(timeout) || timeout <= 0) throw new TypeError('timeout must be a positive number of milliseconds.');
  const endpoint = options.endpoint ?? HANDSHAKE_PATH;
  if (!endpoint.startsWith('/') || endpoint.includes('?') || endpoint.includes('#')) throw new TypeError('endpoint must be an absolute path without query or fragment.');
  const url = makeURL(options.baseURL, endpoint);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch API implementation is required.');
  const credentials = options.credentials ?? 'omit';

  return {
    async check(): Promise<HandshakeResult> {
      const started = Date.now();
      const result: HandshakeResult = { connected: false, checks: initialChecks(), duration: 0, timestamp: new Date().toISOString() };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const headers = new Headers({ accept: 'application/vnd.api-handshake+json; version=1' });
        if (options.origin && typeof window === 'undefined') headers.set('origin', options.origin);
        const response = await fetchImpl(url, { method: 'GET', headers, credentials, signal: controller.signal, redirect: 'error' });
        if (!response.ok) {
          result.checks.backend = { status: 'failed', message: 'The handshake endpoint returned an unsuccessful HTTP status.', details: { httpStatus: response.status } };
          result.checks.cors = checkCors(response.headers, options.origin, false, credentials === 'include');
          result.checks.apiVersion = skipped('Version could not be checked because the endpoint returned an HTTP error.');
          result.checks.credentials = skipped('Credentials could not be checked because the endpoint returned an HTTP error.');
          return result;
        }
        let payload: unknown;
        try { payload = await response.json(); } catch {
          result.checks.backend = { status: 'failed', message: 'The handshake endpoint returned invalid JSON.' };
          result.checks.cors = checkCors(response.headers, options.origin, false, credentials === 'include');
          result.checks.apiVersion = skipped('Version could not be checked because the response was malformed.');
          result.checks.credentials = skipped('Credentials could not be checked because the response was malformed.');
          return result;
        }
        if (!isHandshakeMetadata(payload)) {
          result.checks.backend = { status: 'failed', message: 'The handshake endpoint returned an unsupported or malformed response.' };
          result.checks.cors = checkCors(response.headers, options.origin, false, credentials === 'include');
          result.checks.apiVersion = skipped('Version could not be checked because the response was malformed.');
          result.checks.credentials = skipped('Credentials could not be checked because the response was malformed.');
          return result;
        }
        result.checks.backend = {
          status: 'passed',
          message: 'The backend handshake endpoint is reachable.',
          ...(options.verbose ? { details: { protocolVersion: payload.protocolVersion, httpStatus: response.status } } : {})
        };
        result.checks.cors = checkCors(response.headers, options.origin, typeof window !== 'undefined', credentials === 'include');
        result.checks.apiVersion = checkVersion(payload.apiVersion, options.expectedVersion);
        result.checks.credentials = checkCredentials(credentials, response.headers.get('access-control-allow-credentials'), payload.credentialsSupported);
        result.connected = result.checks.backend.status === 'passed' && result.checks.apiVersion.status !== 'failed' && result.checks.cors.status !== 'failed' && result.checks.credentials.status !== 'failed';
        return result;
      } catch (error) {
        const code = safeErrorCode(error);
        result.checks.backend = { status: 'failed', message: code === 'TIMEOUT' ? `Handshake timed out after ${timeout} ms.` : 'Could not reach the handshake endpoint.', details: { code } };
        result.checks.cors = { status: 'warning', message: 'CORS could not be verified because the request failed. Browser fetch errors do not reveal the precise cause.', details: { code } };
        result.checks.apiVersion = skipped('Version could not be checked because the server did not return a valid response.');
        result.checks.credentials = skipped('Credentials could not be checked because the server did not return a valid response.');
        return result;
      } finally {
        clearTimeout(timer);
        result.duration = Date.now() - started;
        result.timestamp = new Date().toISOString();
      }
    }
  };
}
