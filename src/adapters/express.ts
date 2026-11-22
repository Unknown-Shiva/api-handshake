import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { HANDSHAKE_PATH } from '../core/protocol.js';
import { createHandshakeMetadata, handshakeResponseHeaders } from '../core/server.js';
import type { HandshakeServerOptions } from '../core/types.js';

export function createHandshakeServer(options: HandshakeServerOptions): RequestHandler {
  if (!options.apiVersion || typeof options.apiVersion !== 'string') throw new TypeError('apiVersion is required.');
  const endpoint = options.endpoint ?? HANDSHAKE_PATH;
  if (!endpoint.startsWith('/') || endpoint.includes('?') || endpoint.includes('#')) throw new TypeError('endpoint must be an absolute path without query or fragment.');
  const allowlist = new Set(options.allowedOrigins ?? []);
  const credentials = options.credentials ?? false;
  const metadata = createHandshakeMetadata(options);
  const allowedHeaders = options.allowedHeaders ?? [];

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== endpoint) return next();
    const origin = req.get('Origin');
    const originAllowed = origin !== undefined && allowlist.has(origin);
    res.vary('Origin');
    if (originAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin!);
      if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      if (originAllowed) {
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        if (allowedHeaders.length > 0) res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        res.setHeader('Access-Control-Max-Age', '600');
      }
      res.status(204).end();
      return;
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      res.status(405).end();
      return;
    }
    res.set(handshakeResponseHeaders()).status(200).json(metadata);
  };
}
