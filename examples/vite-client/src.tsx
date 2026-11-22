import React from 'react';
import { createRoot } from 'react-dom/client';
import { createHandshakeClient } from 'api-handshake';

function App() {
  const [result, setResult] = React.useState<unknown>(null);
  const run = async () => {
    const client = createHandshakeClient({
      baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
      expectedVersion: '1.0.0',
      timeout: 5000
    });
    setResult(await client.check());
  };
  return <main><h1>API connectivity diagnostic</h1><button onClick={run}>Check API</button><pre>{JSON.stringify(result, null, 2)}</pre></main>;
}

createRoot(document.getElementById('root')!).render(<App />);
