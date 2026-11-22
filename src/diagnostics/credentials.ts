import type { DiagnosticCheck, CredentialsMode } from '../core/types.js';

export function checkCredentials(mode: CredentialsMode, allowCredentials: string | null, supported: boolean): DiagnosticCheck {
  const requested = mode === 'include';
  if (!requested) return { status: 'passed', message: 'Credentialed requests are disabled for this handshake.', details: { mode } };
  if (allowCredentials?.toLowerCase() !== 'true' || !supported) {
    return { status: 'failed', message: 'The client requests credentials, but the server does not allow credentialed access.', details: { mode, allowCredentials: allowCredentials?.toLowerCase() === 'true' } };
  }
  return { status: 'passed', message: 'The server permits credentialed requests. Browser cookie policy still applies.', details: { mode, allowCredentials: true, cookieDelivery: 'also depends on SameSite, Secure, domain, and browser policy' } };
}
