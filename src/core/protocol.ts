import type { HandshakeMetadata } from './types.js';

export const HANDSHAKE_PATH = '/__api_handshake';
export const HANDSHAKE_PROTOCOL_VERSION = 1 as const;
export const HANDSHAKE_MEDIA_TYPE = 'application/vnd.api-handshake+json; version=1';

export function isHandshakeMetadata(value: unknown): value is HandshakeMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.protocolVersion === HANDSHAKE_PROTOCOL_VERSION
    && typeof record.apiVersion === 'string' && record.apiVersion.length > 0
    && typeof record.credentialsSupported === 'boolean'
    && (record.environment === undefined || typeof record.environment === 'string');
}
