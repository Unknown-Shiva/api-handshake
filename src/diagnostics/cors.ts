import type { DiagnosticCheck } from '../core/types.js';

export function checkCors(headers: Headers, origin: string | undefined, browserFetchSucceeded: boolean, credentialsRequested: boolean): DiagnosticCheck {
  const allowedOrigin = headers.get('access-control-allow-origin');
  const allowCredentials = headers.get('access-control-allow-credentials');
  if (credentialsRequested && allowedOrigin === '*') {
    return { status: 'failed', message: 'CORS wildcard origin cannot be used with credentialed requests.', details: { wildcardOrigin: true, allowCredentials: allowCredentials?.toLowerCase() === 'true' } };
  }
  if (origin) {
    const matches = allowedOrigin === origin || (allowedOrigin === '*' && !credentialsRequested);
    if (!matches) return { status: 'failed', message: 'The server did not allow the configured origin.', details: { originAllowed: false } };
    if (credentialsRequested && allowCredentials?.toLowerCase() !== 'true') {
      return { status: 'failed', message: 'The origin is allowed, but Access-Control-Allow-Credentials is not true.', details: { originAllowed: true, allowCredentials: false } };
    }
    return { status: 'passed', message: 'CORS response headers allow the configured origin.', details: { originAllowed: true, allowCredentials: allowCredentials?.toLowerCase() === 'true' } };
  }
  if (browserFetchSucceeded) {
    return { status: 'passed', message: 'The browser could read the handshake response, confirming CORS for this GET request. Preflight behavior for other requests is not verified.' };
  }
  return { status: 'warning', message: 'CORS could not be verified from this runtime. A successful server-side fetch does not prove browser access.', details: { originHeaderPresent: allowedOrigin !== null } };
}
