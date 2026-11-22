export type CheckStatus = 'passed' | 'failed' | 'warning' | 'skipped';

export interface DiagnosticCheck {
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface HandshakeResult {
  connected: boolean;
  checks: {
    backend: DiagnosticCheck;
    cors: DiagnosticCheck;
    apiVersion: DiagnosticCheck;
    credentials: DiagnosticCheck;
  };
  duration: number;
  timestamp: string;
}

export interface HandshakeMetadata {
  protocolVersion: 1;
  apiVersion: string;
  environment?: string;
  credentialsSupported: boolean;
}

export type CredentialsMode = RequestCredentials;

export interface HandshakeClientOptions {
  baseURL: string | URL;
  expectedVersion?: string;
  endpoint?: string;
  timeout?: number;
  credentials?: CredentialsMode;
  /** Origin to inspect when running outside a browser (for example in SSR). */
  origin?: string;
  /** Include safe response status metadata in the backend check. */
  verbose?: boolean;
  fetch?: typeof fetch;
}

export interface HandshakeServerOptions {
  apiVersion: string;
  environment?: string;
  endpoint?: string;
  allowedOrigins?: readonly string[];
  credentials?: boolean;
  /** Additional headers allowed by browser preflight checks. */
  allowedHeaders?: readonly string[];
  /** Public metadata fields are intentionally limited to these values. */
}
