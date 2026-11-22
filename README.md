# api-handshake

A small TypeScript diagnostic package for checking frontend-to-backend connectivity. It provides a versioned handshake endpoint, a Fetch-based client, structured checks for reachability, CORS visibility, exact API version equality, and credential configuration, plus an optional Express adapter.

Node.js 20 or newer is required. The core client uses the native Fetch API and has no runtime dependencies. Express is an optional peer dependency.

## Install

```sh
npm install api-handshake
npm install express # only when using the Express adapter
```

## Express server

The endpoint returns only explicitly configured public metadata. It does not return environment variables, headers, cookies, tokens, application configuration, or exception details. CORS is enabled only for exact origins listed in `allowedOrigins`.

```ts
import express from 'express';
import { createHandshakeServer } from 'api-handshake/express';

const app = express();
app.use('/api', createHandshakeServer({
  apiVersion: '1.0.0',
  environment: 'development',
  allowedOrigins: ['http://localhost:5173'],
  credentials: false
}));
app.listen(3000);
```

The middleware serves `GET /__api_handshake` (under the mount path above, `/api/__api_handshake`) and answers `OPTIONS` requests for the endpoint. For preflight requests it advertises only `GET, OPTIONS`, and it includes extra request headers only when configured in `allowedHeaders`. Add the middleware before a catch-all route. It does not configure CORS for other API routes.

## Frontend client

```ts
import { createHandshakeClient } from 'api-handshake';

const handshake = createHandshakeClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  expectedVersion: '1.0.0',
  timeout: 5000
});

const result = await handshake.check();
if (!result.connected) console.table(result.checks);
```

The base URL must be an HTTP(S) URL without credentials, query, or fragment. The client appends `/__api_handshake` to any existing base path. Do not put secrets in the base URL. `credentials` defaults to `omit`; set it to `include` only when the application deliberately uses cross-origin cookies.

### Vite + React example

The complete examples are in [`examples/express-server`](examples/express-server) and [`examples/vite-client`](examples/vite-client). Start the API on port 3000, then run the Vite example on port 5173. Set `VITE_API_BASE_URL=http://localhost:3000/api` to override the default. In a monorepo, install/link this package into each example before starting it.

## Result shape

Each `check()` returns a `HandshakeResult`:

```ts
interface HandshakeResult {
  connected: boolean;
  checks: {
    backend: DiagnosticCheck;
    cors: DiagnosticCheck;
    apiVersion: DiagnosticCheck;
    credentials: DiagnosticCheck;
  };
  duration: number; // milliseconds
  timestamp: string; // ISO 8601
}

interface DiagnosticCheck {
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: Record<string, unknown>;
}
```

`connected` is false if the endpoint is unavailable, malformed, has a version mismatch, or reveals a credential/CORS configuration conflict. If no expected version is configured, version checking is skipped and does not prevent connectivity from being true.

## API reference

### `createHandshakeClient(options)`

- `baseURL: string | URL` — required API origin/base path.
- `expectedVersion?: string` — exact string match; no semantic version interpretation is applied.
- `endpoint?: string` — absolute path for the handshake endpoint (default `/__api_handshake`), useful with a custom Express adapter path.
- `timeout?: number` — positive timeout in milliseconds (default `5000`).
- `credentials?: RequestCredentials` — Fetch credentials mode (default `omit`).
- `origin?: string` — optional origin to inspect in non-browser/SSR use. The client sends it as `Origin` only outside a browser; browsers control that header.
- `fetch?: typeof fetch` — optional Fetch implementation, useful for custom runtimes and tests.
- `verbose?: boolean` — adds the HTTP status and protocol version to the backend check details. No response body fields or request data are included.

Returns an object with `check(): Promise<HandshakeResult>`.

### `createHandshakeServer(options)` from `api-handshake/express`

- `apiVersion: string` — required public API version label.
- `environment?: string` — optional public label; do not put secrets or internal deployment details here.
- `endpoint?: string` — absolute endpoint path, default `/__api_handshake`.
- `allowedOrigins?: readonly string[]` — exact origins allowed to read the endpoint; default empty.
- `credentials?: boolean` — send `Access-Control-Allow-Credentials: true` only for allowed origins; default false.
- `allowedHeaders?: readonly string[]` — additional headers advertised for preflight; default empty.

Other exports include `HANDSHAKE_PATH`, `HANDSHAKE_PROTOCOL_VERSION`, `HANDSHAKE_MEDIA_TYPE`, and the public TypeScript interfaces.

## Diagnostic interpretation and limitations

- A reachable endpoint proves that a response was received; a server-side error message is never copied into the result.
- In a browser, successfully reading the handshake response verifies CORS for this GET request. A failed browser fetch is ambiguous: browser APIs intentionally hide whether the cause was CORS, DNS, TLS, or connection failure.
- In Node/SSR, fetch does not enforce browser CORS. Without an explicit `origin`, the CORS result is a warning even if the HTTP request succeeds. With `origin`, the client inspects the server's response headers, but that still does not reproduce browser enforcement.
- The server implements allowlisted CORS response headers and OPTIONS behavior. This client does not claim to verify preflight for arbitrary future API requests: browser JavaScript cannot set the forbidden `Access-Control-Request-*` headers needed to synthesize a real preflight. A browser's successful handshake GET does not prove that other methods or custom headers will pass preflight.
- Credentials diagnostics verify server declarations, not cookie delivery. SameSite, Secure, cookie domain/path, browser privacy policy, and HTTPS also control cookie delivery.
- Version compatibility is exact string equality. No compatibility range or semver rule is inferred.
- The diagnostic endpoint uses `Cache-Control: no-store`; it does not retain request data.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

Build artifacts are emitted under `dist/` in ESM and CommonJS formats. The `./express` subpath is separately exported so consumers that use only the client do not need Express installed at runtime.

## Before publishing

Replace the repository metadata placeholder in `package.json`, review the release version and license attribution, then inspect the package contents with `npm pack --dry-run`. This project is not published by its build or test scripts.

## Possible 0.2.0 additions

- An optional browser preflight probe for configurable method/header sets, with clear limits on what browser JavaScript can observe.
- Adapter support for additional server frameworks.
- Optional user-supplied diagnostic checks for application-specific public metadata.
- A small command-line interface for CI diagnostics, if there is a concrete workflow need.
