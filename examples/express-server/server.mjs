import express from 'express';
import { createHandshakeServer } from 'api-handshake/express';

const app = express();
app.use('/api', (req, res, next) => {
  if (req.path === '/__api_handshake') return next();
  res.json({ message: 'Hello from the API' });
});
app.use('/api', createHandshakeServer({
  apiVersion: '1.0.0',
  environment: 'development',
  allowedOrigins: ['http://localhost:5173'],
  credentials: false
}));

app.listen(3000, () => console.log('API listening at http://localhost:3000'));
