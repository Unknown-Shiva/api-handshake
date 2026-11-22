import { HANDSHAKE_MEDIA_TYPE, HANDSHAKE_PROTOCOL_VERSION } from './protocol.js';
import type { HandshakeMetadata, HandshakeServerOptions } from './types.js';

export function createHandshakeMetadata(options: HandshakeServerOptions): HandshakeMetadata {
  const metadata: HandshakeMetadata = {
    protocolVersion: HANDSHAKE_PROTOCOL_VERSION,
    apiVersion: options.apiVersion,
    credentialsSupported: options.credentials ?? false,
    ...(options.environment === undefined ? {} : { environment: options.environment })
  };
  return metadata;
}

export function handshakeResponseHeaders(): Record<string, string> {
  return { 'content-type': HANDSHAKE_MEDIA_TYPE, 'cache-control': 'no-store' };
}
